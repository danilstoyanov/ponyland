import {StickerEntityType} from '../entities';

export class VideoComposer {
  async createVideoFromFrames(resultCanvas: HTMLCanvasElement, stickers: StickerEntityType[], frames: ImageBitmap[][], fps: number): Promise<Blob> {
    return new Promise<Blob>((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      canvas.width = resultCanvas.width;
      canvas.height = resultCanvas.height;

      const stream = canvas.captureStream();
      const recordedBlobs: Blob[] = [];
      const options = {mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'};
      let mediaRecorder: MediaRecorder;

      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch(err) {
        console.error('recorder error:', err);
        reject(err);
        return;
      }

      mediaRecorder.onstop = (event) => {
        const superBuffer = new Blob(recordedBlobs, {type: 'video/mp4'});
        resolve(superBuffer);
      };

      mediaRecorder.ondataavailable = (event) => {
        if(event.data && event.data.size > 0) {
          recordedBlobs.push(event.data);
        }
      };

      mediaRecorder.start();

      let resultFrame: ImageBitmap;
      let frameIndex = 0;
      const frameDuration = 1000 / fps;
      let lastFrameTime = performance.now();

      const captureResultCanvasFrame = async() => {
        const blob = await new Promise<Blob>((resolve) => resultCanvas.toBlob(resolve));
        const bitmap = await createImageBitmap(blob);
        return bitmap;
      };

      const drawNextFrame = async(timestamp: number) => {
        if(!resultFrame) {
          resultFrame = await captureResultCanvasFrame();
          context.drawImage(resultFrame, 0, 0);
        }

        if(frameIndex >= frames[0].length) {
          mediaRecorder.stop();
          return;
        }

        const elapsedTime = timestamp - lastFrameTime;
        if(elapsedTime >= frameDuration) {
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(resultFrame, 0, 0);

          frames.forEach((frameSet, index) => {
            const frame = frameSet[frameIndex];
            const sticker = stickers[index];
            context.drawImage(frame, sticker.x, sticker.y);
          });

          frameIndex++;
          lastFrameTime = timestamp;
        }

        requestAnimationFrame(drawNextFrame);
      };

      requestAnimationFrame(drawNextFrame);
    });
  }
}
