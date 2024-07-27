import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

export class BrushTool implements DrawingTool {
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

    for(let i = 0; i < 5; i++) {
      const offsetX = [-4, -2, 0, 2, 4][i];
      const offsetY = [-4, -2, 0, 2, 4][i];

      drawingCtx.beginPath();
      drawingCtx.moveTo(pt0.x + offsetX, pt0.y + offsetY);

      for(let j = startIndex; j < lastLength; j++) {
        const pt = workingStrokes[j];
        drawingCtx.lineTo(pt.x + offsetX, pt.y + offsetY);
      }

      drawingCtx.stroke();
    }
  }
}
