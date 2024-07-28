import {StickerEntityType} from '../entities';
import {Renderer, RendererParams} from './renderer';

export class StaticStickerRenderer extends Renderer {
  constructor(params: RendererParams) {
    super(params);
  }

  async render(sticker: StickerEntityType, resultCanvasCtx: CanvasRenderingContext2D): Promise<void> {
    const image = sticker.container.querySelector('img');
    const imageUrl = image.src;
    const img = new Image();
    img.src = imageUrl;

    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    const imageBitmap = await createImageBitmap(img);

    resultCanvasCtx.drawImage(
      imageBitmap,
      sticker.x,
      sticker.y,
      sticker.width === 'auto' ? imageBitmap.width : sticker.width,
      sticker.height === 'auto' ? imageBitmap.height : sticker.height
    );
  }
}
