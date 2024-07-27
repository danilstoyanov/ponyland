import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';
import {hexToRgb} from '../../../helpers/color';

export class NeonTool implements DrawingTool {
  private color: string;
  private size: number;

  public init({drawingCtx, imageCtx, color, size}: DrawingToolMethodParams) {
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';

    this.update({drawingCtx, imageCtx, color, size});
  }

  public update({drawingCtx, color, size}: DrawingToolMethodParams) {
    this.color = color;
    this.size = size;
    drawingCtx.strokeStyle = color;
    drawingCtx.fillStyle = color;
    drawingCtx.lineWidth = size;
  }

  public draw({drawingCtx, workingStrokes}: Partial<DrawingContext>) {
    if(!drawingCtx || !workingStrokes || workingStrokes.length < 2) return;

    drawingCtx.save();

    const layers = [
      {shadowBlur: 20, shadowColor: this._getShadowColor(this.color, 0.2), lineWidth: this.size + 10},
      {shadowBlur: 15, shadowColor: this._getShadowColor(this.color, 0.4), lineWidth: this.size + 5},
      {shadowBlur: 10, shadowColor: this._getShadowColor(this.color, 0.6), lineWidth: this.size + 3}
    ];

    layers.forEach(layer => {
      drawingCtx.lineWidth = layer.lineWidth;
      drawingCtx.shadowBlur = layer.shadowBlur;
      drawingCtx.shadowColor = layer.shadowColor;
      drawingCtx.strokeStyle = this.color;
      drawingCtx.beginPath();
      drawingCtx.moveTo(workingStrokes[0].x, workingStrokes[0].y);
      for(let i = 1; i < workingStrokes.length; i++) {
        drawingCtx.lineTo(workingStrokes[i].x, workingStrokes[i].y);
      }
      drawingCtx.stroke();
    });

    drawingCtx.lineWidth = this.size;
    drawingCtx.shadowBlur = 0;
    drawingCtx.strokeStyle = '#fff';
    drawingCtx.beginPath();
    drawingCtx.moveTo(workingStrokes[0].x, workingStrokes[0].y);
    for(let i = 1; i < workingStrokes.length; i++) {
      drawingCtx.lineTo(workingStrokes[i].x, workingStrokes[i].y);
    }
    drawingCtx.stroke();

    drawingCtx.restore();
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
