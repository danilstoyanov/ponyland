import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

export class BrushTool implements DrawingTool {
  public init({ctx, color, size}: DrawingToolMethodParams) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.update({ctx, color, size});
  }

  public update({ctx, color, size}: DrawingToolMethodParams) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
  }

  public draw({
    ctx,
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

      ctx.beginPath();
      ctx.moveTo(pt0.x + offsetX, pt0.y + offsetY);

      for(let j = startIndex; j < lastLength; j++) {
        const pt = workingStrokes[j];
        ctx.lineTo(pt.x + offsetX, pt.y + offsetY);
      }

      ctx.stroke();
    }
  }
}
