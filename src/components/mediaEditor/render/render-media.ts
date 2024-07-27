// @ts-nocheck
const renderMedia = async() => {
  // Create a new canvas for the resulting image
  const resultCanvas = document.createElement('canvas');
  resultCanvas.width = imageLayerCanvas.width;
  resultCanvas.height = imageLayerCanvas.height;
  const resultCtx = resultCanvas.getContext('2d');

  // Render the base layer
  resultCtx.drawImage(imageLayerCanvas, 0, 0);

  // Render the drawing layer without transparency
  resultCtx.drawImage(drawingLayerCanvas, 0, 0);

  // Render text nodes
  state.entities.forEach(entity => {
    console.log('entity.x, entity.y: ', entity.x, entity.y);

    if(isTextEntity(entity)) {
      if(entity.appearance === 'background') {
        const node = document.querySelector(`[data-ref="${entity.id}"]`);
        const textNodes = node.querySelectorAll('div');

        resultCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
        // resultCtx.textBaseline = 'hanging'; // Vertically align text in the middle
        resultCtx.textBaseline = 'middle'; // Vertically align text in the middle

        const paddingTop = 4;
        const paddingSides = 12;
        const radius = 8;
        const microGap = 2; // small adjustment to remove micro gap

        // Calculate the overall bounding box
        let maxWidth = 0;
        let totalHeight = 0;
        textNodes.forEach(textNode => {
          const text = textNode.textContent;
          const textMetrics = resultCtx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = entity.fontSize;

          if(textWidth > maxWidth) {
            maxWidth = textWidth;
          }
          totalHeight += textHeight + paddingTop * 2 + microGap;
        });

        // Calculate the initial y position for the bounding box
        let startY = entity.y;

        // Draw the rectangles and text inside the bounding box
        textNodes.forEach((textNode, index) => {
          const text = textNode.textContent;
          const textMetrics = resultCtx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = entity.fontSize;

          // Calculate the x position based on the selected text alignment
          let x = entity.x;

          switch(entity.textAlign) {
            case 'left':
              x = entity.x;
              break;
            case 'center':
              x = entity.x + maxWidth / 2 - (textWidth / 2);
              break;
            case 'right':
              x = entity.x + maxWidth - textWidth;
              break;
          }

          // Determine the border radius for the current rectangle
          let borderRadius = [0, 0, 0, 0]; // [top-left, top-right, bottom-right, bottom-left]

          if(textNodes.length === 1) {
            borderRadius = [radius, radius, radius, radius];
          } else {
            if(entity.textAlign === 'left') {
              if(index === 0) {
                const currentNode = textNodes[index];
                const nextNode = textNodes[index + 1];

                if(nextNode.clientWidth > currentNode.clientWidth) {
                  borderRadius = [radius, radius, 0, 0]
                } else {
                  borderRadius = [radius, radius, radius, 0]
                }
              } else if(index === textNodes.length - 1) {
                borderRadius = [0, radius, radius, radius];
              } else {
                if(textNode.clientWidth > textNodes[index - 1].clientWidth) {
                  borderRadius = [0, radius, radius, 0]; // Add border radius to the right
                } else {
                  borderRadius = [0, 0, 0, 0];
                }
              }
            } else if(entity.textAlign === 'right') {
              if(index === 0) {
                const currentNode = textNodes[index];
                const nextNode = textNodes[index + 1];
                if(nextNode.clientWidth > currentNode.clientWidth) {
                  borderRadius = [radius, radius, 0, 0]
                } else {
                  borderRadius = [radius, radius, 0, radius]
                }
              } else if(index === textNodes.length - 1) {
                borderRadius = [radius, 0, radius, radius];
              } else {
                if(textNode.clientWidth > textNodes[index - 1].clientWidth) {
                  borderRadius = [radius, 0, 0, radius];
                } else {
                  borderRadius = [0, 0, 0, 0];
                }
              }
            } else if(entity.textAlign === 'center') {
              if(index === 0) {
                const currentNode = textNodes[index];
                if(textNodes.length === 1) {
                  borderRadius = [radius, radius, radius, radius];
                } else {
                  const nextNode = textNodes[index + 1];

                  if(nextNode.clientWidth > currentNode.clientWidth) {
                    borderRadius = [radius, radius, 0, 0]
                  } else {
                    borderRadius = [radius, radius, radius, radius]
                  }
                }
              } else if(index === textNodes.length - 1) {
                borderRadius = [radius, radius, radius, radius];
              } else {
                if(textNode.clientWidth > textNodes[index - 1].clientWidth) {
                  borderRadius = [radius, radius, radius, radius];
                } else {
                  borderRadius = [0, 0, 0, 0];
                }
              }
            }
          }

          // Draw the background rectangle with rounded corners
          resultCtx.fillStyle = entity.color;
          resultCtx.beginPath();
          resultCtx.roundRect(x - paddingSides, startY - textHeight / 2 - paddingTop, textWidth + paddingSides * 2, textHeight + paddingTop * 2, borderRadius);
          resultCtx.fill();

          // Draw the text
          resultCtx.fillStyle = isCloseToWhite(entity.color) ? 'black' : 'white';
          resultCtx.fillText(text, x, startY);

          // Increment y position for next line of text, subtracting the micro gap
          startY += textHeight + paddingTop * 2 - microGap;
        });
      } else if(entity.appearance === 'plain') {
        console.log('processing plain text entity', entity);

        const node = document.querySelector(`[data-ref="${entity.id}"]`);
        const textNodes = node.querySelectorAll('div');

        resultCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
        resultCtx.textBaseline = 'hanging';
        resultCtx.fillStyle = entity.color; // Set the text color from entity.color

        // Calculate the overall bounding box
        let maxWidth = 0;
        let totalHeight = 0;
        textNodes.forEach(textNode => {
          const text = textNode.textContent;
          const textMetrics = resultCtx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = entity.fontSize;

          if(textWidth > maxWidth) {
            maxWidth = textWidth;
          }
          totalHeight += textHeight;
        });

        // Calculate the initial y position for the bounding box
        let startY = entity.y;

        // Draw the text lines
        textNodes.forEach(textNode => {
          const text = textNode.textContent;
          const textMetrics = resultCtx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = entity.fontSize;

          // Calculate the x position based on the selected text alignment
          let x = entity.x;

          switch(entity.textAlign) {
            case 'left':
              x = entity.x;
              break;
            case 'center':
              x = entity.x + maxWidth / 2 - (textWidth / 2);
              break;
            case 'right':
              x = entity.x + maxWidth - textWidth;
              break;
          }

          // Draw the text shadow
          resultCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          resultCtx.shadowOffsetX = 0;
          resultCtx.shadowOffsetY = 0;
          resultCtx.shadowBlur = 4;

          // Draw the text
          resultCtx.fillText(text, x, startY);

          // Disable shadow for next operations
          resultCtx.shadowColor = 'transparent';
          resultCtx.shadowBlur = 0;

          // Increment y position for next line of text
          startY += textHeight;
        });
      } else if(entity.appearance === 'border') {
        console.log('processing plain text entity', entity);

        const node = document.querySelector(`[data-ref="${entity.id}"]`);
        const textNodes = node.querySelectorAll('div');

        resultCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
        resultCtx.textBaseline = 'hanging';
        resultCtx.fillStyle = entity.color; // Set the text color to white

        // Calculate the overall bounding box
        let maxWidth = 0;
        let totalHeight = 0;
        textNodes.forEach(textNode => {
          const text = textNode.textContent;
          const textMetrics = resultCtx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = entity.fontSize;

          if(textWidth > maxWidth) {
            maxWidth = textWidth;
          }
          totalHeight += textHeight;
        });

        // Calculate the initial y position for the bounding box
        let startY = entity.y;

        // Draw the text lines with stroke
        textNodes.forEach(textNode => {
          const text = textNode.textContent;
          const textMetrics = resultCtx.measureText(text);
          const textWidth = textMetrics.width;
          const textHeight = entity.fontSize;

          // Calculate the x position based on the selected text alignment
          let x = entity.x;

          switch(entity.textAlign) {
            case 'left':
              x = entity.x;
              break;
            case 'center':
              x = entity.x + maxWidth / 2 - (textWidth / 2);
              break;
            case 'right':
              x = entity.x + maxWidth - textWidth;
              break;
          }

          // Draw the text stroke
          // resultCtx.strokeStyle = entity.color;
          resultCtx.strokeStyle = '#000';
          resultCtx.lineWidth = 5;
          resultCtx.strokeText(text, x, startY);

          // Draw the white text
          resultCtx.fillText(text, x, startY);

          // Disable shadow for next operations
          resultCtx.shadowColor = 'transparent';
          resultCtx.shadowBlur = 0;

          // Increment y position for next line of text
          startY += textHeight;
        });
      }
    }
  });

  // ???
  // Draw the resulting image back onto the result canvas
  // const context = imageLayerCanvas.getContext('2d');
  // context.clearRect(0, 0, imageLayerCanvas.width, imageLayerCanvas.height);
  // context.drawImage(resultCanvas, 0, 0);

  const renderAnimatedSticker = async() => {
    const stickers = state.entities.filter(item => item.type === 'sticker');

    const captureFrames = (stickerCanvas: HTMLCanvasElement, duration: number, fps: number) => {
      return new Promise<ImageBitmap[]>((resolve) => {
        const capturedFrames: ImageBitmap[] = [];
        let framesCaptured = 0;
        const captureInterval = 1000 / fps; // Interval in milliseconds

        const captureFrame = () => {
          if(framesCaptured >= (duration / captureInterval)) {
            resolve(capturedFrames);
            return;
          }
          stickerCanvas.toBlob((blob) => {
            createImageBitmap(blob).then((bitmap) => {
              capturedFrames.push(bitmap);
              framesCaptured++;
              setTimeout(captureFrame, captureInterval);
            });
          });
        };

        captureFrame();
      });
    };

    const createVideoFromFrames = (frames: ImageBitmap[], fps: number) => {
      return new Promise<Blob>((resolve) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if(!context) {
          throw new Error('Failed to get 2D context');
        }

        canvas.width = frames[0].width;
        canvas.height = frames[0].height;

        const stream = canvas.captureStream();
        const recordedBlobs: Blob[] = [];
        const options = {mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'};
        let mediaRecorder: MediaRecorder;

        try {
          mediaRecorder = new MediaRecorder(stream, options);
        } catch(e0) {
          console.error('Exception while creating MediaRecorder:', e0);
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

        let frameIndex = 0;
        const drawNextFrame = () => {
          if(frameIndex >= frames.length) {
            mediaRecorder.stop();
            return;
          }
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(frames[frameIndex], 0, 0);
          frameIndex++;
          setTimeout(drawNextFrame, 1000 / fps);
        };

        drawNextFrame();
      });
    };

    const captureAllStickerFrames = async(stickers: any) => {
      const promises = stickers.map((sticker: any) => {
        const stickerCanvas = sticker.container.querySelector('canvas');

        debugger;

        return captureFrames(stickerCanvas, 3000, 24);
      });
      return Promise.all(promises);
    };

    const composeFramesWithBackground = (backgroundCtx: any, stickerFrames: any, stickers: any) => {
      const framesWithBackground = [];

      for(let i = 0; i < stickerFrames[0].length; i++) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = backgroundCtx.canvas.width;
        tempCanvas.height = backgroundCtx.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the background
        tempCtx.drawImage(backgroundCtx.canvas, 0, 0);

        // Draw each sticker frame at its respective position
        stickers.forEach((sticker: any, index: number) => {
          const frame = stickerFrames[index][i];
          tempCtx.drawImage(frame, sticker.x, sticker.y);
        });

        // Convert the result to an ImageBitmap and store it
        framesWithBackground.push(tempCanvas);
      }

      return framesWithBackground;
    };

    const imageLayerCanvasCtx = imageLayerCanvas.getContext('2d');

    const stickerFrames = await captureAllStickerFrames(stickers);
    const framesWithBackgroundCanvases = composeFramesWithBackground(imageLayerCanvasCtx, stickerFrames, stickers);

    // Convert canvases to ImageBitmap
    const framesWithBackgroundPromises = framesWithBackgroundCanvases.map(canvas => {
      return new Promise<ImageBitmap>((resolve) => {
        canvas.toBlob((blob) => {
          createImageBitmap(blob).then((bitmap) => {
            resolve(bitmap);
          });
        });
      });
    });

    const framesWithBackground = await Promise.all(framesWithBackgroundPromises);

    createVideoFromFrames(framesWithBackground, 60).then((videoBlob) => {
      const url = window.URL.createObjectURL(videoBlob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'recorded.mp4';
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      console.log('Frames with background:', framesWithBackground);
      console.log('Stickers:', stickers);
    });
  };

  const renderAnimatedStickerFromVideo = async() => {
    const stickers = state.entities.filter(item => item.type === 'sticker');

    const captureFramesFromVideo = (videoElement: HTMLVideoElement, duration: number, fps: number) => {
      return new Promise((resolve) => {
        const capturedFrames: any = [];
        let framesCaptured = 0;
        const captureInterval = 1000 / fps; // Interval in milliseconds

        const captureFrame = async() => {
          if(framesCaptured >= (duration / captureInterval)) {
            resolve(capturedFrames);
            return;
          }

          const canvas = document.createElement('canvas');
          canvas.width = 200;
          canvas.height = 200;
          const context = canvas.getContext('2d');

          context.drawImage(videoElement, 0, 0, videoElement.videoWidth, videoElement.videoHeight, 0, 0, canvas.width, canvas.height);
          const blob = await new Promise(resolve => canvas.toBlob(resolve));
          const bitmap = await createImageBitmap(blob as any);

          capturedFrames.push(bitmap);
          framesCaptured++;

          videoElement.requestVideoFrameCallback(captureFrame);
        };

        videoElement.currentTime = 0;
        videoElement.play();
        videoElement.requestVideoFrameCallback(captureFrame);
      });
    };

    const createVideoFromFrames = (frames: ImageBitmap[], fps: number) => {
      return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if(!context) {
          throw new Error('Failed to get 2D context');
        }

        canvas.width = frames[0].width;
        canvas.height = frames[0].height;

        const stream = canvas.captureStream();
        const recordedBlobs: any = [];
        const options = {mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'};
        let mediaRecorder: any;

        try {
          mediaRecorder = new MediaRecorder(stream, options);
        } catch(e0) {
          console.error('Exception while creating MediaRecorder:', e0);
          return;
        }

        mediaRecorder.onstop = (event: any) => {
          console.log('Recorder stopped:', event);
          const superBuffer = new Blob(recordedBlobs, {type: 'video/mp4'});
          resolve(superBuffer);
        };

        mediaRecorder.ondataavailable = (event: any) => {
          if(event.data && event.data.size > 0) {
            recordedBlobs.push(event.data);
          }
        };

        mediaRecorder.start();

        let frameIndex = 0;
        const drawNextFrame = () => {
          if(frameIndex >= frames.length) {
            mediaRecorder.stop();
            return;
          }
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(frames[frameIndex], 0, 0);
          frameIndex++;
          setTimeout(drawNextFrame, 1000 / fps);
        };

        drawNextFrame();
      });
    };

    const captureAllStickerFrames = async(stickers: any) => {
      const promises = stickers.map((sticker: any) => {
        const videoElement = sticker.container.querySelector('video');
        return captureFramesFromVideo(videoElement, 3000, 60);
      });
      return Promise.all(promises);
    };

    const composeFramesWithBackground = (backgroundCtx: CanvasRenderingContext2D, stickerFrames: ImageBitmap[][], stickers: StickerEntityType[]) => {
      const framesWithBackground = [];

      for(let i = 0; i < stickerFrames[0].length; i++) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = backgroundCtx.canvas.width;
        tempCanvas.height = backgroundCtx.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the background
        tempCtx.drawImage(backgroundCtx.canvas, 0, 0);

        // Draw each sticker frame at its respective position
        stickers.forEach((sticker, index) => {
          const frame = stickerFrames[index][i];
          tempCtx.drawImage(frame, sticker.x, sticker.y, 200, 200);
        });

        // Convert the result to an ImageBitmap and store it
        framesWithBackground.push(tempCanvas);
      }

      return framesWithBackground;
    };

    const imageLayerCanvasCtx = imageLayerCanvas.getContext('2d');

    if(imageLayerCanvasCtx) {
      const stickerFrames = await captureAllStickerFrames(stickers);
      const framesWithBackgroundCanvases = composeFramesWithBackground(imageLayerCanvasCtx, stickerFrames, stickers as any);

      // Convert canvases to ImageBitmap
      const framesWithBackgroundPromises = framesWithBackgroundCanvases.map(canvas => {
        return new Promise((resolve) => {
          canvas.toBlob((blob) => {
            createImageBitmap(blob).then((bitmap) => {
              resolve(bitmap);
            });
          });
        });
      });

      const framesWithBackground = await Promise.all(framesWithBackgroundPromises) as any;

      createVideoFromFrames(framesWithBackground, 24).then((videoBlob: any) => {
        const url = window.URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'recorded.mp4';
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);

        console.log('Frames with background:', framesWithBackground);
        console.log('Stickers:', stickers);
      });
    }
  };

  const renderImageSticker = async(sticker: StickerEntityType) => {
    const image = sticker.container.querySelector('img');

    try {
      // Load the image from the blob URL
      const imageUrl = image.src;
      const img = new Image();
      img.src = imageUrl;

      // Ensure the image is fully loaded before rendering
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      // Draw the image to the canvas using the coordinates from the sticker entity
      resultCtx.drawImage(
        img,
        sticker.x,
        sticker.y,
        sticker.width === 'auto' ? img.width : sticker.width,
        sticker.height === 'auto' ? img.height : sticker.height
      );

      console.log('==============================');
      console.log('img.width: ', img.width, 'img.height: ', img.height);
      console.log('sticker.width: ', sticker.width, 'sticker.height: ', sticker.height);
      console.log('==============================');
    } catch(error) {
      console.error('Failed to load or render image:', error);
    }
  };

  if(state.entities.some(entity => entity.type === 'sticker')) {
    // await renderVideo();

    const staticStickers = state.entities.filter(entity => {
      if(isStickerEntity(entity)) {
        return entity.stickerType === 1;
      };

      return false;
    });

    const animatedStickers = state.entities.filter(entity => {
      if(isStickerEntity(entity)) {
        return entity.stickerType === 2;
      };

      return false;
    });


    const t0 = performance.now();

    console.log('staticStickers: ', staticStickers);

    if(staticStickers.length > 0) {
      for(const sticker of staticStickers) {
        await renderImageSticker(sticker as StickerEntityType);
      }
    }

    if(animatedStickers.length > 0) {
      await renderAnimatedSticker();
    }

    const t1 = performance.now();

    console.log(`Call to renderAnimatedStickerFromVideo took ${t1 - t0} milliseconds.`);


    // resultCanvas.toBlob(async(blob) => {
    //   const dataUrl = await readBlobAsDataURL(blob);
    //   const downloadLink = document.createElement('a');
    //   // @ts-ignore
    //   downloadLink.href = dataUrl;
    //   downloadLink.download = 'result-image.png';
    //   downloadLink.click();
    // }, 'image/png');

    // console.log('state.entities: ');
  } else {
    // Convert the result canvas to a Blob and create a download link
    resultCanvas.toBlob(async(blob) => {
      const dataUrl = await readBlobAsDataURL(blob);
      const downloadLink = document.createElement('a');
      // @ts-ignore
      downloadLink.href = dataUrl;
      downloadLink.download = 'result-image.png';
      downloadLink.click();
    }, 'image/png');
  };
};

export {};
