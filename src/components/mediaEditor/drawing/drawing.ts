export interface DrawingContext {
  drawingCtx: CanvasRenderingContext2D;
  imageCtx: CanvasRenderingContext2D;
  strokes: { x: number; y: number }[][];
  workingStrokes: { x: number; y: number }[];
  lastLength: number;
}

export type DrawingToolMethodParams = {
  drawingCtx: CanvasRenderingContext2D;
  imageCtx: CanvasRenderingContext2D;
  color: string;
  size: number;
}

export interface DrawingTool {
  init(params: DrawingToolMethodParams): void;
  update(params: DrawingToolMethodParams): void;
  draw(params: Partial<DrawingContext>): void;
  drawOnStart?(params: Partial<DrawingContext>): void;
  drawOnEnd?(params: Partial<DrawingContext>): void;
}

export class DrawingManager {
  private drawingCanvas: HTMLCanvasElement;
  private drawingCanvasCtx: CanvasRenderingContext2D;
  private imageCanvas: HTMLCanvasElement;
  private imageCanvasCtx: CanvasRenderingContext2D;
  private strokes: { x: number; y: number }[][];
  private workingStrokes: { x: number; y: number }[];
  private lastLength: number;
  private isTouching: boolean;
  private drawingTool: DrawingTool;

  private offsetX: number;
  private offsetY: number;
  private preview: HTMLDivElement;

  private boundStart: (event: MouseEvent) => void;
  private boundMove: (event: MouseEvent) => void;
  private boundEnd: (event: MouseEvent) => void;

  constructor(drawingCanvas: HTMLCanvasElement, imageCanvas: HTMLCanvasElement, preview: HTMLDivElement) {
    this.drawingCanvas = drawingCanvas;
    this.imageCanvas = imageCanvas;

    this.drawingCanvasCtx = drawingCanvas.getContext('2d');
    this.imageCanvasCtx = imageCanvas.getContext('2d');

    this.strokes = [];
    this.workingStrokes = [];
    this.lastLength = 0;
    this.isTouching = false;
    this.preview = preview;

    this._updateOffsets();

    this.boundStart = this._start.bind(this);
    this.boundMove = this._move.bind(this);
    this.boundEnd = this._end.bind(this);
  }

  private _updateOffsets() {
    this.offsetX = this.preview.offsetLeft;
    this.offsetY = this.preview.offsetTop;
  }

  activate(drawingTool: DrawingTool, color: string, size: number) {
    this._updateOffsets();
    this.drawingTool = drawingTool;
    this.drawingTool.init({
      drawingCtx: this.drawingCanvasCtx,
      imageCtx: this.imageCanvasCtx,
      color,
      size
    });
    this._initEvents();
  }

  deactivate() {
    this.drawingTool = null;
    this._removeEvents();
    this._resetContext();
  }

  update({color, size}: Partial<{ color: string, size: number }>) {
    this.drawingTool.update({
      drawingCtx: this.drawingCanvasCtx,
      imageCtx: this.imageCanvasCtx,
      color,
      size
    });
  }

  private _start(event: MouseEvent) {
    const x = event.clientX - this.offsetX;
    const y = event.clientY - this.offsetY;
    this.workingStrokes = [{x, y}];
    this.strokes.push(this.workingStrokes);
    this.lastLength = 1;
    this.isTouching = true;
    requestAnimationFrame(this._draw.bind(this));

    if(this.drawingTool.drawOnStart) {
      this.drawingTool.drawOnStart({
        imageCtx: this.imageCanvasCtx,
        drawingCtx: this.drawingCanvasCtx,
        workingStrokes: this.workingStrokes
      });
    }
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
        imageCtx: this.imageCanvasCtx,
        drawingCtx: this.drawingCanvasCtx,
        workingStrokes: this.workingStrokes
      });
    }
  }

  private _initEvents() {
    this.drawingCanvas.addEventListener('mousedown', this.boundStart);
    this.drawingCanvas.addEventListener('mousemove', this.boundMove);
    this.drawingCanvas.addEventListener('mouseup', this.boundEnd);
  }

  private _resetContext() {
    this.drawingCanvasCtx.strokeStyle = '#000';
    this.drawingCanvasCtx.lineWidth = 1;
    this.drawingCanvasCtx.lineCap = 'butt';
    this.drawingCanvasCtx.lineJoin = 'miter';
  }

  private _removeEvents() {
    this.drawingCanvas.removeEventListener('mousedown', this.boundStart);
    this.drawingCanvas.removeEventListener('mousemove', this.boundMove);
    this.drawingCanvas.removeEventListener('mouseup', this.boundEnd);
  }

  private _draw() {
    this.drawingTool.draw({
      drawingCtx: this.drawingCanvasCtx,
      imageCtx: this.imageCanvasCtx,
      strokes: this.strokes,
      workingStrokes: this.workingStrokes,
      lastLength: this.lastLength
    });
  }
}
