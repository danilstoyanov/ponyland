export class PrimitiveEraser {
  private ctx: CanvasRenderingContext2D;
  private strokes: { x: number; y: number }[][];
  private workingStrokes: { x: number; y: number }[];
  private lastLength: number;
  private isTouching: boolean;

  private offsetX: number;
  private offsetY: number;

  constructor(canvas: HTMLCanvasElement, preview: HTMLDivElement) {
    this.offsetX = preview.offsetLeft;
    this.offsetY = preview.offsetTop;

    this.ctx = canvas.getContext('2d');
    this.strokes = [];
    this.workingStrokes = [];
    this.lastLength = 0;
    this.isTouching = false;

    // Init context
    this.ctx.strokeStyle = '#f00';
    this.ctx.lineWidth = 10;
    this.ctx.lineCap = this.ctx.lineJoin = 'round';
  }

  /**
   * Begins a new stroke
   * @param  {MouseEvent} event
   */
  start(event: MouseEvent) {
    const x = event.clientX - this.offsetX;
    const y = event.clientY - this.offsetY;
    this.workingStrokes = [{x, y}];
    this.strokes.push(this.workingStrokes);
    this.lastLength = 1;
    this.isTouching = true;
    requestAnimationFrame(this._draw.bind(this));
  }

  /**
   * Moves the current position of our brush
   * @param  {MouseEvent} event
   */
  move(event: MouseEvent) {
    if(!this.isTouching) {
      return;
    }
    const x = event.clientX - this.offsetX;
    const y = event.clientY - this.offsetY;

    this.workingStrokes.push({x, y});
    requestAnimationFrame(this._draw.bind(this));
  }

  /**
   * Stops a stroke
   * @param  {MouseEvent} event
   */
  end(event: MouseEvent) {
    this.move(event);
    this.isTouching = false;
  }

  /**
   * Draw the stroke
   */
  private _draw() {
    const length = this.workingStrokes.length;

    if(length <= this.lastLength) {
      return;
    }

    const startIndex = this.lastLength - 1;
    this.lastLength = length;

    const pt0 = this.workingStrokes[startIndex];

    this.ctx.globalCompositeOperation = 'destination-out'; // Set composite operation to erase

    this.ctx.beginPath();
    this.ctx.moveTo(pt0.x, pt0.y);

    for(let j = startIndex; j < this.lastLength; j++) {
      const pt = this.workingStrokes[j];
      this.ctx.lineTo(pt.x, pt.y);
    }

    this.ctx.stroke();

    this.ctx.globalCompositeOperation = 'source-over'; // Reset composite operation
  }
}
