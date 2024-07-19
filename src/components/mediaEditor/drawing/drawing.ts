export interface DrawingContext {
  ctx: CanvasRenderingContext2D;
  strokes: {x: number; y: number}[][];
  workingStrokes: {x: number; y: number}[];
  lastLength: number;
}

export type DrawingToolMethodParams = {
  ctx: CanvasRenderingContext2D;
  color: string;
  size: number;
}

export interface DrawingTool {
  init(params: DrawingToolMethodParams): void;
  update(params: DrawingToolMethodParams): void;
  draw(params: Partial<DrawingContext>): void;
  drawOnEnd?(params: Partial<DrawingContext>): void;
}

export class DrawingManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strokes: {x: number; y: number}[][];
  private workingStrokes: {x: number; y: number}[];
  private lastLength: number;
  private isTouching: boolean;
  private drawingTool: DrawingTool;

  private offsetX: number;
  private offsetY: number;

  constructor(canvas: HTMLCanvasElement, preview: HTMLDivElement) {
    this.offsetX = preview.offsetLeft;
    this.offsetY = preview.offsetTop;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.strokes = [];
    this.workingStrokes = [];
    this.lastLength = 0;
    this.isTouching = false;
  }

  activate(drawingTool: DrawingTool, color: string, size: number) {
    this.drawingTool = drawingTool;
    this.drawingTool.init({ctx: this.ctx, color, size});
    this._initEvents();
  }

  deactivate() {
    this.drawingTool = null;
    this._removeEvents();
    this._resetContext();
  }

  update({color, size}: Partial<{color: string, size: number}>) {
    this.drawingTool.update({ctx: this.ctx, color, size});
  }

  private _start(event: MouseEvent) {
    const x = event.clientX - this.offsetX;
    const y = event.clientY - this.offsetY;
    this.workingStrokes = [{x, y}];
    this.strokes.push(this.workingStrokes);
    this.lastLength = 1;
    this.isTouching = true;
    requestAnimationFrame(this._draw.bind(this));
  }

  private _move(event: MouseEvent) {
    if(!this.isTouching) {
      return;
    }
    const x = event.clientX - this.offsetX;
    const y = event.clientY - this.offsetY;

    this.workingStrokes.push({x, y});
    requestAnimationFrame(this._draw.bind(this));
  }

  private _end(event: MouseEvent) {
    this._move(event);
    this.isTouching = false;

    if(this.drawingTool.drawOnEnd) {
      this.drawingTool.drawOnEnd({
        ctx: this.ctx,
        workingStrokes: this.workingStrokes
      });
    }
  }

  private _initEvents() {
    this.canvas.addEventListener('mousedown', this._start.bind(this));
    this.canvas.addEventListener('mousemove', this._move.bind(this));
    this.canvas.addEventListener('mouseup', this._end.bind(this));
  }

  private _resetContext() {
    this.ctx.strokeStyle = '#000'; // Default stroke color is black
    this.ctx.lineWidth = 1; // Default line width is 1 pixel
    this.ctx.lineCap = 'butt'; // Default line cap is 'butt'
    this.ctx.lineJoin = 'miter'; // Default line join is 'miter'
  }

  private _removeEvents() {
    this.canvas.removeEventListener('mousedown', this._start);
    this.canvas.removeEventListener('mousemove', this._move);
    this.canvas.removeEventListener('mouseup', this._end);
  }

  private _draw() {
    this.drawingTool.draw({
      ctx: this.ctx,
      strokes: this.strokes,
      workingStrokes: this.workingStrokes,
      lastLength: this.lastLength
    });
  }
}
