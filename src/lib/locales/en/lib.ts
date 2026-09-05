import type ruLib from '../ru/lib'

const en: typeof ruLib = {
  auth: {
    server_unavailable: 'Server unavailable. Check your connection.',
    something_wrong: 'Something went wrong',
  },
  upload: {
    empty_image: 'Image is empty.',
    not_image: 'File cannot be opened as an image.',
    process_failed: 'Could not process the image.',
    too_large: 'Image is larger than 5 MB.',
    empty_file: 'Empty file.',
    need_png_or_jpg: 'PNG or JPG required.',
    read_failed: 'Could not read the file.',
    not_real_image: 'This is not an image, just a renamed file.',
    browser_failed: 'Browser could not process the image.',
    still_too_large: 'Image is still larger than 5 MB after compression.',
  },
  errors: {
    request_failed: 'Request failed ({status})',
    upload_failed: 'Upload failed ({status})',
    catalog_failed: 'Catalog request failed ({status})',
    empty_response: 'Empty server response.',
    languages_failed: 'Languages failed',
  },
}

export default en
