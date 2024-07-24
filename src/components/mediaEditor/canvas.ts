export async function rotateImage(image: ImageBitmap, angle: number): Promise<ImageBitmap> {
  const radians = angle * Math.PI / 180;
  const cos = Math.abs(Math.cos(radians));
  const sin = Math.abs(Math.sin(radians));
  const width = image.width;
  const height = image.height;
  const newWidth = width * cos + height * sin;
  const newHeight = width * sin + height * cos;

  const rotatedCanvas = document.createElement('canvas');
  rotatedCanvas.width = newWidth;
  rotatedCanvas.height = newHeight;

  const rotatedCtx = rotatedCanvas.getContext('2d');
  rotatedCtx.translate(newWidth / 2, newHeight / 2);
  rotatedCtx.rotate(radians);
  rotatedCtx.drawImage(image, -width / 2, -height / 2);

  const imageBitmap = await createImageBitmap(rotatedCanvas);

  rotatedCanvas.remove();

  return imageBitmap;
}

export async function flipImage(imageBitmap: ImageBitmap, flip: 'horizontal' | 'vertical') {
  const width = imageBitmap.width;
  const height = imageBitmap.height;

  const flippedCanvas = document.createElement('canvas');
  flippedCanvas.width = width;
  flippedCanvas.height = height;

  const flippedCtx = flippedCanvas.getContext('2d');

  if(flip === 'horizontal') {
    flippedCtx.translate(width, 0);
    flippedCtx.scale(-1, 1);
  } else if(flip === 'vertical') {
    flippedCtx.translate(0, height);
    flippedCtx.scale(1, -1);
  }

  flippedCtx.drawImage(imageBitmap, 0, 0);

  const flippedImageBitmap = await createImageBitmap(flippedCanvas);
  flippedCanvas.remove();

  return flippedImageBitmap;
}

export async function tiltImage(imageBitmap: ImageBitmap, tiltAngle: number) {
  const width = imageBitmap.width;
  const height = imageBitmap.height;
  const radians = tiltAngle * Math.PI / 180;
  const absTheta = Math.abs(radians);

  // Calculate the scaling factor to ensure the image remains within the canvas viewbox
  const scalingFactor = Math.cos(absTheta) + Math.max(width / height, height / width) * Math.sin(absTheta);

  // Create a new canvas
  const tiltedCanvas = document.createElement('canvas');
  tiltedCanvas.width = width;
  tiltedCanvas.height = height;

  const tiltedCtx = tiltedCanvas.getContext('2d');

  // Translate and rotate the context
  tiltedCtx.translate(width / 2, height / 2);
  tiltedCtx.rotate(radians);
  tiltedCtx.scale(scalingFactor, scalingFactor);

  // Draw the image
  tiltedCtx.drawImage(imageBitmap, -width / 2, -height / 2);

  // Create a new ImageBitmap from the tilted canvas
  const tiltedImageBitmap = await createImageBitmap(tiltedCanvas);
  tiltedCanvas.remove();

  return tiltedImageBitmap;
}

