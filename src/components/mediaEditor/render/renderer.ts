export interface RendererParams {
  imageLayerCanvas: HTMLCanvasElement;
  drawingLayerCanvas: HTMLCanvasElement;
}

export class Renderer {
  public imageLayerCanvas: HTMLCanvasElement;
  public imageLayerCanvasCtx: CanvasRenderingContext2D;
  public drawingLayerCanvas: HTMLCanvasElement;
  public drawingLayerCanvasCtx: CanvasRenderingContext2D;

  constructor({imageLayerCanvas, drawingLayerCanvas}: RendererParams) {
    this.imageLayerCanvas = imageLayerCanvas;
    this.drawingLayerCanvas = drawingLayerCanvas;

    this.imageLayerCanvasCtx = this.imageLayerCanvas.getContext('2d');
    this.drawingLayerCanvasCtx = this.drawingLayerCanvas.getContext('2d');
  }
}
