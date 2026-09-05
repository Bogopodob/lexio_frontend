import { getUiLang, translate } from '@/lib/i18n'

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
      if (bmp.width < 1 || bmp.height < 1) fail(translate(getUiLang(), 'lib.upload.empty_image'))
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
        reject(new Error(translate(getUiLang(), 'lib.upload.empty_image')))
        return
      }
      createImageBitmap(img)
        .then((bmp) => {
          URL.revokeObjectURL(url)
          resolve({ bmp, width: bmp.width, height: bmp.height })
        })
        .catch(() => {
          URL.revokeObjectURL(url)
          reject(new Error(translate(getUiLang(), 'lib.upload.not_image')))
        })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(translate(getUiLang(), 'lib.upload.not_image')))
    }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, mime: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b && b.size > 0 ? resolve(b) : reject(new Error(translate(getUiLang(), 'lib.upload.process_failed')))),
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
  if (file.size > AVATAR_MAX_BYTES) fail(translate(getUiLang(), 'lib.upload.too_large'))
  if (file.size === 0) fail(translate(getUiLang(), 'lib.upload.empty_file'))

  const lowerName = file.name.toLowerCase()
  const looksPng =
    file.type === 'image/png' || lowerName.endsWith('.png')
  const looksJpeg =
    file.type === 'image/jpeg' || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')

  if (!looksPng && !looksJpeg) fail(translate(getUiLang(), 'lib.upload.need_png_or_jpg'))

  let head: Uint8Array
  try {
    head = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  } catch {
    fail(translate(getUiLang(), 'lib.upload.read_failed'))
  }

  const isPng = hasMagic(head!, PNG_MAGIC)
  const isJpeg = hasMagic(head!, JPEG_MAGIC)

  if (!isPng && !isJpeg) fail(translate(getUiLang(), 'lib.upload.not_real_image'))

  let decoded: { bmp: ImageBitmap; width: number; height: number }
  try {
    decoded = await decode(file)
  } catch (e) {
    fail(e instanceof Error ? e.message : translate(getUiLang(), 'lib.upload.not_image'))
  }

  const { bmp, width, height } = decoded!
  const scale = Math.min(1, AVATAR_MAX_SIDE / Math.max(width, height))
  const w = Math.max(1, Math.round(width * scale))
  const h = Math.max(1, Math.round(height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) fail(translate(getUiLang(), 'lib.upload.browser_failed'))
  ctx!.drawImage(bmp, 0, 0, w, h)
  bmp.close()

  // Sanity: the canvas must contain non-trivial pixels.
  try {
    const sample = ctx!.getImageData(0, 0, Math.min(w, 8), Math.min(h, 8)).data
    if (sample.every((v) => v === 0)) fail(translate(getUiLang(), 'lib.upload.empty_image'))
  } catch {
    fail(translate(getUiLang(), 'lib.upload.browser_failed'))
  }

  const mime = isPng ? 'image/png' : 'image/jpeg'
  const blob = await toBlob(canvas, mime)

  if (blob.size > AVATAR_MAX_BYTES) fail(translate(getUiLang(), 'lib.upload.still_too_large'))

  return { blob, previewUrl: URL.createObjectURL(blob), ext: isPng ? 'png' : 'jpg', width: w, height: h }
}
