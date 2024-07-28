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
      } catch(e0) {
        console.error('Exception while creating MediaRecorder:', e0);
        reject(e0);
        return;
      }

      mediaRecorder.onstop = (event) => {
        console.log('Recorder stopped:', event);
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

      const captureResultCanvasFrame = async() => {
        return new Promise<ImageBitmap>((resolve) => {
          resultCanvas.toBlob((blob) => {
            createImageBitmap(blob).then((bitmap) => {
              resolve(bitmap);
            });
          });
        });
      };

      const drawNextFrame = async() => {
        if(!resultFrame) {
          resultFrame = await captureResultCanvasFrame();
          context.drawImage(resultFrame, 0, 0);
        }

        if(frameIndex >= frames[0].length) {
          mediaRecorder.stop();
          return;
        }

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(resultFrame, 0, 0);

        frames.forEach((frameSet, index) => {
          const frame = frameSet[frameIndex];
          const sticker = stickers[index];
          context.drawImage(frame, sticker.x, sticker.y);
        });

        frameIndex++;
        setTimeout(drawNextFrame, 1000 / fps);
      };

      drawNextFrame();
    });
  }
}
