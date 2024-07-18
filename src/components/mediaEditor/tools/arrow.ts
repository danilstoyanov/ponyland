function drawArrowhead(context: any, stroke: any) {
  const minPoints = 10;
  const maxPoints = 20;
  const numPoints = Math.min(Math.max(stroke.length - 1, minPoints), maxPoints);

  if(stroke.length < 2) return; // Need at least two points to draw an arrowhead

  // Get the last N points
  const points = stroke.slice(-numPoints);
  const end = points[points.length - 1];
  let sumX = 0;
  let sumY = 0;

  // Calculate average direction
  for(let i = 0; i < points.length - 1; i++) {
    sumX += points[i + 1].x - points[i].x;
    sumY += points[i + 1].y - points[i].y;
  }

  const averageDirectionX = sumX / (points.length - 1);
  const averageDirectionY = sumY / (points.length - 1);
  const θ = Math.atan2(averageDirectionY, averageDirectionX);

  const height = 50;
  const base = 15;
  const α = Math.PI / 2 - θ;

  const ΔQ = {x: base * Math.cos(α), y: base * Math.sin(α)};
  const Q = {x: end.x - ΔQ.x, y: end.y + ΔQ.y};
  const S = {x: end.x + ΔQ.x, y: end.y - ΔQ.y};

  const ΔR = {x: height * Math.cos(θ), y: height * Math.sin(θ)};
  const R = {x: end.x + ΔR.x, y: end.y + ΔR.y};

  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(Q.x, Q.y);
  context.lineTo(R.x, R.y);
  context.lineTo(S.x, S.y);
  context.closePath();
  context.fill();
}

export class PrimitiveArrow {
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
    this.ctx.strokeStyle = '#62e5e0';
    this.ctx.fillStyle = '#62e5e0';
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
    this._drawArrowCap();
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

    this.ctx.beginPath();
    this.ctx.moveTo(pt0.x, pt0.y);

    for(let j = startIndex; j < this.lastLength; j++) {
      const pt = this.workingStrokes[j];
      this.ctx.lineTo(pt.x, pt.y);
    }

    this.ctx.stroke();
  }

  /**
   * Draw an arrow cap at the end of the stroke
   */
  private _drawArrowCap() {
    if(this.workingStrokes.length < 2) {
      return;
    }

    drawArrowhead(this.ctx, this.workingStrokes);
  }
}
