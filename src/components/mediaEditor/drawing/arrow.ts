import type {DrawingContext, DrawingTool, DrawingToolMethodParams} from './drawing';

function drawArrowhead(
  context: DrawingContext['drawingCtx'],
  stroke: DrawingContext['workingStrokes'],
  brushSize: number
) {
  const minPoints = 10;
  const maxPoints = 20;
  const numPoints = Math.min(Math.max(stroke.length - 1, minPoints), maxPoints);

  if(stroke.length < 2) return;

  const points = stroke.slice(-numPoints);
  const end = points[points.length - 1];
  let sumX = 0;
  let sumY = 0;

  for(let i = 0; i < points.length - 1; i++) {
    sumX += points[i + 1].x - points[i].x;
    sumY += points[i + 1].y - points[i].y;
  }

  const averageDirectionX = sumX / (points.length - 1);
  const averageDirectionY = sumY / (points.length - 1);
  const theta = Math.atan2(averageDirectionY, averageDirectionX);

  const height = 50 * brushSize / 10;
  const base = 15 * brushSize / 10;
  const alpha = Math.PI / 2 - theta;

  const deltaQ = {x: base * Math.cos(alpha), y: base * Math.sin(alpha)};
  const Q = {x: end.x - deltaQ.x, y: end.y + deltaQ.y};
  const S = {x: end.x + deltaQ.x, y: end.y - deltaQ.y};

  const deltaR = {x: height * Math.cos(theta), y: height * Math.sin(theta)};
  const R = {x: end.x + deltaR.x, y: end.y + deltaR.y};

  context.beginPath();
  context.moveTo(end.x, end.y);
  context.lineTo(Q.x, Q.y);
  context.lineTo(R.x, R.y);
  context.lineTo(S.x, S.y);
  context.closePath();
  context.fill();
}

export class ArrowTool implements DrawingTool {
  public init({drawingCtx, color, size}: DrawingToolMethodParams) {
    drawingCtx.strokeStyle = color;
    drawingCtx.fillStyle = color;
    drawingCtx.lineWidth = size;
    drawingCtx.lineCap = 'round';
    drawingCtx.lineJoin = 'round';
  }

  public update({drawingCtx, color, size}: DrawingToolMethodParams) {
    drawingCtx.strokeStyle = color;
    drawingCtx.fillStyle = color;
    drawingCtx.lineWidth = size;
  }

  public draw({
    drawingCtx,
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

    drawingCtx.beginPath();
    drawingCtx.moveTo(pt0.x, pt0.y);

    for(let j = startIndex; j < lastLength; j++) {
      const pt = workingStrokes[j];
      drawingCtx.lineTo(pt.x, pt.y);
    }

    drawingCtx.stroke();
  }

  public drawOnEnd({drawingCtx, workingStrokes}: DrawingContext) {
    if(workingStrokes.length < 2) {
      return;
    }

    drawArrowhead(drawingCtx, workingStrokes, drawingCtx.lineWidth);
  }
}
