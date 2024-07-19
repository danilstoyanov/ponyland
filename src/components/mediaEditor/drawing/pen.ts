import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

export class PenTool implements DrawingTool {
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

    ctx.beginPath();
    ctx.moveTo(pt0.x, pt0.y);

    for(let j = startIndex; j < lastLength; j++) {
      const pt = workingStrokes[j];
      ctx.lineTo(pt.x, pt.y);
    }

    ctx.stroke();
  }
}

