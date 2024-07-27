import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

export class EraserTool implements DrawingTool {
  public init({drawingCtx, size}: DrawingToolMethodParams) {
    drawingCtx.lineWidth = size;
    this.update({drawingCtx, size});
  }

  public update({drawingCtx, size}: Partial<DrawingToolMethodParams>) {
    drawingCtx.lineWidth = size;
  }

  public draw({
    drawingCtx,
    lastLength,
    workingStrokes
  }: DrawingContext) {
    const length = workingStrokes.length;

    if(length <= lastLength) {
      return;
    }

    const startIndex = lastLength - 1;
    lastLength = length;

    const pt0 = workingStrokes[startIndex];

    drawingCtx.globalCompositeOperation = 'destination-out';
    drawingCtx.beginPath();
    drawingCtx.moveTo(pt0.x, pt0.y);

    for(let j = startIndex; j < lastLength; j++) {
      const pt = workingStrokes[j];
      drawingCtx.lineTo(pt.x, pt.y);
    }

    drawingCtx.stroke();
    drawingCtx.globalCompositeOperation = 'source-over';
  }
}
