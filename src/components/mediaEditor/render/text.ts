import {TextEntityType} from '../entities';
import {Renderer, RendererParams} from './renderer';
import {isCloseToWhite} from '../../../helpers/color';

export class TextRenderer extends Renderer {
  constructor(params: RendererParams) {
    super(params);
  }

  public render(entity: TextEntityType, resultCanvasCtx: CanvasRenderingContext2D) {
    if(entity.appearance === 'background') {
      this._renderBackgroundText(entity, resultCanvasCtx);
    } else if(entity.appearance === 'plain') {
      this._renderPlainText(entity, resultCanvasCtx);
    } else if(entity.appearance === 'border') {
      this._renderBorderText(entity, resultCanvasCtx);
    }
  }

  private _renderBackgroundText(entity: TextEntityType, resultCanvasCtx: CanvasRenderingContext2D) {
    const node = document.querySelector(`[data-ref="${entity.id}"]`);
    const textNodes = node.querySelectorAll('div');

    resultCanvasCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
    resultCanvasCtx.textBaseline = 'middle';

    const paddingTop = 4;
    const paddingSides = 12;
    const radius = 8;
    const microGap = 2;

    let maxWidth = 0;
    let totalHeight = 0;
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const textMetrics = resultCanvasCtx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = entity.fontSize;

      if(textWidth > maxWidth) {
        maxWidth = textWidth;
      }
      totalHeight += textHeight + paddingTop * 2 + microGap;
    });

    let startY = entity.y;

    textNodes.forEach((textNode, index) => {
      const text = textNode.textContent;
      const textMetrics = resultCanvasCtx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = entity.fontSize;

      let x = entity.x;
      switch(entity.textAlign) {
        case 'left':
          x = entity.x;
          break;
        case 'center':
          x = entity.x + maxWidth / 2 - textWidth / 2;
          break;
        case 'right':
          x = entity.x + maxWidth - textWidth;
          break;
      }

      let borderRadius = [0, 0, 0, 0];
      if(textNodes.length === 1) {
        borderRadius = [radius, radius, radius, radius];
      } else {
        borderRadius = this._calculateBorderRadius(entity, textNodes, index);
      }

      this._drawRoundedRect(resultCanvasCtx, x - paddingSides, startY - textHeight / 2 - paddingTop, textWidth + paddingSides * 2, textHeight + paddingTop * 2, borderRadius, entity.color);

      resultCanvasCtx.fillStyle = this._getContrastingColor(entity.color);
      resultCanvasCtx.fillText(text, x, startY);

      startY += textHeight + paddingTop * 2 - microGap;
    });
  }

  private _renderPlainText(entity: TextEntityType, resultCanvasCtx: CanvasRenderingContext2D) {
    const node = document.querySelector(`[data-ref="${entity.id}"]`);
    const textNodes = node.querySelectorAll('div');

    resultCanvasCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
    resultCanvasCtx.textBaseline = 'hanging';
    resultCanvasCtx.fillStyle = entity.color;

    let maxWidth = 0;
    let totalHeight = 0;
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const textMetrics = resultCanvasCtx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = entity.fontSize;

      if(textWidth > maxWidth) {
        maxWidth = textWidth;
      }
      totalHeight += textHeight;
    });

    let startY = entity.y;
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const textMetrics = resultCanvasCtx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = entity.fontSize;

      let x = entity.x;
      switch(entity.textAlign) {
        case 'left':
          x = entity.x;
          break;
        case 'center':
          x = entity.x + maxWidth / 2 - textWidth / 2;
          break;
        case 'right':
          x = entity.x + maxWidth - textWidth;
          break;
      }

      this._drawTextWithShadow(resultCanvasCtx, text, x, startY);

      startY += textHeight;
    });
  }

  private _renderBorderText(entity: TextEntityType, resultCanvasCtx: CanvasRenderingContext2D) {
    const node = document.querySelector(`[data-ref="${entity.id}"]`);
    const textNodes = node.querySelectorAll('div');

    resultCanvasCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
    resultCanvasCtx.textBaseline = 'hanging';
    resultCanvasCtx.fillStyle = entity.color;

    let maxWidth = 0;
    let totalHeight = 0;
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const textMetrics = resultCanvasCtx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = entity.fontSize;

      if(textWidth > maxWidth) {
        maxWidth = textWidth;
      }
      totalHeight += textHeight;
    });

    let startY = entity.y;
    textNodes.forEach(textNode => {
      const text = textNode.textContent;
      const textMetrics = resultCanvasCtx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = entity.fontSize;

      let x = entity.x;
      switch(entity.textAlign) {
        case 'left':
          x = entity.x;
          break;
        case 'center':
          x = entity.x + maxWidth / 2 - textWidth / 2;
          break;
        case 'right':
          x = entity.x + maxWidth - textWidth;
          break;
      }

      resultCanvasCtx.strokeStyle = '#000';
      resultCanvasCtx.lineWidth = 5;
      resultCanvasCtx.strokeText(text, x, startY);
      resultCanvasCtx.fillText(text, x, startY);

      startY += textHeight;
    });
  }

  private _calculateBorderRadius(entity: TextEntityType, textNodes: NodeListOf<HTMLDivElement>, index: number) {
    const radius = 8;
    let borderRadius = [0, 0, 0, 0];
    const currentNode = textNodes[index];
    const nextNode = textNodes[index + 1];
    const prevNode = textNodes[index - 1];

    switch(entity.textAlign) {
      case 'left':
        if(index === 0) {
          if(nextNode.clientWidth > currentNode.clientWidth) {
            borderRadius = [radius, radius, 0, 0];
          } else {
            borderRadius = [radius, radius, radius, 0];
          }
        } else if(index === textNodes.length - 1) {
          borderRadius = [0, radius, radius, radius];
        } else {
          if(currentNode.clientWidth > prevNode.clientWidth) {
            borderRadius = [0, radius, radius, 0];
          }
        }
        break;
      case 'right':
        if(index === 0) {
          if(nextNode.clientWidth > currentNode.clientWidth) {
            borderRadius = [radius, radius, 0, 0];
          } else {
            borderRadius = [radius, radius, 0, radius];
          }
        } else if(index === textNodes.length - 1) {
          borderRadius = [radius, 0, radius, radius];
        } else {
          if(currentNode.clientWidth > prevNode.clientWidth) {
            borderRadius = [radius, 0, 0, radius];
          }
        }
        break;
      case 'center':
        if(index === 0) {
          if(textNodes.length === 1) {
            borderRadius = [radius, radius, radius, radius];
          } else if(nextNode.clientWidth > currentNode.clientWidth) {
            borderRadius = [radius, radius, 0, 0];
          } else {
            borderRadius = [radius, radius, radius, radius];
          }
        } else if(index === textNodes.length - 1) {
          borderRadius = [radius, radius, radius, radius];
        } else {
          if(currentNode.clientWidth > prevNode.clientWidth) {
            borderRadius = [radius, radius, radius, radius];
          }
        }
        break;
    }
    return borderRadius;
  }

  private _drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, borderRadius: number[], color: string) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + borderRadius[0], y);
    ctx.lineTo(x + width - borderRadius[1], y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + borderRadius[1]);
    ctx.lineTo(x + width, y + height - borderRadius[2]);
    ctx.quadraticCurveTo(x + width, y + height, x + width - borderRadius[2], y + height);
    ctx.lineTo(x + borderRadius[3], y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - borderRadius[3]);
    ctx.lineTo(x, y + borderRadius[0]);
    ctx.quadraticCurveTo(x, y, x + borderRadius[0], y);
    ctx.fill();
  }

  private _getContrastingColor(color: string): string {
    return isCloseToWhite(color) ? 'black' : 'white';
  }

  private _drawTextWithShadow(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 4;
    ctx.fillText(text, x, y);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}
