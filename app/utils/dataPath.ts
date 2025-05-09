// app/utils/photo_path.ts
import path from 'path'

export function getLocalUploadPath() {
  return process.env.NODE_ENV === 'production'
    ? '/data/uploads/photos'
    : path.join(process.cwd(), 'public/uploads/photos')
}
