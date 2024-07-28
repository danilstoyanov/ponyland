/**
 * I couldn't finish this tool due to the hard deadlines, but I though it would be a good idea
 * to implemenet similar kind of algorithm which guys from Canva app use for applying this kind of blur 🤔
 * https://www.canva.com/features/photo-blur/
 */

import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

export class BlurTool implements DrawingTool {
  private size: number;

  public init({drawingCtx, imageCtx, color, size}: DrawingToolMethodParams) {
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';
    this.size = size;

    this.update({drawingCtx, imageCtx, color, size});
  }

  public update({drawingCtx, color, size}: DrawingToolMethodParams) {
    drawingCtx.strokeStyle = color;
    drawingCtx.lineWidth = size;
    this.size = size;
  }

  public drawOnStart({drawingCtx, workingStrokes}: DrawingContext) {
    if(workingStrokes.length === 0) {
      return;
    }

    const pt0 = workingStrokes[0];

    drawingCtx.beginPath();
    drawingCtx.moveTo(pt0.x, pt0.y);
    drawingCtx.lineTo(pt0.x, pt0.y);
    drawingCtx.stroke();
  }

  public draw({drawingCtx, lastLength, workingStrokes}: DrawingContext) {
    const length = workingStrokes.length;

    if(length <= lastLength) {
      return;
    }

    const startIndex = lastLength - 1;
    lastLength = length;

    const pt0 = workingStrokes[startIndex];

    drawingCtx.beginPath();
    drawingCtx.moveTo(pt0.x, pt0.y);

    for(let j = startIndex; j < length; j++) {
      const pt = workingStrokes[j];
      drawingCtx.lineTo(pt.x, pt.y);
    }

    drawingCtx.stroke();
  }

  public drawOnEnd({drawingCtx, imageCtx, workingStrokes}: DrawingContext) {
    let minX = Number.MAX_VALUE;
    let minY = Number.MAX_VALUE;
    let maxX = Number.MIN_VALUE;
    let maxY = Number.MIN_VALUE;

    const halfSize = this.size / 2;

    for(const point of workingStrokes) {
      if(point.x < minX) minX = point.x;
      if(point.y < minY) minY = point.y;
      if(point.x > maxX) maxX = point.x;
      if(point.y > maxY) maxY = point.y;
    }

    minX -= halfSize;
    minY -= halfSize;
    maxX += halfSize;
    maxY += halfSize;

    const rectWidth = maxX - minX;
    const rectHeight = maxY - minY;

    const imageCtxImageData = imageCtx.getImageData(minX, minY, rectWidth, rectHeight);

    const offScreenCanvasBlurred = document.createElement('canvas');
    offScreenCanvasBlurred.width = rectWidth;
    offScreenCanvasBlurred.height = rectHeight;
    const offScreenCtxBlurred = offScreenCanvasBlurred.getContext('2d');

    const offScreenCanvasBrush = document.createElement('canvas');
    offScreenCanvasBrush.width = rectWidth;
    offScreenCanvasBrush.height = rectHeight;
    const offScreenCtxBrush = offScreenCanvasBrush.getContext('2d');

    const offScreenCanvasCombined = document.createElement('canvas');
    offScreenCanvasCombined.width = rectWidth;
    offScreenCanvasCombined.height = rectHeight;
    const offScreenCtxCombined = offScreenCanvasCombined.getContext('2d');

    offScreenCtxBlurred.putImageData(imageCtxImageData, 0, 0);
    offScreenCtxBlurred.filter = 'blur(10px)';
    offScreenCtxBlurred.drawImage(offScreenCanvasBlurred, 0, 0);

    offScreenCtxBrush.strokeStyle = drawingCtx.strokeStyle;
    offScreenCtxBrush.lineWidth = drawingCtx.lineWidth;
    offScreenCtxBrush.lineCap = drawingCtx.lineCap;
    offScreenCtxBrush.lineJoin = drawingCtx.lineJoin;

    offScreenCtxBrush.beginPath();
    const pt0 = workingStrokes[0];
    offScreenCtxBrush.moveTo(pt0.x - minX, pt0.y - minY);

    for(let j = 1; j < workingStrokes.length; j++) {
      const pt = workingStrokes[j];
      offScreenCtxBrush.lineTo(pt.x - minX, pt.y - minY);
    }
    offScreenCtxBrush.stroke();

    drawingCtx.clearRect(minX, minY, rectWidth, rectHeight);

    offScreenCtxCombined.drawImage(offScreenCanvasBlurred, 0, 0);
    offScreenCtxCombined.globalCompositeOperation = 'destination-in';
    offScreenCtxCombined.drawImage(offScreenCanvasBrush, 0, 0);

    drawingCtx.globalCompositeOperation = 'darken';
    drawingCtx.drawImage(offScreenCanvasCombined, minX, minY);
  }
}
