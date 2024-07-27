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


    // waiting for load
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });

    resultCanvasCtx.drawImage(
      img,
      sticker.x,
      sticker.y,
      sticker.width === 'auto' ? img.width : sticker.width,
      sticker.height === 'auto' ? img.height : sticker.height
    );
  }
}
