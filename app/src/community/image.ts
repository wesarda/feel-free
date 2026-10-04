/**
 * Shrinks a photo to at most `maxSide` pixels and re-encodes it as JPEG. Re-encoding drops EXIF,
 * including the GPS position some phones store in photos.
 */
export async function prepareImage(file: File, maxSide = 1280): Promise<{ dataUrl: string; width: number; height: number }> {
  if (!file.type.startsWith('image/')) throw new Error('not-image')
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no-canvas')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  let dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  // Keep uploads small enough for the database (about 0.9 MB as text)
  if (dataUrl.length > 900_000) dataUrl = canvas.toDataURL('image/jpeg', 0.65)
  return { dataUrl, width, height }
}
