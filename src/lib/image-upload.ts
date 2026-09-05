export const AVATAR_MAX_BYTES = 5 * 1024 * 1024

/** Long side after downscale. Keeps avatars light and kills metadata. */
export const AVATAR_MAX_SIDE = 1024

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47]
const JPEG_MAGIC = [0xff, 0xd8, 0xff]

export interface SanitizedAvatar {
  blob: Blob
  previewUrl: string
  ext: 'png' | 'jpg'
  width: number
  height: number
}

function fail(msg: string): never {
  throw new Error(msg)
}

function hasMagic(bytes: Uint8Array, magic: number[]): boolean {
  return magic.every((b, i) => bytes[i] === b)
}

function decode(file: Blob): Promise<{ bmp: ImageBitmap; width: number; height: number }> {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file).then((bmp) => {
      if (bmp.width < 1 || bmp.height < 1) fail('Картинка пустая.')
      return { bmp, width: bmp.width, height: bmp.height }
    })
  }
  // Fallback for older browsers: decode through an <img>.
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth < 1 || img.naturalHeight < 1) {
        URL.revokeObjectURL(url)
        reject(new Error('Картинка пустая.'))
        return
      }
      createImageBitmap(img)
        .then((bmp) => {
          URL.revokeObjectURL(url)
          resolve({ bmp, width: bmp.width, height: bmp.height })
        })
        .catch(() => {
          URL.revokeObjectURL(url)
          reject(new Error('Файл не открывается как картинка.'))
        })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Файл не открывается как картинка.'))
    }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b && b.size > 0 ? resolve(b) : reject(new Error('Не получилось обработать картинку.'))),
      mime,
      0.92,
    )
  })
}

/**
 * Proves the file is a real decodable PNG/JPEG (not a renamed script)
 * and re-encodes it through canvas: fresh pixels, no EXIF, bounded size.
 */
export async function sanitizeAvatarImage(file: File): Promise<SanitizedAvatar> {
  if (file.size > AVATAR_MAX_BYTES) fail('Картинка больше 5 МБ.')
  if (file.size === 0) fail('Пустой файл.')

  const lowerName = file.name.toLowerCase()
  const looksPng =
    file.type === 'image/png' || lowerName.endsWith('.png')
  const looksJpeg =
    file.type === 'image/jpeg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')

  if (!looksPng && !looksJpeg) fail('Нужен PNG или JPG.')

  let head: Uint8Array
  try {
    head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  } catch {
    fail('Не получилось прочитать файл.')
  }

  const isPng = hasMagic(head!, PNG_MAGIC)
  const isJpeg = hasMagic(head!, JPEG_MAGIC)

  if (!isPng && !isJpeg) fail('Это не картинка, а переименованный файл.')

  let decoded: { bmp: ImageBitmap; width: number; height: number }
  try {
    decoded = await decode(file)
  } catch (e) {
    fail(e instanceof Error ? e.message : 'Файл не открывается как картинка.')
  }

  const { bmp, width, height } = decoded!
  const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) fail('Браузер не смог обработать картинку.')
  ctx!.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  // Sanity: the canvas must contain non-trivial pixels.
  try {
    const sample = ctx!.getImageData(0, 0, Math.min(w, 8), Math.min(h, 8)).data
    if (sample.every((v) => v === 0)) fail('Картинка пустая.')
  } catch {
    fail('Браузер не смог обработать картинку.')
  }

  const mime = isPng ? 'image/png' : 'image/jpeg'
  const blob = await toBlob(canvas, mime)

  if (blob.size > AVATAR_MAX_BYTES) fail('Картинка больше 5 МБ даже после сжатия.')

  return { blob, previewUrl: URL.createObjectURL(blob), ext: isPng ? 'png' : 'jpg', width: w, height: h }
}
