export interface DrawingContext {
  ctx: CanvasRenderingContext2D;
  strokes: {x: number; y: number}[][];
  workingStrokes: {x: number; y: number}[];
  lastLength: number;
}

export class DrawingManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private strokes: {x: number; y: number}[][];
  private workingStrokes: {x: number; y: number}[];
  private lastLength: number;
  private isTouching: boolean;
  private drawingTool: any;

  private offsetX: number;
  private offsetY: number;

  constructor(canvas: HTMLCanvasElement, preview: HTMLDivElement, drawingTool: any) {
    this.offsetX = preview.offsetLeft;
    this.offsetY = preview.offsetTop;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.strokes = [];
    this.workingStrokes = [];
    this.lastLength = 0;
    this.isTouching = false;

    this.drawingTool = drawingTool;
    this.drawingTool.init({ctx: this.ctx});

    this._initEvents();
  }

  start(event: MouseEvent) {
    const x = event.clientX - this.offsetX;
    const y = event.clientY - this.offsetY;
    this.workingStrokes = [{x, y}];
    this.strokes.push(this.workingStrokes);
    this.lastLength = 1;
    this.isTouching = true;
    requestAnimationFrame(this._draw.bind(this));
  }

  move(event: MouseEvent) {
    if(!this.isTouching) {
      return;
    }
    const x = event.clientX - this.offsetX;
    const y = event.clientY - this.offsetY;

    this.workingStrokes.push({x, y});
    requestAnimationFrame(this._draw.bind(this));
  }

  end(event: MouseEvent) {
    this.move(event);
    this.isTouching = false;
  }

  destroy() {
    this._removeEvents();
  }

  private _initEvents() {
    this.canvas.addEventListener('mousedown', this.start.bind(this));
    this.canvas.addEventListener('mousemove', this.move.bind(this));
    this.canvas.addEventListener('mouseup', this.end.bind(this));
  }

  private _removeEvents() {
    this.canvas.removeEventListener('mousedown', this.start.bind(this));
    this.canvas.removeEventListener('mousemove', this.move.bind(this));
    this.canvas.removeEventListener('mouseup', this.end.bind(this));
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
