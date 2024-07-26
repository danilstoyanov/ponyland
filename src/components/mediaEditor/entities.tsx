import {createEffect, createSignal, JSX, JSXElement, on, onCleanup, onMount} from 'solid-js';
import {unwrap} from 'solid-js/store';
import classNames from '../../helpers/string/classNames';
import styles from './mediaEditor.module.scss';
import {ButtonMenuSync} from '../buttonMenu';

type MediaEditorEntityType = 'text' | 'sticker';

interface MediaEditorEntity {
  id: number;
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  type: MediaEditorEntityType;
  rotate: 0;
};

type TextEntityFontFamily = 'Roboto'
  | 'Courier New'
  | 'Georgia'
  | 'Times New Roman'
  | 'Trebuchet MS'
  | 'Verdana'
  | 'Comic Sans MS';

type TextEntityAlignment = 'left' | 'center' | 'right';

type TextEntityAlignmentAppearance = 'plain' | 'border' | 'background';

export interface TextEntityType extends MediaEditorEntity {
  appearance: TextEntityAlignmentAppearance;
  color: string;
  fontSize: number;
  backgroundColor: string;
  textAlign: TextEntityAlignment;
  fontFamily: TextEntityFontFamily;
};

interface MediaEditorEntity {
  id: number;
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  type: MediaEditorEntityType;
  rotate: 0;
};


export interface StickerEntityType extends MediaEditorEntity {
  docId: DocId;
  container: HTMLElement;
}

interface TransformableEntityProps {
  id: number;
  x: number;
  y: number;
  width: number | 'auto';
  height: number | 'auto';
  isSelected: boolean;
  previewRef: HTMLDivElement;
  children: JSX.Element;
  workareaDimensions: {
    width: number;
    height: number;
  };
  controls?: JSX.Element[];
  onMove?: ({x, y}: {x: number; y: number}) => void;
}

export function isTextEntity(entity: MediaEditorEntity): entity is TextEntityType {
  return entity.type === 'text';
}

export function isStickerEntity(entity: MediaEditorEntity): entity is StickerEntityType {
  return entity.type === 'sticker';
}

export const TransformableEntity = (props: TransformableEntityProps) => {
  let transformarableEntityRef: HTMLDivElement;
  let controlsRef: HTMLDivElement;

  let offsetX = 0;
  let offsetY = 0;
  let isDragging = false;
  let initialX = props.x;
  let initialY = props.y;

  let currentTranslateX = 0;
  let currentTranslateY = 0;

  const handleMouseDown = (event: any) => {
    isDragging = true;
    initialX = event.clientX;
    initialY = event.clientY;
    const rect = transformarableEntityRef.getBoundingClientRect();
    offsetX = rect.left - props.previewRef.getBoundingClientRect().left;
    offsetY = rect.top - props.previewRef.getBoundingClientRect().top;
    transformarableEntityRef.classList.add('dragging');
  };

  const handleMouseMove = (event: any) => {
    if(isDragging) {
      const dx = event.clientX - initialX;
      const dy = event.clientY - initialY;
      currentTranslateX = offsetX + dx;
      currentTranslateY = offsetY + dy;

      // Boundary checks
      const previewRect = props.previewRef.getBoundingClientRect();
      const entityRect = transformarableEntityRef.getBoundingClientRect();

      // Calculate new position
      const newX = Math.max(0, Math.min(previewRect.width - entityRect.width, currentTranslateX));
      const newY = Math.max(0, Math.min(previewRect.height - entityRect.height, currentTranslateY));

      props.onMove({x: newX, y: newY});
    }
  };

  const handleMouseUp = () => {
    isDragging = false;
    transformarableEntityRef.classList.remove('dragging');
  };

  onMount(() => {
    transformarableEntityRef.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    onCleanup(() => {
      transformarableEntityRef.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    });
  });

  return (
    <div
      ref={transformarableEntityRef}
      class={`${styles.TransformableEntity} ${props.isSelected ? styles.TransformableEntitySelected : ''}`}
      style={
        {
          transform: `translateX(${props.x}px) translateY(${props.y}px)`,
          width: typeof props.width === 'string' ? props.width : `${props.width}px`,
          height: typeof props.height === 'string' ? props.height : `${props.height}px`
        }
      }
    >
      {props.isSelected && (
        <>
          <div class={`${styles.TransformableEntityCornerHandle} ${styles.TopLeft}`}>
            <div class={styles.TransformableEntityCorner}></div>
          </div>
          <div class={`${styles.TransformableEntityCornerHandle} ${styles.TopRight}`}>
            <div class={styles.TransformableEntityCorner}></div>
          </div>
          <div class={`${styles.TransformableEntityCornerHandle} ${styles.BottomLeft}`}>
            <div class={styles.TransformableEntityCorner}></div>
          </div>
          <div class={`${styles.TransformableEntityCornerHandle} ${styles.BottomRight}`}>
            <div class={styles.TransformableEntityCorner}></div>
          </div>

          <div class={styles.TransformableEntityControls} ref={controlsRef}>
            {props.controls}
          </div>
        </>
      )}

      {props.children}
    </div>
  );
};

