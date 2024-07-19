import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

export class NeonTool implements DrawingTool {
  public init({ctx, color, size}: DrawingToolMethodParams) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.update({ctx, color, size});
  }

  public update({ctx, color, size}: DrawingToolMethodParams) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
  }

  public draw({ctx, strokes}: DrawingContext) {
    // Setup context for neon effect
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw each stroke with neon effect
    for(let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];

      // Apply neon effect to the latest stroke only
      if(i === strokes.length - 1 && stroke.length > 1) {
        // Setup neon effect with increased shadow opacity
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(98, 229, 224, 0.8)'; // Higher opacity cyan shadow
      } else {
        // Reset shadow effect for previous strokes
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
      }

      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      for(let j = 1; j < stroke.length; j++) {
        ctx.lineTo(stroke[j].x, stroke[j].y);
      }
      ctx.stroke();
    }
  }
}
