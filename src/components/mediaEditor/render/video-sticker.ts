import {StickerEntityType} from '../entities';
import {Renderer, RendererParams} from './renderer';

export class VideoStickerRenderer extends Renderer {
  constructor(params: RendererParams) {
    super(params);
  }

  public async render(stickers: StickerEntityType[], duration: number, fps: number): Promise<ImageBitmap[][]> {
    if(!stickers.length) {
      return [];
    }

    const renderPromises = stickers.map(sticker => this._renderSticker(sticker, duration, fps));
    return Promise.all(renderPromises);
  }

  private async _renderSticker(sticker: StickerEntityType, duration: number, fps: number): Promise<ImageBitmap[]> {
    const videoElement = sticker.container.querySelector('video');
    if(!videoElement) {
      throw new Error('Video element not found in sticker container');
    }

    const captureFramesFromVideo = (videoElement: HTMLVideoElement, duration: number, fps: number): Promise<ImageBitmap[]> => {
      return new Promise((resolve) => {
        const capturedFrames: ImageBitmap[] = [];
        const totalFrames = Math.floor((duration / 1000) * fps);

        const captureFrame = async() => {
          if(capturedFrames.length >= totalFrames) {
            resolve(capturedFrames);
            return;
          }

          const canvas = document.createElement('canvas');
          canvas.width = typeof sticker.width === 'number' ? sticker.width : videoElement.videoWidth;
          canvas.height = typeof sticker.height === 'number' ? sticker.height : videoElement.videoHeight;
          const context = canvas.getContext('2d');

          context.drawImage(
            videoElement,
            0, 0, videoElement.videoWidth, videoElement.videoHeight,
            0, 0, canvas.width, canvas.height
          );
          const blob = await new Promise(resolve => canvas.toBlob(resolve));
          const bitmap = await createImageBitmap(blob as Blob);

          capturedFrames.push(bitmap);

          videoElement.requestVideoFrameCallback(captureFrame);
        };

        videoElement.currentTime = 0;
        videoElement.play();
        videoElement.requestVideoFrameCallback(captureFrame);
      });
    };

    const frames = await captureFramesFromVideo(videoElement, duration, fps);
    return frames;
  }
}
