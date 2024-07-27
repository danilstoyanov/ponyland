import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

export class PenTool implements DrawingTool {
  public init({drawingCtx, imageCtx, color, size}: DrawingToolMethodParams) {
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';

    this.update({drawingCtx, imageCtx, color, size});
  }

  public update({drawingCtx, color, size}: DrawingToolMethodParams) {
    drawingCtx.strokeStyle = color;
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

    drawingCtx.beginPath();
    drawingCtx.moveTo(pt0.x, pt0.y);

    for(let j = startIndex; j < lastLength; j++) {
      const pt = workingStrokes[j];
      drawingCtx.lineTo(pt.x, pt.y);
    }

    drawingCtx.stroke();
  }
}

