import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';
import {hexToRgb} from '../../../helpers/color';

export class NeonTool implements DrawingTool {
  private color: string;
  private size: number;

  public init({ctx, color, size}: DrawingToolMethodParams) {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    this.update({ctx, color, size});
  }

  public update({ctx, color, size}: DrawingToolMethodParams) {
    this.color = color;
    this.size = size;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
  }

  public draw({ctx, workingStrokes}: Partial<DrawingContext>) {
    if(!ctx || !workingStrokes || workingStrokes.length < 2) return;

    ctx.save();

    const layers = [
      {shadowBlur: 20, shadowColor: this._getShadowColor(this.color, 0.2), lineWidth: this.size + 10},
      {shadowBlur: 15, shadowColor: this._getShadowColor(this.color, 0.4), lineWidth: this.size + 5},
      {shadowBlur: 10, shadowColor: this._getShadowColor(this.color, 0.6), lineWidth: this.size + 3}
    ];

    layers.forEach(layer => {
      ctx.lineWidth = layer.lineWidth;
      ctx.shadowBlur = layer.shadowBlur;
      ctx.shadowColor = layer.shadowColor;
      ctx.strokeStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(workingStrokes[0].x, workingStrokes[0].y);
      for(let i = 1; i < workingStrokes.length; i++) {
        ctx.lineTo(workingStrokes[i].x, workingStrokes[i].y);
      }
      ctx.stroke();
    });

    ctx.lineWidth = this.size;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(workingStrokes[0].x, workingStrokes[0].y);
    for(let i = 1; i < workingStrokes.length; i++) {
      ctx.lineTo(workingStrokes[i].x, workingStrokes[i].y);
    }
    ctx.stroke();

    ctx.restore();
  }

  private _getShadowColor(color: string, opacity: number): string {
    const [r, g, b] = this._colorToRgb(color);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }

  private _colorToRgb(color: string): [number, number, number] {
    if(color.startsWith('#')) {
      return hexToRgb(color);
    } else if(color.startsWith('rgb')) {
      return this._rgbStringToRgb(color);
    }
    throw new Error(`Unsupported color format: ${color}`);
  }

  private _rgbStringToRgb(rgb: string): [number, number, number] {
    const result = rgb.match(/\d+/g);
    if(!result) throw new Error(`Invalid rgb format: ${rgb}`);
    const [r, g, b] = result.map(Number);
    return [r, g, b];
  }
}
