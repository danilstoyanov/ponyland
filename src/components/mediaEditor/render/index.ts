/**
 * This will be main class for managing rendering process, actually this could be done in FP style too,
 * but in order to be consistent with the codebase we can utilize some classes instead
 */
import type {TextEntityType, StickerEntityType} from '../entities';
import {StaticStickerRenderer} from './static-sticker';
import {AnimatedStickerRenderer} from './animated-sticker';
import {VideoStickerRenderer} from './video-sticker';
import {TextRenderer} from './text';
import {VideoComposer} from './video-composer';

interface RenderManagerParams {
  entities: Array<TextEntityType | StickerEntityType>;
  imageLayerCanvas: HTMLCanvasElement;
  drawingLayerCanvas: HTMLCanvasElement;
};

export class RenderManager {
  private textRenderer: TextRenderer;
  private staticStickerRenderer: StaticStickerRenderer;
  private animatedStickerRenderer: AnimatedStickerRenderer;
  private videoStickerRenderer: VideoStickerRenderer;
  private videoComposer: VideoComposer;

  private textEntities: TextEntityType[];
  private stickerEntities: StickerEntityType[];

  private imageLayerCanvas: HTMLCanvasElement;
  private imageLayerCanvasCtx: CanvasRenderingContext2D;

  private drawingLayerCanvas: HTMLCanvasElement;
  private drawingLayerCanvasCtx: CanvasRenderingContext2D;

  private resultCanvas: HTMLCanvasElement;
  private resultCanvasCtx: CanvasRenderingContext2D;

  constructor({
    entities,
    imageLayerCanvas,
    drawingLayerCanvas
  }: RenderManagerParams) {
    this.imageLayerCanvas = imageLayerCanvas;
    this.drawingLayerCanvas = drawingLayerCanvas;
    this.imageLayerCanvasCtx = this.imageLayerCanvas.getContext('2d');
    this.drawingLayerCanvasCtx = this.drawingLayerCanvas.getContext('2d');

    this.textRenderer = new TextRenderer({imageLayerCanvas, drawingLayerCanvas});
    this.staticStickerRenderer = new StaticStickerRenderer({imageLayerCanvas, drawingLayerCanvas});
    this.animatedStickerRenderer = new AnimatedStickerRenderer({imageLayerCanvas, drawingLayerCanvas});
    this.videoStickerRenderer = new VideoStickerRenderer({imageLayerCanvas, drawingLayerCanvas});
    this.videoComposer = new VideoComposer();

    this.textEntities = entities.filter(item => item.type === 'text') as TextEntityType[];
    this.stickerEntities = entities.filter(item => item.type === 'sticker') as StickerEntityType[];

    this._setupResultCanvas();
  };

  onRenderProgress() {};

  onRenderStart() {};

  onRenderEnd() {};

  /*
   This is main method for rendering, it will execute rendering in the following way, the order maybe adjusted later
   if we need to respect z-index kind of layering too

    1 Render of the image layer including it is cropped + filtered version
    2 Render of drawings on top of the image layer
    3 Render of text entities on top of the image + drawing layers
    4 Render of static stickers on top of image + text
    5 Render of animated + video stickers happens at the end
  */
  async render() {
    // 1 Render base layer with cropped image with filters applied
    this.resultCanvasCtx.drawImage(this.imageLayerCanvas, 0, 0);

    // 2 Render of drawings on top of the image layer
    this.resultCanvasCtx.drawImage(this.drawingLayerCanvas, 0, 0);

    // 3 Render of text entities on top of image + drawings

    this.textEntities.forEach(entity => this.textRenderer.render(entity, this.resultCanvasCtx));

    // 4 Render of static stickers entities on top of image + drawings
    const staticStickers = this.stickerEntities.filter(sticker => sticker.stickerType === 1);

    if(staticStickers.length > 0) {
      await Promise.all(staticStickers.map(sticker => this.staticStickerRenderer.render(sticker, this.resultCanvasCtx)));
    };

    // 5 Render of animated stickers
    const animatedStickers = this.stickerEntities.filter(sticker => sticker.stickerType === 2);
    const videoStickers = this.stickerEntities.filter(sticker => sticker.stickerType === 3);

    if(animatedStickers.length === 0 && videoStickers.length === 0) {
      const media = await this._exportImage();

      const url = window.URL.createObjectURL(media);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'image_with_text.png';
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      return media;
    } else {
      const animatedStickersFrames = await this.animatedStickerRenderer.render(animatedStickers, 3000, 48);
      const videoStickersFrames = await this.videoStickerRenderer.render(videoStickers, 3000, 48);

      const frames = [...animatedStickersFrames, ...videoStickersFrames];

      const videoBlob = await this.videoComposer.createVideoFromFrames(this.resultCanvas, [...animatedStickers, ...videoStickers], frames, 48);

      return this._exportVideo(videoBlob);

      // const url = window.URL.createObjectURL(videoBlob);
      // const a = document.createElement('a');
      // a.style.display = 'none';
      // a.href = url;
      // a.download = 'animated-sticker.mp4';
      // document.body.appendChild(a);
      // a.click();

      // setTimeout(() => {
      //   document.body.removeChild(a);
      //   window.URL.revokeObjectURL(url);
      // }, 100);

      // console.log('debugging render');
    };
  };

  _setupResultCanvas() {
    this.resultCanvas = document.createElement('canvas');
    this.resultCanvas.width = this.imageLayerCanvas.width;
    this.resultCanvas.height = this.imageLayerCanvas.height;
    this.resultCanvasCtx = this.resultCanvas.getContext('2d');
  }

  private async _exportImage(): Promise<File> {
    return new Promise((resolve) => {
      this.resultCanvas.toBlob((blob) => {
        if(blob) {
          const file = new File([blob], 'edited_image.png', {type: 'image/png', lastModified: Date.now()});
          resolve(file);
        }
      }, 'image/png');
    });
  }

  private async _exportVideo(blob: Blob): Promise<File> {
    return new Promise((resolve) => {
      const file = new File([blob], 'edited_video.mp4', {type: 'video/mp4', lastModified: Date.now()});
      resolve(file);
    });
  }
}
