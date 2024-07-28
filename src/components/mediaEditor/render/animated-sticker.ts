import {StickerEntityType} from '../entities';
import {Renderer, RendererParams} from './renderer';

export class AnimatedStickerRenderer extends Renderer {
  constructor(params: RendererParams) {
    super(params);
  }

  public async render(stickers: StickerEntityType[], duration: number, fps: number): Promise<ImageBitmap[][]> {
    const renderPromises = stickers.map(sticker => this._renderSticker(sticker, duration, fps));
    return Promise.all(renderPromises);
  }

  private async _renderSticker(sticker: StickerEntityType, duration: number, fps: number): Promise<ImageBitmap[]> {
    const stickerCanvas = sticker.container.querySelector('canvas');

    const captureFrames = async(stickerCanvas: HTMLCanvasElement, duration: number, fps: number): Promise<ImageBitmap[]> => {
      const capturedFrames: ImageBitmap[] = [];
      const totalFrames = Math.floor((duration / 1000) * fps);
      const captureInterval = 1000 / fps;

      for(let i = 0; i < totalFrames; i++) {
        let bitmap = await this.captureFrame(stickerCanvas);

        bitmap = await this.scaleBitmap(
          bitmap,
          sticker.width == 'auto' ? stickerCanvas.width : sticker.width,
          sticker.height == 'auto' ? stickerCanvas.height : sticker.height
        );

        capturedFrames.push(bitmap);
        await this.sleep(captureInterval);
      }

      return capturedFrames;
    };

    const frames = await captureFrames(stickerCanvas, duration, fps);
    return frames;
  }

  private captureFrame(stickerCanvas: HTMLCanvasElement): Promise<ImageBitmap> {
    return new Promise((resolve) => {
      stickerCanvas.toBlob((blob) => {
        createImageBitmap(blob).then(resolve);
      });
    });
  }

  private async scaleBitmap(bitmap: ImageBitmap, width: number, height: number): Promise<ImageBitmap> {
    const offscreenCanvas = new OffscreenCanvas(width, height);
    const ctx = offscreenCanvas.getContext('2d');
    // @ts-ignore
    ctx.drawImage(bitmap, 0, 0, width, height);
    return createImageBitmap(offscreenCanvas);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
