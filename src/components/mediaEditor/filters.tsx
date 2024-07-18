function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function mix(x: number, y: number, a: number) {
  return x * (1 - a) + y * a;
}

export function applyBrightness(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Convert intensity from range [-1, 1] to [-128, 128] to moderate the effect
  const adjustment = intensity * 128;

  for(let i = 0; i < data.length; i += 4) {
    // Adjust red channel
    data[i] += adjustment;
    // Adjust green channel
    data[i + 1] += adjustment;
    // Adjust blue channel
    data[i + 2] += adjustment;

    // Ensure values stay within [0, 255] range
    data[i] = Math.max(0, Math.min(255, data[i]));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyContrast(canvas: HTMLCanvasElement, intensity: number) {
  debugger;

  const ctx = canvas.getContext('2d');
  // Получаем изображение
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  // Применяем фильтр контрастности с заданной интенсивностью, разделив её на 2
  const contrast = intensity / 2 + 1; // Преобразуем от -1 до 1 в 0.5 до 1.5
  const intercept = 128 * (1 - contrast);
  for(let i = 0; i < data.length; i += 4) {
    // Применяем контраст ко всем пикселям
    data[i] = data[i] * contrast + intercept;
    data[i + 1] = data[i + 1] * contrast + intercept;
    data[i + 2] = data[i + 2] * contrast + intercept;
  }
  // Применяем изменения к Canvas
  ctx.putImageData(imageData, 0, 0);
}

export function applyVignetteEffect(canvas: HTMLCanvasElement, intensity: number) {
  const width = canvas.width;
  const height = canvas.height;

  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);
  const midpoint = 0.7;
  const fuzziness = 0.62;
  const vignetteAmount = intensity * 0.645;

  function easeInOutSigmoid(x: number, fuzziness: number) {
    const y = x - 0.5;
    return 0.5 + y / (1 + Math.abs(y * fuzziness));
  }

  for(let y = 0; y < height; y++) {
    for(let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const dx = x - centerX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy) / maxDist;
      const radDist = easeInOutSigmoid(dist * midpoint, fuzziness);
      const mag = radDist * vignetteAmount;

      data[offset] = data[offset] * (1 - mag) + 0 * mag;
      data[offset + 1] = data[offset + 1] * (1 - mag) + 0 * mag;
      data[offset + 2] = data[offset + 2] * (1 - mag) + 0 * mag;
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyEnhanceEffect(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  // Функция для преобразования RGB в HSL
  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if(max == min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch(max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
      }
      h /= 6;
    }
    return [h, s, l];
  }

  // Функция для преобразования HSL в RGB
  function hslToRgb(h: number, s: number, l: number) {
    let r, g, b;

    if(s == 0) {
      r = g = b = l; // achromatic
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if(t < 0) t += 1;
        if(t > 1) t -= 1;
        if(t < 1 / 6) return p + (q - p) * 6 * t;
        if(t < 1 / 3) return q;
        if(t < 1 / 2) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r * 255, g * 255, b * 255];
  }

  // Получаем изображение
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Обрабатываем пиксели
  for(let i = 0; i < data.length; i += 4) {
    const hsl = rgbToHsl(data[i], data[i + 1], data[i + 2]);

    // Применение эффектов с учетом коэффициента интенсивности
    hsl[2] = hsl[2] * (1 + 0.1 * intensity); // Увеличение яркости
    hsl[1] = hsl[1] * (1 + 0.2 * intensity); // Увеличение насыщенности

    const rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  }

  // Применяем изменения к Canvas
  ctx.putImageData(imageData, 0, 0);
}

export function applySaturation(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Adjust intensity based on shader logic
  let mappedSaturation = intensity;
  if(mappedSaturation > 0.0) {
    mappedSaturation *= 1.05;
  }
  mappedSaturation += 1.0;

  // Loop through each pixel
  for(let i = 0; i < data.length; i += 4) {
    // Convert RGB to HSL
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    const cmin = Math.min(r, g, b);
    const cmax = Math.max(r, g, b);
    const delta = cmax - cmin;

    let h = 0;
    let s = 0;
    const l = (cmax + cmin) / 2;

    if(delta !== 0) {
      s = delta / (1 - Math.abs(2 * l - 1));
      switch(cmax) {
        case r:
          h = ((g - b) / delta) % 6;
          break;
        case g:
          h = (b - r) / delta + 2;
          break;
        case b:
          h = (r - g) / delta + 4;
          break;
      }
    }

    h = Math.round(h * 60);
    if(h < 0) h += 360;

    // Adjust saturation
    s = s * mappedSaturation;

    // Convert back to RGB
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let rgb1;
    if(h >= 0 && h < 60) {
      rgb1 = [c, x, 0];
    } else if(h >= 60 && h < 120) {
      rgb1 = [x, c, 0];
    } else if(h >= 120 && h < 180) {
      rgb1 = [0, c, x];
    } else if(h >= 180 && h < 240) {
      rgb1 = [0, x, c];
    } else if(h >= 240 && h < 300) {
      rgb1 = [x, 0, c];
    } else if(h >= 300 && h < 360) {
      rgb1 = [c, 0, x];
    }

    const rgb = [(rgb1[0] + m) * 255, (rgb1[1] + m) * 255, (rgb1[2] + m) * 255];

    // Apply the adjusted RGB values to the image data
    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  }

  // Put the modified image data back onto the canvas
  ctx.putImageData(imageData, 0, 0);
}

export function applyWarmth(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  // Helper functions for RGB to YUV and vice versa conversions
  function rgbToYuv(rgb: number[]) {
    const y = rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114;
    const u = (rgb[2] - y) * 0.565;
    const v = (rgb[0] - y) * 0.713;
    return [y, u, v];
  }

  function yuvToRgb(yuv: number[]) {
    const r = yuv[0] + yuv[2] * 1.403;
    const g = yuv[0] - yuv[1] * 0.344 - yuv[2] * 0.714;
    const b = yuv[0] + yuv[1] * 1.77;
    return [clamp(r, 0, 1), clamp(g, 0, 1), clamp(b, 0, 1)];
  }

  function clamp(value: number, min: number, max: number) {
    return Math.min(Math.max(value, min), max);
  }

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Define warmth adjustment vector
  let yuvVector;
  if(intensity > 0) {
    yuvVector = [0.1765, -0.1255, 0.0902];
  } else {
    yuvVector = [-0.0588, 0.1569, -0.1255];
  }

  // Loop through each pixel
  for(let i = 0; i < data.length; i += 4) {
    // Convert RGB to YUV
    const yuvColor = rgbToYuv([
      data[i] / 255,
      data[i + 1] / 255,
      data[i + 2] / 255
    ]);

    // Apply warmth adjustment
    const luma = yuvColor[0];
    const curveScale = Math.sin(luma * Math.PI);
    yuvColor[0] += 0.375 * intensity * curveScale * yuvVector[0];
    yuvColor[1] += 0.375 * intensity * curveScale * yuvVector[1];
    yuvColor[2] += 0.375 * intensity * curveScale * yuvVector[2];

    // Convert back to RGB
    const rgb = yuvToRgb(yuvColor);

    // Update pixel values in image data
    data[i] = rgb[0] * 255;
    data[i + 1] = rgb[1] * 255;
    data[i + 2] = rgb[2] * 255;
  }

  // Put the modified image data back onto the canvas
  ctx.putImageData(imageData, 0, 0);
}

export function applyFade(canvas: HTMLCanvasElement, coefficient: number) {
  const ctx = canvas.getContext('2d');

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Loop through each pixel
  for(let i = 0; i < data.length; i += 4) {
    // Extract RGB components from image data
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;

    // Apply the fade effect
    const comp1R = -0.9772 * Math.pow(r, 3);
    const comp2R = 1.708 * Math.pow(r, 2);
    const comp3R = -0.1603 * r;
    const comp4R = 0.2878;
    const finalComponentR = comp1R + comp2R + comp3R + comp4R;
    const differenceR = finalComponentR - r;
    const scaledR = 0.9 * differenceR;
    const fadedR = r + scaledR;

    const comp1G = -0.9772 * Math.pow(g, 3);
    const comp2G = 1.708 * Math.pow(g, 2);
    const comp3G = -0.1603 * g;
    const comp4G = 0.2878;
    const finalComponentG = comp1G + comp2G + comp3G + comp4G;
    const differenceG = finalComponentG - g;
    const scaledG = 0.9 * differenceG;
    const fadedG = g + scaledG;

    const comp1B = -0.9772 * Math.pow(b, 3);
    const comp2B = 1.708 * Math.pow(b, 2);
    const comp3B = -0.1603 * b;
    const comp4B = 0.2878;
    const finalComponentB = comp1B + comp2B + comp3B + comp4B;
    const differenceB = finalComponentB - b;
    const scaledB = 0.9 * differenceB;
    const fadedB = b + scaledB;

    // Apply the coefficient to fade
    data[i] = Math.round((r * (1 - coefficient) + fadedR * coefficient) * 255);
    data[i + 1] = Math.round(
      (g * (1 - coefficient) + fadedG * coefficient) * 255
    );
    data[i + 2] = Math.round(
      (b * (1 - coefficient) + fadedB * coefficient) * 255
    );
  }

  // Put the modified image data back onto the canvas
  ctx.putImageData(imageData, 0, 0);
}

export function applyHighlights(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Constants from the shader
  const hsLuminanceWeighting = [0.3, 0.3, 0.3];

  // Loop through each pixel
  for(let i = 0; i < data.length; i += 4) {
    // Calculate luminance weighted average
    const luminance =
      0.2126 * (data[i] / 255) +
      0.7152 * (data[i + 1] / 255) +
      0.0722 * (data[i + 2] / 255);

    // Adjust for intensity
    const mappedHighlights = intensity * 0.75 + 1.0;
    const hsLuminance = luminance * hsLuminanceWeighting[0];

    // Calculate shadow and highlight adjustments
    const shadow = clamp(
      Math.pow(hsLuminance, 1.0 / mappedHighlights) -
        0.76 * Math.pow(hsLuminance, 2.0 / mappedHighlights) -
        hsLuminance,
      0.0,
      1.0
    );
    const highlight = clamp(
      1.0 -
        (Math.pow(1.0 - hsLuminance, 1.0 / (2.0 - mappedHighlights)) -
          0.8 * Math.pow(1.0 - hsLuminance, 2.0 / (2.0 - mappedHighlights))) -
        hsLuminance,
      -1.0,
      0.0
    );

    // Apply the adjustments to the pixel values
    data[i] = clamp(data[i] / 255 + shadow + highlight, 0.0, 1.0) * 255;
    data[i + 1] = clamp(data[i + 1] / 255 + shadow + highlight, 0.0, 1.0) * 255;
    data[i + 2] = clamp(data[i + 2] / 255 + shadow + highlight, 0.0, 1.0) * 255;
  }

  // Put the modified image data back onto the canvas
  ctx.putImageData(imageData, 0, 0);
}

export function applySelectiveShadow(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  // Get the image data from the canvas
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Loop through each pixel
  for(let i = 0; i < data.length; i += 4) {
    // Calculate luminance (assuming grayscale image for simplicity)
    const luminance =
      0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

    // Example condition: Apply shadow only to pixels darker than a threshold
    if(luminance < 100) {
      // Scale down the intensity effect
      const adjustedIntensity = intensity * 0.15; // Adjust this factor as needed

      // Apply shadow effect
      data[i] -= adjustedIntensity * 50; // Adjust red channel
      data[i + 1] -= adjustedIntensity * 50; // Adjust green channel
      data[i + 2] -= adjustedIntensity * 50; // Adjust blue channel
    }
    // You can add more conditions based on your specific criteria

    // Ensure color channels are within 0-255 range
    data[i] = Math.max(0, Math.min(255, data[i]));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
  }

  // Put the modified image data back onto the canvas
  ctx.putImageData(imageData, 0, 0);
}

export function applyGrain(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const numPixels = data.length / 4;

  // Adjust intensity to control the amount of grain
  const grainAmount = intensity * 100; // Adjust this factor as needed

  for(let i = 0; i < numPixels; i++) {
    const random = Math.random();
    const offset = grainAmount * (random - 0.5); // Random offset within intensity range
    data[i * 4] += offset; // Red channel
    data[i * 4 + 1] += offset; // Green channel
    data[i * 4 + 2] += offset; // Blue channel
  }

  ctx.putImageData(imageData, 0, 0);
}
