import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

export class EraserTool implements DrawingTool {
  public init({ctx, size}: DrawingToolMethodParams) {
    ctx.lineWidth = size;
    this.update({ctx, size});
  }

  public update({ctx, size}: Partial<DrawingToolMethodParams>) {
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

    // Set composite operation to erase
    ctx.globalCompositeOperation = 'destination-out';

    ctx.beginPath();
    ctx.moveTo(pt0.x, pt0.y);

    for(let j = startIndex; j < lastLength; j++) {
      const pt = workingStrokes[j];
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.stroke();

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
  }
}