function isCloseToWhite(color: string) {
  function hexToRgb(hex: string) {
    // Remove the hash if present
    hex = hex.replace(/^#/, '');
    if(hex.length === 3) {
      hex = hex.split('').map(char => char + char).join('');
    }
    const bigint = parseInt(hex, 16);
    return {
      r: (bigint >> 16) & 255,
      g: (bigint >> 8) & 255,
      b: bigint & 255
    };
  }

  function parseRgbString(rgbString: string) {
    const result = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/.exec(rgbString);
    return result ? {
      r: parseFloat(result[1]),
      g: parseFloat(result[2]),
      b: parseFloat(result[3]),
      a: result[4] !== undefined ? parseFloat(result[4]) : 1
    } : null;
  }

  // Calculate the distance to white (255, 255, 255)
  function distanceToWhite(r: number, g: number, b: number) {
    return Math.sqrt((255 - r) ** 2 + (255 - g) ** 2 + (255 - b) ** 2);
  }

  let rgb;
  if(color.startsWith('#')) {
    rgb = hexToRgb(color);
  } else if(color.startsWith('rgb')) {
    rgb = parseRgbString(color);
  } else {
    throw new Error('Unsupported color format');
  }

  const distance = distanceToWhite(rgb.r, rgb.g, rgb.b);
  const threshold = 50; // Adjust this value as needed

  return distance <= threshold;
}

// Examples
// console.log(isCloseToWhite('#ffffff')); // true
// console.log(isCloseToWhite('#f0f0f0')); // true
// console.log(isCloseToWhite('rgb(250, 250, 250)')); // true
// console.log(isCloseToWhite('rgba(240, 240, 240, 1)')); // true
// console.log(isCloseToWhite('#000000')); // false
// console.log(isCloseToWhite('rgb(0, 0, 0)')); // false
// console.log(isCloseToWhite('rgba(0, 0, 0, 1)')); // false

const mapTextAlignToAlignItems = (textAlign: TextEntityType['textAlign']) => {
  if(textAlign === 'left') return 'start';
  if(textAlign === 'center') return 'center';
  if(textAlign === 'right') return 'end';
}

export const TextEntity = (props: TextEntityType) => {
  return (
    <div
      data-ref={props.id}
      contentEditable
      spellcheck={false}
      style={{
        'font-family': props.fontFamily,
        'font-size': `${props.fontSize}px`,
        '--text-align': props.textAlign,
        '--text-color': props.color,
        '--text-background-appearance-color': isCloseToWhite(props.color) ? '#000' : props.color,
        '--text-background-appearance-alignment': props.textAlign && mapTextAlignToAlignItems(props.textAlign)
      }}
      classList={{
        [styles.TextEntity]: true,
        [styles.TextEntityAppearancePlain]: props.appearance === 'plain',
        [styles.TextEntityAppearanceBorder]: props.appearance === 'border',
        [styles.TextEntityAppearanceBackground]: props.appearance === 'background',
        [styles.TextEntityAppearanceBackgroundWhite]: props.appearance === 'background' && isCloseToWhite(props.color)
      }}
    >
      <div>New text</div>
      <div>And some long line</div>
      <div>small</div>
      <div>very small</div>
      <div>text</div>
      <div>and that's it!</div>
    </div>
  );
};


export const StickerEntity = (props: StickerEntityType) => {
  return (
    <div class={styles.TextEntity}>
      {props.container}
    </div>
  )
};
