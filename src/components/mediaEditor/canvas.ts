export async function rotateImage(image: ImageBitmap, angle: number): Promise<ImageBitmap> {
  const radians = angle * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const width = image.width;
  const height = image.height;
  const newWidth = width * cos + height * sin;
  const newHeight = width * sin + height * cos;

  // Создаем новый холст для хранения повернутого изображения
  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = newWidth;
  rotatedCanvas.height = newHeight;

  const rotatedCtx = rotatedCanvas.getContext('2d');
  rotatedCtx.translate(newWidth / 2, newHeight / 2);
  rotatedCtx.rotate(radians);
  rotatedCtx.drawImage(image, -width / 2, -height / 2);

  // Возвращаем ImageBitmap из повернутого холста
  const imageBitmap = await createImageBitmap(rotatedCanvas);

  // Удаляем временный холст после получения ImageBitmap
  rotatedCanvas.remove();

  return imageBitmap;
}
