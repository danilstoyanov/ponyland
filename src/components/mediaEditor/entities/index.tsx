import {createEffect, JSX, onCleanup, onMount} from 'solid-js';
import {isCloseToWhite} from '../../../helpers/color';
import styles from '../mediaEditor.module.scss';

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
  stickerType: 1 | 2 | 3 // 1 - Static, 2 - Animated, 3 - Video sticker
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

      const previewRect = props.previewRef.getBoundingClientRect();
      const entityRect = transformarableEntityRef.getBoundingClientRect();

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
      data-x={props.x}
      data-y={props.y}
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

const mapTextAlignToAlignItems = (textAlign: TextEntityType['textAlign']) => {
  if(textAlign === 'left') return 'start';
  if(textAlign === 'center') return 'center';
  if(textAlign === 'right') return 'end';
}

export const TextEntity = (props: TextEntityType) => {
  let textEntityRef: HTMLDivElement;

  const assignBorderRadiusToChildren = (ref: HTMLDivElement, textAlign: 'left' | 'center' | 'right') => {
    if(ref.childNodes.length < 1) {
      return;
    }

    const childNodes = Array.from(ref.children) as HTMLDivElement[];
    const radius = 16;

    childNodes.forEach((textNode, index) => {
      if(childNodes.length === 1) {
        textNode.style.borderRadius = `${radius}px ${radius}px ${radius}px ${radius}px`;
        return;
      };

      let borderRadius: [number, number, number, number] = [0, 0, 0, 0];

      const prevNode = childNodes[index - 1];
      const nextNode = childNodes[index + 1];

      const prevWidth = prevNode ? prevNode.clientWidth : 0;
      const nextWidth = nextNode ? nextNode.clientWidth : 0;
      const currentWidth = textNode.clientWidth;

      if(index === 0) {
        if(textAlign === 'left') {
          borderRadius = [radius, radius, 0, 0];
          if(nextWidth <= currentWidth) {
            borderRadius = [radius, radius, radius, 0];
          }
        } else if(textAlign === 'center') {
          borderRadius = [radius, radius, 0, 0];
          if(nextWidth <= currentWidth) {
            borderRadius = [radius, radius, radius, radius];
          }
        } else if(textAlign === 'right') {
          borderRadius = [radius, radius, 0, 0];
          if(nextWidth <= currentWidth) {
            borderRadius = [radius, radius, 0, radius];
          }
        }
      } else if(index === childNodes.length - 1) {
        if(textAlign === 'left') {
          if(prevWidth <= currentWidth) {
            borderRadius = [0, radius, radius, radius];
          } else {
            borderRadius = [0, 0, radius, radius];
          }
        } else if(textAlign === 'center') {
          if(prevWidth < currentWidth) {
            borderRadius = [radius, radius, radius, radius];
          } else {
            borderRadius = [0, 0, radius, radius];
          }
        } else if(textAlign === 'right') {
          if(prevWidth <= currentWidth) {
            borderRadius = [radius, 0, radius, radius];
          } else {
            borderRadius = [0, 0, radius, radius];
          }
        }
      } else {
        if(textAlign === 'left') {
          if(prevWidth < currentWidth) {
            borderRadius = [0, radius, 0, 0]
          }
          if(nextWidth < currentWidth) {
            borderRadius = [0, radius, radius, 0]
          }
        } else if(textAlign === 'center') {
          if(prevWidth < currentWidth) {
            borderRadius = [radius, radius, 0, 0]
          }
          if(nextWidth < currentWidth) {
            borderRadius = [radius, radius, radius, radius]
          }
        } else if(textAlign === 'right') {
          if(prevWidth < currentWidth) {
            borderRadius = [radius, 0, 0, 0]
          }
          if(nextWidth < currentWidth) {
            borderRadius = [radius, 0, 0, radius]
          }
        }
      }

      textNode.style.borderRadius = `${borderRadius[0]}px ${borderRadius[1]}px ${borderRadius[2]}px ${borderRadius[3]}px`;
    });
  };

  const applySpacingAdjustment = (ref: HTMLDivElement) => {
    const childNodes = Array.from(ref.children) as HTMLDivElement[];

    childNodes.forEach((textNode, index) => {
      textNode.style.transform = `translateY(-${index + 1}px)`;
    });
  };

  const handleTextEntityContentUpdate = (event: InputEvent) => {
    assignBorderRadiusToChildren(event.target as HTMLDivElement, props.textAlign);
    applySpacingAdjustment(event.target as HTMLDivElement);
  };

  createEffect(() => {
    if(props.appearance === 'background') {
      assignBorderRadiusToChildren(textEntityRef, props.textAlign);
      applySpacingAdjustment(textEntityRef);
    }
  });

  return (
    <div
      ref={textEntityRef}
      contentEditable
      onInput={props.appearance === 'background' && handleTextEntityContentUpdate}
      data-ref={props.id}
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
