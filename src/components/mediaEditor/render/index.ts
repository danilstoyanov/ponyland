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
import ProgressivePreloader from '../../preloader';

interface RenderManagerParams {
  entities: Array<TextEntityType | StickerEntityType>;
  imageLayerCanvas: HTMLCanvasElement;
  drawingLayerCanvas: HTMLCanvasElement;
  preloader: ProgressivePreloader;
};

export class RenderManager {
  private preloader: ProgressivePreloader

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
    drawingLayerCanvas,
    preloader
  }: RenderManagerParams) {
    this.imageLayerCanvas = imageLayerCanvas;
    this.drawingLayerCanvas = drawingLayerCanvas;
    this.imageLayerCanvasCtx = this.imageLayerCanvas.getContext('2d');
    this.drawingLayerCanvasCtx = this.drawingLayerCanvas.getContext('2d');

    /**
     * It's just few hours before deadline, so we will show this progress in a super approximate way
     * cause ideally we should build render pipeline and assign different progress values based on entities count and stuff... 🙈
    */
    this.preloader = preloader;

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

  onRenderStart() {
    this.preloader.setProgress(5);
  };

  onRenderEnd() {
    this.preloader.setProgress(100);
  };

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
    this.onRenderStart();

    // 1 Render base layer with cropped image with filters applied
    this.resultCanvasCtx.drawImage(this.imageLayerCanvas, 0, 0);
    this.preloader.setProgress(20);

    // 2 Render of drawings on top of the image layer
    this.resultCanvasCtx.drawImage(this.drawingLayerCanvas, 0, 0);
    this.preloader.setProgress(30);

    // 3 Render of text entities on top of image + drawings

    this.textEntities.forEach(entity => this.textRenderer.render(entity, this.resultCanvasCtx));
    this.preloader.setProgress(40);

    // 4 Render of static stickers entities on top of image + drawings
    const staticStickers = this.stickerEntities.filter(sticker => sticker.stickerType === 1);

    if(staticStickers.length > 0) {
      for(const sticker of staticStickers) {
        await this.staticStickerRenderer.render(sticker, this.resultCanvasCtx);
      }
    }

    // 5 Render of animated stickers
    const animatedStickers = this.stickerEntities.filter(sticker => sticker.stickerType === 2);
    const videoStickers = this.stickerEntities.filter(sticker => sticker.stickerType === 3);

    if(animatedStickers.length === 0 && videoStickers.length === 0) {
      const canvas = this.resultCanvasCtx.canvas;
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'sticker_image_before_export.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      const media = await this._exportImage();

      return media;
    } else {
      this.preloader.setProgress(60);
      const animatedStickersFrames = await this.animatedStickerRenderer.render(animatedStickers, 3000, 60);
      this.preloader.setProgress(70);
      const videoStickersFrames = await this.videoStickerRenderer.render(videoStickers, 3000, 60);

      const frames = [...animatedStickersFrames, ...videoStickersFrames];

      const videoBlob = await this.videoComposer.createVideoFromFrames(this.resultCanvas, [...animatedStickers, ...videoStickers], frames, 60);

      this.onRenderEnd();

      return this._exportVideo(videoBlob);

      // const url = window.URL.createObjectURL(videoBlob);
      // const a = document.createElement('a');
      // a.style.display = 'none';
      // a.href = url;
      // a.download = 'animated-sticker.mp4';
      // document.body.appendChild(a);
      // a.click();
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
