/**
 * Those filters are based on simple 2D context of canvas rather then WEBGL,
 * and performance-wise they could still have satistying performance if we use some basic caching for them
 *
 * The algorithms for filters are aligned with implementation for IOS telegram client
 * Telegram-iOS/submodules/TelegramUI/Components/MediaEditor/**
 */
export function applyBrightness(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const adjustment = intensity * 128;

  for(let i = 0; i < data.length; i += 4) {
    data[i] += adjustment;
    data[i + 1] += adjustment;
    data[i + 2] += adjustment;

    data[i] = Math.max(0, Math.min(255, data[i]));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyContrast(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = intensity / 2 + 1;
  const intercept = 128 * (1 - contrast);
  for(let i = 0; i < data.length; i += 4) {
    data[i] = data[i] * contrast + intercept;
    data[i + 1] = data[i + 1] * contrast + intercept;
    data[i + 2] = data[i + 2] * contrast + intercept;
  }
  ctx.putImageData(imageData, 0, 0);
}

export function applyVignette(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  if(!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  const width = canvas.width;
  const height = canvas.height;
  const centerX = width / 2;
  const centerY = height / 2;
  const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);

  for(let y = 0; y < height; y++) {
    for(let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const dx = x - centerX;
      const dy = y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const normalizedDistance = distance / maxDistance;

      const vignetteFactor = normalizedDistance * intensity;

      const finalVignetteFactor = Math.min(1, vignetteFactor);

      data[i] *= (1 - finalVignetteFactor);
      data[i + 1] *= (1 - finalVignetteFactor);
      data[i + 2] *= (1 - finalVignetteFactor);
    }
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyEnhance(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  if(!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

  const brightnessFactor = 1 + 0.2 * Math.min(Math.max(intensity, 0), 1);
  const saturationFactor = 1 + 0.4 * Math.min(Math.max(intensity, 0), 1);

  for(let i = 0; i < data.length; i += 4) {
    let r = data[i] / 255;
    let g = data[i + 1] / 255;
    let b = data[i + 2] / 255;

    r = clamp(r * brightnessFactor, 0, 1);
    g = clamp(g * brightnessFactor, 0, 1);
    b = clamp(b * brightnessFactor, 0, 1);

    const avg = (r + g + b) / 3;
    r = clamp(avg + (r - avg) * saturationFactor, 0, 1);
    g = clamp(avg + (g - avg) * saturationFactor, 0, 1);
    b = clamp(avg + (b - avg) * saturationFactor, 0, 1);

    data[i] = r * 255;
    data[i + 1] = g * 255;
    data[i + 2] = b * 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applySaturation(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let mappedSaturation = intensity;
  if(mappedSaturation > 0.0) {
    mappedSaturation *= 1.05;
  }
  mappedSaturation += 1.0;

  for(let i = 0; i < data.length; i += 4) {
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

    s = s * mappedSaturation;

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

    data[i] = rgb[0];
    data[i + 1] = rgb[1];
    data[i + 2] = rgb[2];
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyWarmth(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

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

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  let yuvVector;
  if(intensity > 0) {
    yuvVector = [0.1765, -0.1255, 0.0902];
  } else {
    yuvVector = [-0.0588, 0.1569, -0.1255];
  }

  for(let i = 0; i < data.length; i += 4) {
    const yuvColor = rgbToYuv([
      data[i] / 255,
      data[i + 1] / 255,
      data[i + 2] / 255
    ]);

    const luma = yuvColor[0];
    const curveScale = Math.sin(luma * Math.PI);
    yuvColor[0] += 0.375 * intensity * curveScale * yuvVector[0];
    yuvColor[1] += 0.375 * intensity * curveScale * yuvVector[1];
    yuvColor[2] += 0.375 * intensity * curveScale * yuvVector[2];

    const rgb = yuvToRgb(yuvColor);

    data[i] = rgb[0] * 255;
    data[i + 1] = rgb[1] * 255;
    data[i + 2] = rgb[2] * 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyFade(canvas: HTMLCanvasElement, coefficient: number) {
  const ctx = canvas.getContext('2d');

  if(!ctx) return;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for(let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    const gray = (r + g + b) / 3;

    data[i] = Math.round(r * (1 - coefficient) + gray * coefficient);
    data[i + 1] = Math.round(g * (1 - coefficient) + gray * coefficient);
    data[i + 2] = Math.round(b * (1 - coefficient) + gray * coefficient);
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyHighlights(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  if(!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const adjustedIntensity = Math.min(Math.max(intensity, 0), 1) * 1.5; // Adjust scaling factor as needed

  const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

  for(let i = 0; i < data.length; i += 4) {
    const r = data[i] / 255;
    const g = data[i + 1] / 255;
    const b = data[i + 2] / 255;
    const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

    const highlightFactor = 1.0 - Math.pow(luminance, 0.5); // More pronounced effect for brighter areas
    const highlight = highlightFactor * adjustedIntensity;

    data[i] = clamp(r + highlight, 0, 1) * 255;
    data[i + 1] = clamp(g + highlight, 0, 1) * 255;
    data[i + 2] = clamp(b + highlight, 0, 1) * 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applySelectiveShadow(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  for(let i = 0; i < data.length; i += 4) {
    const luminance =
      0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];

    if(luminance < 100) {
      const adjustedIntensity = intensity * 0.15;

      data[i] -= adjustedIntensity * 50;
      data[i + 1] -= adjustedIntensity * 50;
      data[i + 2] -= adjustedIntensity * 50;
    }

    data[i] = Math.max(0, Math.min(255, data[i]));
    data[i + 1] = Math.max(0, Math.min(255, data[i + 1]));
    data[i + 2] = Math.max(0, Math.min(255, data[i + 2]));
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applyGrain(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const numPixels = data.length / 4;

  const grainAmount = intensity * 100;

  for(let i = 0; i < numPixels; i++) {
    const random = Math.random();
    const offset = grainAmount * (random - 0.5);
    data[i * 4] += offset;
    data[i * 4 + 1] += offset;
    data[i * 4 + 2] += offset;
  }

  ctx.putImageData(imageData, 0, 0);
}

export function applySharp(canvas: HTMLCanvasElement, intensity: number) {
  const ctx = canvas.getContext('2d');

  if(!ctx) return;

  const width = canvas.width;
  const height = canvas.height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const sharpenKernel = [
    0, -1, 0,
    -1,  5, -1,
    0, -1, 0
  ];

  const output = new Uint8ClampedArray(data);

  const adjustedIntensity = intensity * 3;

  const getIndex = (x: number, y: number) => (y * width + x) * 4;

  const applyKernel = (x: number, y: number) => {
    let r = 0, g = 0, b = 0;
    let offset = 0;

    for(let ky = -1; ky <= 1; ky++) {
      for(let kx = -1; kx <= 1; kx++) {
        const px = x + kx;
        const py = y + ky;

        if(px >= 0 && px < width && py >= 0 && py < height) {
          const idx = getIndex(px, py);
          r += data[idx] * sharpenKernel[offset];
          g += data[idx + 1] * sharpenKernel[offset];
          b += data[idx + 2] * sharpenKernel[offset];
        }
        offset++;
      }
    }

    const idx = getIndex(x, y);
    output[idx] = Math.min(255, Math.max(0, data[idx] + (r - data[idx]) * adjustedIntensity));
    output[idx + 1] = Math.min(255, Math.max(0, data[idx + 1] + (g - data[idx + 1]) * adjustedIntensity));
    output[idx + 2] = Math.min(255, Math.max(0, data[idx + 2] + (b - data[idx + 2]) * adjustedIntensity));
  };

  for(let y = 0; y < height; y++) {
    for(let x = 0; x < width; x++) {
      applyKernel(x, y);
    }
  }

  for(let i = 0; i < data.length; i++) {
    data[i] = output[i];
  }

  ctx.putImageData(imageData, 0, 0);
}
