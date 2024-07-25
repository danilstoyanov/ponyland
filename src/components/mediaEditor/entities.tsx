import {createEffect, JSX, JSXElement, onCleanup, onMount} from 'solid-js';
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
  onMove?: ({x, y}: {x: number; y: number}) => void;
  controls?: JSX.Element[];
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

      props.onMove({x: currentTranslateX, y: currentTranslateY});
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

export const TextEntity = (props: TextEntityType) => {
  return (
    <div contentEditable="plaintext-only" style={{
      'text-align': props.textAlign,
      'font-family': props.fontFamily,
      'font-size': props.fontSize + 'px',
      'color': props.color,
      // text shadow
      'text-shadow': '-2px 0 black, 0 2px black, 2px 0 black, 0 -2px black'
    }} class={styles.TextEntity}>
      New Text
    </div>
  )
};

export const StickerEntity = (props: StickerEntityType) => {
  return (
    <div class={styles.TextEntity}>
      {props.container}
    </div>
  )
};
