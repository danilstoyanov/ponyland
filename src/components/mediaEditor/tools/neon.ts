export class PrimitiveNeon {
  private ctx: CanvasRenderingContext2D;
  private strokes: {x: number; y: number}[][];
  private workingStrokes: {x: number; y: number}[];
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
    this.ctx.strokeStyle = '#ffc0cb';
    this.ctx.fillStyle = '#ffc0cb';
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
    // Setup context for neon effect
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 10;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Draw each stroke with neon effect
    for(let i = 0; i < this.strokes.length; i++) {
      const stroke = this.strokes[i];

      // Apply neon effect to the latest stroke only
      if(i === this.strokes.length - 1 && stroke.length > 1) {
        // Setup neon effect with increased shadow opacity
        this.ctx.shadowBlur = 6;
        this.ctx.shadowColor = 'rgba(98, 229, 224, 0.8)'; // Higher opacity cyan shadow
      } else {
        // Reset shadow effect for previous strokes
        this.ctx.shadowBlur = 0;
        this.ctx.shadowColor = 'transparent';
      }

      this.ctx.beginPath();
      this.ctx.moveTo(stroke[0].x, stroke[0].y);
      for(let j = 1; j < stroke.length; j++) {
        this.ctx.lineTo(stroke[j].x, stroke[j].y);
      }
      this.ctx.stroke();
    }
  }
}
