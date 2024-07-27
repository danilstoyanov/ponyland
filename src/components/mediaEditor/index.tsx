import {Portal, render} from 'solid-js/web';
import {createStore, unwrap} from 'solid-js/store';
import {ChatType} from '../chat/chat';
import {createEffect, createSignal, JSX, For, on, onMount, Show, splitProps, onCleanup} from 'solid-js';
import classNames from '../../helpers/string/classNames';
import {RangeSelectorTsx} from '../rangeSelectorTsx';
import RowTsx from '../rowTsx';
import type {RangeSelectorProps} from '../rangeSelectorTsx';
import {ButtonIconTsx} from '../buttonIconTsx';
import ColorPickerTsx from '../colorPickerTsx';
import rootScope from '../../lib/rootScope';
import styles from './mediaEditor.module.scss';
import {hexaToRgba, hexToRgb, hexToRgbaWithOpacity} from '../../helpers/color';
import {ButtonCornerTsx} from '../buttonCornerTsx';
import {PenSvg, ArrowSvg, BrushSvg, NeonBrushSvg, BlurSvg, EraserSvg} from './tools-svg';
import main_canvas_png from './main-canvas.png';
// import png from './with_footer.png';
import img_crop_debugger from './CROP_DEBUGGER.png';
import img_200x200_1_1 from './200x200_1_1.png';
import img_320x200_8_5 from './320x200_8_5.png';
import img_3840x2160_8_4 from './3840x2160_8_4.png';
import img_3840x3840_1_1 from './3840x3840_1_1.png';
import {rotateImage, flipImage, tiltImage, changeImageBitmapSize} from './canvas';

// import png from './sonic.jpg';
// import png from './small.png';
import debounce from '../../helpers/schedulers/debounce';
import {useAppState} from '../../stores/appState';
import {
  applyBrightness,
  applyContrast,
  applyVignette,
  applyEnhance,
  applySaturation,
  applyWarmth,
  applyFade,
  applyHighlights,
  applySelectiveShadow,
  applyGrain,
  applySharp
} from './filters';
import {isStickerEntity, isTextEntity, StickerEntity, StickerEntityType, TextEntity, TextEntityType, TransformableEntity} from './entities'
import ColorPicker from '../colorPicker';
import {DrawingManager, PenTool, ArrowTool, BrushTool, NeonTool, EraserTool} from './drawing';
import StickersTab from './sticker-tab';
import appDownloadManager from '../../lib/appManagers/appDownloadManager';
import readBlobAsDataURL from '../../helpers/blob/readBlobAsDataURL';
import throttle from '../../helpers/schedulers/throttle';
import EmoticonsDropdown from './emoticons-dropdown';
import resizeableImage from '../../lib/cropper';
import ResizeableImage from './resizeableImage';
import {Crop} from './crop';
import type {CropAspectRatio} from './crop';
import wrapSticker from '../wrappers/sticker';

/* Navbar & Tabs */
type FilterType = 'enhance'
  | 'brightness'
  | 'contrast'
  | 'saturation'
  | 'warmth'
  | 'fade'
  | 'highlights'
  | 'shadows'
  | 'vignette'
  | 'grain'
  | 'sharpen';

type MediaEditorTab = 'enhance'
  | 'crop'
  | 'text'
  | 'brush'
  | 'smile';

type ToolType = 'pen'
  | 'arrow'
  | 'brush'
  | 'neon'
  | 'blur'
  | 'eraser'
  | '';

interface MediaEditorColorPickerProps {
  onChange: (color: Pick<ReturnType<ColorPicker['getCurrentColor']>, 'rgba'>) => void;
}

interface MediaEditorToolProps {
  svg: JSX.Element;
  color: string;
  title: string;
  isSelected: boolean;
  onClick: () => void;
}

interface MediaEditorTool {
  id: number;
  size: number;
  type: ToolType;
  color?: string;
  instance?: any;
}

export interface MediaEditorCropState {
  x: number;
  y: number;
  width: number;
  height: number;
  workareaHeight: number;
  workareaWidth: number;
  tilt: number; // tilt is angle we can choose on ruler
  rotate: number; // rotate is angle we can apply with button
  isFlipped: boolean;
  isApplied: boolean;
  aspectRatio: CropAspectRatio;
}

const createRandomColorImage = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const ctx = canvas.getContext('2d');

  // Generate a random color
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  // Set the fill color and fill the canvas
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
  ctx.fillRect(0, 0, 128, 128);

  // Create a new image
  const img = new Image(128, 128);
  img.src = canvas.toDataURL();

  return img;
}

type MediaEditorRangeSelectorProps = RangeSelectorProps & {
  label: string;
  style?: Record<string, string>;
}

const MediaEditorRangeSelector = (props: MediaEditorRangeSelectorProps) => {
  const [local, others] = splitProps(props, ['label']);
  const [currentValue, setCurrentValue] = createSignal(props.value);

  const handleValueChange = (value: number) => {
    setCurrentValue(value);

    if(others.onScrub) {
      others.onScrub(value);
    }
  };

  return (
    <div class={styles.MediaEditorRangeSelector}>
      <div class={styles.MediaEditorRangeSelectorLegend}>
        <div class={styles.MediaEditorRangeSelectorLegendLabel}>
          {local.label}
        </div>
        <div classList={{
          [styles.MediaEditorRangeSelectorLegendValue]: true,
          [styles.MediaEditorRangeSelectorLegendValueDefault]: currentValue() === props.value
        }}>
          {currentValue()}
        </div>
      </div>

      <div classList={{
        [styles.MediaEditorRangeSelectorTrack]: true,
        [styles.MediaEditorRangeSelectorTrackInitial]: others.min === currentValue(),
        [styles.MediaEditorRangeSelectorTrackFilled]: others.max === currentValue()
      }}>
        <RangeSelectorTsx {...others} onScrub={handleValueChange} />
      </div>
    </div>
  );
};

const MediaEditorColorPicker = (props: MediaEditorColorPickerProps) => {
  const COLORS = [
    '#FFFFFF',
    '#FE4438',
    '#FF8901',
    '#FFD60A',
    '#33C759',
    '#62E5E0',
    '#0A84FF',
    '#BD5CF3'
  ] as const;

  type ColorPickerColor = typeof COLORS[number];

  const RIPPLIFIED_COLORS = COLORS.map(color => `rgba(${hexToRgbaWithOpacity(color, 0.2).join(', ')})`);

  const [currentColor, setCurrentColor] = createSignal<string>(COLORS[0]);

  const [customColorTabActive, setCustomColorTabActive] = createSignal(false);

  const handleColorTabClick = (hexColor: ColorPickerColor) => {
    setCurrentColor(hexColor);
    setCustomColorTabActive(false);

    props.onChange({
      rgba: `rgba(${hexaToRgba(hexColor).join(',')})`
    })
  }

  const handleCustomColorToggleClick = () => {
    setCurrentColor();
    setCustomColorTabActive(true);
  }

  return (
    <div class={styles.MediaEditorColorPicker}>
      <div class={styles.MediaEditorColorPickerTabs}>
        <For each={COLORS}>
          {(color, index) => (
            <ButtonIconTsx
              style={{
                '--color-picker-tabs-circle-color': COLORS[index()],
                '--color-picker-tabs-circle-ripple-color': RIPPLIFIED_COLORS[index()]
              }}
              onClick={() => handleColorTabClick(color)}
              class={classNames(styles.MediaEditorColorPickerTabsButton,  currentColor() === color ? styles.Active : '')}
              noRipple
            >
              <div class={styles.MediaEditorColorPickerTabsCircle} />
            </ButtonIconTsx>
          )}
        </For>

        <ButtonIconTsx
          style={{
            '--color-picker-tabs-circle-color': COLORS[0],
            '--color-picker-tabs-circle-ripple-color': RIPPLIFIED_COLORS[0]
          }}
          onClick={handleCustomColorToggleClick}
        >

          <div
            style={{
              '--color-picker-tabs-custom-circle-color': currentColor() ?? 'transparent'
            }}
            classList={{
              [styles.MediaEditorColorPickerTabsCircle]: true,
              [styles.MediaEditorColorPickerTabsCircleCustomColor]: true
            }}
          />
        </ButtonIconTsx>
      </div>

      <Show when={!!customColorTabActive()}>
        <ColorPickerTsx
          class={styles.MediaEditorColorPickerWidget}
          onChange={props.onChange}
        />
      </Show>
    </div>
  )
};

const MediaEditorTool = (props: MediaEditorToolProps) => {
  const ret = (
    <div class={styles.ToolRow}>
      <div class={styles.ToolSvgWrapper}>
        <div class={styles.ToolSvg} style={{color:props.color}}>
          {props.svg}
        </div>
      </div>

      <div class={styles.ToolTitle}>
        {props.title}
      </div>
    </div>
  );

  return (
    <RowTsx
      title={ret}
      clickable={props.onClick}
      rowClasses={[
        'row-small',
        styles.Tool,
        props.isSelected ? styles.ToolSelected : ''
      ]}
    />
  );
};

type MediaEditorStateType = {
  selectedToolId: number;
  selectedEntityId: number;
  tools: MediaEditorTool[];
  entities: Array<TextEntityType | StickerEntityType>;
  crop: MediaEditorCropState;
  workarea: {
    contentPreviewOriginalHeight: number;
    contentPreviewOriginalWidth: number;
  }
};

type MediaEditorFilter = {
  id: FilterType;
  value: number;
}

type MediaEditorFilterState = {
  cache: Record<string, ImageBitmap>;
  appliedFilters: MediaEditorFilter[];
  isProcessing: boolean;
};

type MediaEditorWorkareaDimensions = {
  width: number;
  height: number;
};

type MediaEditorProps = {
  onClose: () => void;
  onMediaSave: any;
  mediaFile: File;
}

export const MediaEditor = (props: MediaEditorProps) => {
  let previewRef: HTMLDivElement;
  let previewContentRef: HTMLDivElement;
  let stickerTabRef: HTMLDivElement;
  let imageLayerCanvas: HTMLCanvasElement;
  let drawingLayerCanvas: HTMLCanvasElement;
  let DrawingManagerInstance: DrawingManager;
  let workareaImage: ImageBitmap;

  const DEFAULT_FONT_SIZE = 48;

  const DEFAULT_FONT_COLOR = 'var(--primary-color)';

  const initialState: MediaEditorStateType = {
    selectedEntityId : -1,
    selectedToolId: 0,
    tools: [
      {
        id: 0,
        type: 'pen',
        size: 16,
        color: '#FE4438',
        instance: new PenTool()
      },
      {
        id: 1,
        type: 'arrow',
        size: 16,
        color: '#FFD60A',
        instance: new ArrowTool()
      },
      {
        id: 2,
        type: 'brush',
        size: 16,
        color: '#FF8901',
        instance: new BrushTool()
      },
      {
        id: 3,
        type: 'neon',
        size: 16,
        color: '#62E5E0',
        instance: new NeonTool()
      },
      {
        id: 4,
        type: 'blur',
        size: 16,
        color: '#fff'
        // instance: new PrimitivePen(),
      },
      {
        id: 5,
        type: 'eraser',
        size: 16,
        color: '#fff',
        instance: new EraserTool()
      }
    ],
    entities: [
      {
        'id': 0,
        'x': 0,
        'y': 0,
        'fontSize': 24,
        'rotate': 0,
        'textAlign': 'left',
        'backgroundColor': '',
        'color': 'rgba(51,199,89)',
        'type': 'text',
        'appearance': 'plain',
        'height': 'auto',
        'width': 'auto',
        'fontFamily': 'Comic Sans MS'
      },
      {
        'id': 1,
        'x': 255,
        'y': 380,
        'fontSize': 32,
        'fontFamily': 'Comic Sans MS',
        'rotate': 0,
        'textAlign': 'center',
        'backgroundColor': '',
        'color': 'rgba(255,214,10)',
        'type': 'text',
        'appearance': 'background',
        'height': 'auto',
        'width': 'auto'
      },
      {
        'id': 2,
        'x': 50,
        'y': 740,
        'fontSize': 18,
        'rotate': 0,
        'textAlign': 'left',
        'backgroundColor': '',
        'color': 'rgba(255,255,255)',
        'type': 'text',
        'appearance': 'border',
        'height': 'auto',
        'width': 'auto',
        'fontFamily': 'Times New Roman'
      }
    ],
    crop: {
      x: 0,
      y: 0,
      height: 0,
      width: 0,
      workareaHeight: 0,
      workareaWidth: 0,
      rotate: 0,
      tilt: 0,
      isFlipped: false,
      isApplied: false,
      aspectRatio: 'Free'
    },
    workarea: {
      contentPreviewOriginalHeight: 0,
      contentPreviewOriginalWidth: 0
    }
  }

  const initialFilterState: MediaEditorFilterState = {
    cache: {},
    appliedFilters: [],
    isProcessing: false
  };

  const [originalImage, setOriginalImage] = createSignal<HTMLImageElement>();
  const [workareaDimensions, setWorkareaDimensions] = createSignal<MediaEditorWorkareaDimensions>();

  const [activeTab, setActiveTab] = createSignal<MediaEditorTab>('smile');
  const [cropPreview, setCropPreview] = createSignal<HTMLImageElement>();

  const [state, setState] = createStore<MediaEditorStateType>(initialState);
  const [filterState, setFilterState] = createStore<MediaEditorFilterState>(initialFilterState);

  const handleTabClick = (tab: MediaEditorTab) => {
    setActiveTab(tab);
  };

  function getScaledImageSize(ref: HTMLDivElement, {imageWidth, imageHeight}: {imageWidth: number, imageHeight: number}) {
    const workareaPadding = (window.innerWidth * 0.2);
    const previewWidth = ref.clientWidth - workareaPadding;
    const previewHeight = ref.clientHeight;

    const originalWidth = imageWidth;
    const originalHeight = imageHeight;

    // Calculate the scaling ratio to fit the width
    const widthRatio = previewWidth / originalWidth;
    const newWidth = previewWidth;
    const newHeight = originalHeight * widthRatio;

    // Check if the new height fits within the preview area
    if(newHeight > previewHeight) {
      // If the height exceeds the preview height, scale down to fit the height
      const heightRatio = previewHeight / originalHeight;
      const newWidth = originalWidth * heightRatio;
      const newHeight = previewHeight;

      return {
        width: newWidth,
        height: newHeight
      };
    }

    return {
      width: newWidth,
      height: newHeight
    };
  };

  function scaleCropToOriginalImage(crop: MediaEditorCropState, {imageWidth, imageHeight}: {imageWidth: number, imageHeight: number}) {
    const {
      x,
      y,
      width,
      height,
      rotate,
      workareaHeight,
      workareaWidth
    } = crop;

    let originalImageWidth = imageWidth;
    let originalImageHeight = imageHeight;

    // Swap the width and height if the rotation angle is 90 or 270 degrees
    if(rotate % 180 !== 0) {
      [originalImageWidth, originalImageHeight] = [originalImageHeight, originalImageWidth];
    }

    // Calculate the scale factors for width and height
    const scaleX = originalImageWidth / workareaWidth;
    const scaleY = originalImageHeight / workareaHeight;

    // Proportionally calculate x, y, width, and height for the original image
    const scaledX = x * scaleX;
    const scaledY = y * scaleY;
    const scaledWidth = width * scaleX;
    const scaledHeight = height * scaleY;

    return {
      x: scaledX,
      y: scaledY,
      width: scaledWidth,
      height: scaledHeight
    };
  };

  // * Crop Application
  const applyCrop = async() => {
    const {x, y, width, height} = scaleCropToOriginalImage(state.crop, {
      imageHeight: originalImage().height,
      imageWidth: originalImage().width
    });

    const dimensions = getScaledImageSize(previewRef, {
      imageHeight: height,
      imageWidth: width
    });

    setWorkareaDimensions(dimensions);

    imageLayerCanvas.width = dimensions.width;
    imageLayerCanvas.height = dimensions.height;

    drawingLayerCanvas.width = dimensions.width;
    drawingLayerCanvas.height = dimensions.height;

    previewContentRef.style.width = `${dimensions.width}px`;
    previewContentRef.style.height = `${dimensions.height}px`;

    const imageLayerCtx = imageLayerCanvas.getContext('2d');

    imageLayerCtx.fillRect(0, 0, imageLayerCanvas.width, imageLayerCanvas.height);
    imageLayerCtx.fillStyle = 'green';

    let cropImageBitmap = await createImageBitmap(originalImage());

    if(state.crop.rotate !== 0) {
      cropImageBitmap = await rotateImage(cropImageBitmap, state.crop.rotate);
    }

    if(state.crop.isFlipped) {
      cropImageBitmap = await flipImage(cropImageBitmap, 'horizontal');
    }

    if(state.crop.tilt !== 0) {
      cropImageBitmap = await tiltImage(cropImageBitmap, state.crop.tilt);
    }

    imageLayerCtx.drawImage(cropImageBitmap, x, y, width, height, 0, 0, dimensions.width, dimensions.height);
    workareaImage = await createImageBitmap(imageLayerCanvas);
  };

  const onCropChange = async(crop: MediaEditorCropState) => {
    const prevCropAngle = state.crop.rotate || 0;
    const newCropAngle = crop.rotate

    setState('crop', prevState => ({
      ...prevState,
      ...crop
    }));

    if(newCropAngle && prevCropAngle !== newCropAngle) {
      // Перезапускаем кроппер
      const preview = await renderMediaForCrop(newCropAngle) as string;
      const img = new Image();
      img.src = preview;
      setCropPreview(img);
    }
  };

  // Utility function to read a Blob as a Data URL
  const readBlobAsDataURL = (blob: any) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // * Canvas Renderer
  const renderMedia = () => {
    // Create a new canvas for the resulting image
    const resultCanvas = document.createElement('canvas');
    resultCanvas.width = imageLayerCanvas.width;
    resultCanvas.height = imageLayerCanvas.height;
    const resultCtx = resultCanvas.getContext('2d');

    // Render the base layer
    resultCtx.drawImage(imageLayerCanvas, 0, 0);

    // Render the drawing layer without transparency
    resultCtx.drawImage(drawingLayerCanvas, 0, 0);

    // Render text nodes
    state.entities.forEach(entity => {
      console.log('entity.x, entity.y: ', entity.x, entity.y);

      if(isTextEntity(entity)) {
        if(entity.appearance === 'background') {
          console.log('processing text entity', entity);

          const node = document.querySelector(`[data-ref="${entity.id}"]`);
          const textNodes = node.querySelectorAll('div');

          resultCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
          // resultCtx.textBaseline = 'hanging'; // Vertically align text in the middle
          resultCtx.textBaseline = 'middle'; // Vertically align text in the middle

          const paddingTop = 4;
          const paddingSides = 12;
          const radius = 8;
          const microGap = 2; // small adjustment to remove micro gap

          // Calculate the overall bounding box
          let maxWidth = 0;
          let totalHeight = 0;
          textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const textMetrics = resultCtx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = entity.fontSize;

            if(textWidth > maxWidth) {
              maxWidth = textWidth;
            }
            totalHeight += textHeight + paddingTop * 2 + microGap;
          });

          // Calculate the initial y position for the bounding box
          let startY = entity.y;

          // Draw the rectangles and text inside the bounding box
          textNodes.forEach((textNode, index) => {
            const text = textNode.textContent;
            const textMetrics = resultCtx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = entity.fontSize;

            // Calculate the x position based on the selected text alignment
            let x = entity.x;

            switch(entity.textAlign) {
              case 'left':
                x = entity.x;
                break;
              case 'center':
                x = entity.x + maxWidth / 2 - (textWidth / 2);
                break;
              case 'right':
                x = entity.x + maxWidth - textWidth;
                break;
            }

            // Determine the border radius for the current rectangle
            let borderRadius = [0, 0, 0, 0]; // [top-left, top-right, bottom-right, bottom-left]

            if(textNodes.length === 1) {
              borderRadius = [radius, radius, radius, radius];
            } else {
              if(entity.textAlign === 'left') {
                if(index === 0) {
                  const currentNode = textNodes[index];
                  const nextNode = textNodes[index + 1];

                  if(nextNode.clientWidth > currentNode.clientWidth) {
                    borderRadius = [radius, radius, 0, 0]
                  } else {
                    borderRadius = [radius, radius, radius, 0]
                  }
                } else if(index === textNodes.length - 1) {
                  borderRadius = [0, radius, radius, radius];
                } else {
                  if(textNode.clientWidth > textNodes[index - 1].clientWidth) {
                    borderRadius = [0, radius, radius, 0]; // Add border radius to the right
                  } else {
                    borderRadius = [0, 0, 0, 0];
                  }
                }
              } else if(entity.textAlign === 'right') {
                if(index === 0) {
                  const currentNode = textNodes[index];
                  const nextNode = textNodes[index + 1];
                  if(nextNode.clientWidth > currentNode.clientWidth) {
                    borderRadius = [radius, radius, 0, 0]
                  } else {
                    borderRadius = [radius, radius, 0, radius]
                  }
                } else if(index === textNodes.length - 1) {
                  borderRadius = [radius, 0, radius, radius];
                } else {
                  if(textNode.clientWidth > textNodes[index - 1].clientWidth) {
                    borderRadius = [radius, 0, 0, radius];
                  } else {
                    borderRadius = [0, 0, 0, 0];
                  }
                }
              } else if(entity.textAlign === 'center') {
                if(index === 0) {
                  const currentNode = textNodes[index];
                  if(textNodes.length === 1) {
                    borderRadius = [radius, radius, radius, radius];
                  } else {
                    const nextNode = textNodes[index + 1];

                    if(nextNode.clientWidth > currentNode.clientWidth) {
                      borderRadius = [radius, radius, 0, 0]
                    } else {
                      borderRadius = [radius, radius, radius, radius]
                    }
                  }
                } else if(index === textNodes.length - 1) {
                  borderRadius = [radius, radius, radius, radius];
                } else {
                  if(textNode.clientWidth > textNodes[index - 1].clientWidth) {
                    borderRadius = [radius, radius, radius, radius];
                  } else {
                    borderRadius = [0, 0, 0, 0];
                  }
                }
              }
            }

            // Draw the background rectangle with rounded corners
            resultCtx.fillStyle = entity.color;
            resultCtx.beginPath();
            resultCtx.roundRect(x - paddingSides, startY - textHeight / 2 - paddingTop, textWidth + paddingSides * 2, textHeight + paddingTop * 2, borderRadius);
            resultCtx.fill();

            // Draw the text
            resultCtx.fillStyle = 'white';
            resultCtx.fillText(text, x, startY);

            // Increment y position for next line of text, subtracting the micro gap
            startY += textHeight + paddingTop * 2 - microGap;
          });
        } else if(entity.appearance === 'plain') {
          console.log('processing plain text entity', entity);

          const node = document.querySelector(`[data-ref="${entity.id}"]`);
          const textNodes = node.querySelectorAll('div');

          resultCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
          resultCtx.textBaseline = 'hanging';
          resultCtx.fillStyle = entity.color; // Set the text color from entity.color

          // Calculate the overall bounding box
          let maxWidth = 0;
          let totalHeight = 0;
          textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const textMetrics = resultCtx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = entity.fontSize;

            if(textWidth > maxWidth) {
              maxWidth = textWidth;
            }
            totalHeight += textHeight;
          });

          // Calculate the initial y position for the bounding box
          let startY = entity.y;

          // Draw the text lines
          textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const textMetrics = resultCtx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = entity.fontSize;

            // Calculate the x position based on the selected text alignment
            let x = entity.x;

            switch(entity.textAlign) {
              case 'left':
                x = entity.x;
                break;
              case 'center':
                x = entity.x + maxWidth / 2 - (textWidth / 2);
                break;
              case 'right':
                x = entity.x + maxWidth - textWidth;
                break;
            }

            // Draw the text shadow
            resultCtx.shadowColor = 'rgba(0, 0, 0, 0.25)';
            resultCtx.shadowOffsetX = 0;
            resultCtx.shadowOffsetY = 0;
            resultCtx.shadowBlur = 4;

            // Draw the text
            resultCtx.fillText(text, x, startY);

            // Disable shadow for next operations
            resultCtx.shadowColor = 'transparent';
            resultCtx.shadowBlur = 0;

            // Increment y position for next line of text
            startY += textHeight;
          });
        } else if(entity.appearance === 'border') {
          console.log('processing plain text entity', entity);

          const node = document.querySelector(`[data-ref="${entity.id}"]`);
          const textNodes = node.querySelectorAll('div');

          resultCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
          resultCtx.textBaseline = 'hanging';
          resultCtx.fillStyle = entity.color; // Set the text color to white

          // Calculate the overall bounding box
          let maxWidth = 0;
          let totalHeight = 0;
          textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const textMetrics = resultCtx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = entity.fontSize;

            if(textWidth > maxWidth) {
              maxWidth = textWidth;
            }
            totalHeight += textHeight;
          });

          // Calculate the initial y position for the bounding box
          let startY = entity.y;

          // Draw the text lines with stroke
          textNodes.forEach(textNode => {
            const text = textNode.textContent;
            const textMetrics = resultCtx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = entity.fontSize;

            // Calculate the x position based on the selected text alignment
            let x = entity.x;

            switch(entity.textAlign) {
              case 'left':
                x = entity.x;
                break;
              case 'center':
                x = entity.x + maxWidth / 2 - (textWidth / 2);
                break;
              case 'right':
                x = entity.x + maxWidth - textWidth;
                break;
            }

            // Draw the text stroke
            // resultCtx.strokeStyle = entity.color;
            resultCtx.strokeStyle = '#000';
            resultCtx.lineWidth = 5;
            resultCtx.strokeText(text, x, startY);

            // Draw the white text
            resultCtx.fillText(text, x, startY);

            // Disable shadow for next operations
            resultCtx.shadowColor = 'transparent';
            resultCtx.shadowBlur = 0;

            // Increment y position for next line of text
            startY += textHeight;
          });
        }
      }
    });

    // Draw the resulting image back onto the result canvas
    const context = imageLayerCanvas.getContext('2d');
    if(context) {
      context.clearRect(0, 0, imageLayerCanvas.width, imageLayerCanvas.height);
      context.drawImage(resultCanvas, 0, 0);
    } else {
      console.error('Failed to get context from imageLayerCanvas');
    }
  };

  const renderMediaForCrop = (angle: number) => {
    return new Promise(async(resolve, reject) => {
      // Calculate the new dimensions of the canvas after rotation
      const radians = angle * (Math.PI / 180);
      const width = imageLayerCanvas.width;
      const height = imageLayerCanvas.height;
      const newWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
      const newHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));

      // Create a new canvas for the resulting image
      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = newWidth;
      resultCanvas.height = newHeight;
      const resultCtx = resultCanvas.getContext('2d');

      // Translate and rotate the context
      resultCtx.translate(newWidth / 2, newHeight / 2);
      resultCtx.rotate(radians);

      const originalImageBitmap = await createImageBitmap(originalImage());
      const resizedWorkareaImage = await changeImageBitmapSize(originalImageBitmap, width, height);

      console.log('resizedWorkareaImage: ', resizedWorkareaImage);
      console.log('imageLayerCanvas: ', imageLayerCanvas.width, imageLayerCanvas.height);

      resultCtx.drawImage(
        resizedWorkareaImage,
        -width / 2,
        -height / 2,
        resizedWorkareaImage.width,
        resizedWorkareaImage.height
      );

      // Render the drawing layer without transparency
      // resultCtx.drawImage(drawingLayerCanvas, -width / 2, -height / 2);

      // Render stickers
      // state.entities.forEach(entity => {
      //   if(isStickerEntity(entity)) {
      //     resultCtx.drawImage(
      //       entity.node, // Assuming `node` is an image element
      //       entity.x - width / 2,
      //       entity.y - height / 2,
      //       entity.width === 'auto' ? 100 : entity.width,
      //       entity.height === 'auto' ? 100 : entity.height
      //     );
      //   }
      // });

      // Render text nodes
      // state.entities.forEach(entity => {
      //   if(isTextEntity(entity)) {
      //     resultCtx.font = `${entity.fontSize}px ${entity.fontFamily}`;
      //     resultCtx.fillStyle = entity.color;
      //     resultCtx.textAlign = entity.textAlign;
      //     resultCtx.save();
      //     resultCtx.translate(entity.x - width / 2 + (entity as any).width / 2, entity.y - height / 2 + (entity as any).height / 2);
      //     resultCtx.rotate((entity.rotate * Math.PI) / 180);
      //     resultCtx.fillText(
      //       'Your Text Here', // Replace with the actual text if available in the entity object
      //       -entity.width / 2,
      //       entity.fontSize / 2
      //     );
      //     resultCtx.restore();
      //   }
      // });

      // Convert canvas to blob and resolve with the blob URL
      resultCanvas.toBlob((blob) => {
        if(blob) {
          const data = readBlobAsDataURL(blob);
          resolve(data);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    });
  };

  // * Tab Handlers
  const handleCropTabToggle = async() => {
    const preview = await renderMediaForCrop(0) as string;

    const img = new Image();
    img.src = preview;

    setCropPreview(img);
    handleTabClick('crop');
  };

  // * FITLER UPDATE WITH RENDER-PIPELINE APPLIED
  const applyFilters = (canvas: HTMLCanvasElement) => {
    const filterMap: Record<FilterType, any> = {
      brightness: applyBrightness,
      contrast: applyContrast,
      saturation: applySaturation,
      enhance: applyEnhance,
      fade: applyFade,
      grain: applyGrain,
      highlights: applyHighlights,
      shadows: applySelectiveShadow,
      sharpen: applySharp,
      warmth: applyWarmth,
      vignette: applyVignette
    }

    filterState.appliedFilters.forEach(filter => {
      filterMap[filter.id](canvas, filter.value);
    })
  };

  const handleFilterUpdate = (type: FilterType) => {
    return throttle(async(value: number) => {
      const ctx = imageLayerCanvas.getContext('2d');

      const dimensions = getScaledImageSize(previewRef, {
        imageHeight: originalImage().naturalHeight,
        imageWidth: originalImage().naturalWidth
      });

      ctx.drawImage(workareaImage, 0, 0, dimensions.width, dimensions.height);

      setFilterState('appliedFilters', (filters) => {
        if(value === 0) {
          return filters.filter(v => v.id !== type);
        }

        if(filters.some(v => v.id === type)) {
          return filters.map(v => v.id === type ? {...v, value} : v);
        }

        return [...filters, {id: type, value}];
      });

      // FILTER PERFORMANCE
      const startTime = performance.now();
      applyFilters(imageLayerCanvas);
      const endTime = performance.now();
      const elapsedTime = endTime - startTime;

      console.log(`Filter pipeline execution time: ${elapsedTime} milliseconds`);
    }, 16);
  };

  const handleBrigthnessUpdate = handleFilterUpdate('brightness');
  const handleEnhanceUpdate = handleFilterUpdate('enhance');
  const handleContrastUpdate = handleFilterUpdate('contrast');
  const handleSaturationUpdate = handleFilterUpdate('saturation');
  const handleWarmthUpdate = handleFilterUpdate('warmth');
  const handleFadeUpdate = handleFilterUpdate('fade');
  const handleHighlightsUpdate = handleFilterUpdate('highlights');
  const handleShadowsUpdate = handleFilterUpdate('shadows');
  const handleVignetteUpdate = handleFilterUpdate('vignette');
  const handleGrainUpdate = handleFilterUpdate('grain');
  const handleSharpUpdate = handleFilterUpdate('sharpen');

  // * Tools Handlers
  const selectTool = (id: number) => {
    setState({selectedToolId: id});
    DrawingManagerInstance.deactivate();
    DrawingManagerInstance.activate(state.tools[id].instance, state.tools[id].color, state.tools[id].size);
  };

  const setToolColor = (color: MediaEditorTool['color']) => {
    setState('tools', state.selectedToolId, {color});
    DrawingManagerInstance.update({color});
  };

  const setToolSize = (size: MediaEditorTool['size']) => {
    setState('tools', state.selectedToolId, {size});
    DrawingManagerInstance.update({size});
  };

  // * Entity Handlers
  const selectEntity = (id: number) => {
    setState({selectedEntityId: id});
  };

  const addStickerEntity = (container: StickerEntityType['container'], docId: StickerEntityType['docId']) => {
    setState('entities', state.entities.length, {
      id: state.entities.length,
      x: 100,
      y: 200,
      width: 200,
      height: 200,
      rotate: 0,
      type: 'sticker',
      docId,
      container
    });
  };

  // * Text Entity Handlers
  const addTextEntity = () => {
    const workareaCenterX = imageLayerCanvas.width / 2;
    const workareaCenterY = imageLayerCanvas.height / 2;

    // Assuming a default width and height for the text entity for initial centering
    const defaultTextWidth = 200; // Set this according to your default or calculated text width
    const defaultTextHeight = 50; // Set this according to your default or calculated text height

    setState('entities', state.entities.length, {
      id: state.entities.length,
      x: workareaCenterX - defaultTextWidth / 2,
      y: workareaCenterY - defaultTextHeight / 2,
      fontSize: DEFAULT_FONT_SIZE,
      rotate: 0,
      textAlign: 'left',
      backgroundColor: '',
      color: '#fff',
      type: 'text',
      appearance: 'background',
      height: 'auto',
      width: 'auto'
    });
  };

  const deleteTextEntity = () => {
    setState({
      entities: state.entities.filter(entity => entity.id !== state.selectedEntityId)
    });
  };

  const setTextEntityFont = (fontFamily: TextEntityType['fontFamily']) => {
    setState('entities', state.selectedEntityId, {fontFamily})
  };

  const setTextEntityFontSize = (fontSize: TextEntityType['fontSize']) => {
    setState('entities', state.selectedEntityId, {fontSize})
  };

  const setTextEntityFontColor = (color: TextEntityType['color']) => {
    setState('entities', state.selectedEntityId, {color})
  };

  const setTextEntityTextAlign = (textAlign: TextEntityType['textAlign']) => {
    setState('entities', state.selectedEntityId, {textAlign})
  };

  const setTextEntityAppearance = (appearance: TextEntityType['appearance']) => {
    setState('entities', state.selectedEntityId, {appearance})
  };

  // * Resize management
  const handleWindowResize = debounce(() => {
    const imageLayerCtx = imageLayerCanvas.getContext('2d');
    const drawingLayerCtx = drawingLayerCanvas.getContext('2d');

    // Save the current state of both layers
    const drawingLayerData = drawingLayerCtx.getImageData(0, 0, drawingLayerCanvas.width, drawingLayerCanvas.height);

    const dimensions = getScaledImageSize(previewRef, {
      imageHeight: originalImage().naturalHeight,
      imageWidth: originalImage().naturalWidth
    });

    previewContentRef.style.width = `${dimensions.width}px`;
    previewContentRef.style.height = `${dimensions.height}px`;

    imageLayerCanvas.width = dimensions.width;
    imageLayerCanvas.height = dimensions.height;

    drawingLayerCanvas.width = dimensions.width;
    drawingLayerCanvas.height = dimensions.height;

    setWorkareaDimensions(dimensions);

    // Clear and redraw the filter layer
    if(imageLayerCtx) {
      imageLayerCtx.clearRect(0, 0, imageLayerCanvas.width, imageLayerCanvas.height);
      imageLayerCtx.drawImage(workareaImage, 0, 0, dimensions.width, dimensions.height);
    }

    // Clear and restore the drawing layer
    if(drawingLayerCtx) {
      drawingLayerCtx.clearRect(0, 0, drawingLayerCanvas.width, drawingLayerCanvas.height);
      drawingLayerCtx.putImageData(drawingLayerData, 0, 0);
    }
  }, 16);

  onMount(() => {
    const setupStickers = async() => {
      // Setup stickers or other entities
      // Uncomment and adjust the code as necessary for your setup

      // const stickers = new StickersTab(rootScope.managers);
      // stickers.init();

      // const stickers = EmoticonsDropdown.getElement();
      // EmoticonsDropdown.init(
      //   {
      //     handleStickerClick: async(target: any) => {
      //       const doc = await rootScope.managers.appDocsManager.getDoc(target.dataset.docId);
      //       const wrapper = document.createElement('div');

      //       wrapSticker({
      //         doc,
      //         div: wrapper,
      //         loop: true,
      //         play: true,
      //         withThumb: false,
      //         loopEffect: true
      //       });

      //       addStickerEntity(wrapper, target.dataset.docId);
      //     }
      //   }
      // );
      // stickerTabRef.appendChild(stickers);
    };

    // props.mediaFile;

    const setupImageProcessing = async(image: HTMLImageElement, dimensions: { width: number, height: number }) => {
      previewContentRef.style.width = `${dimensions.width}px`;
      previewContentRef.style.height = `${dimensions.height}px`;

      imageLayerCanvas.width = dimensions.width;
      imageLayerCanvas.height = dimensions.height;

      drawingLayerCanvas.width = dimensions.width;
      drawingLayerCanvas.height = dimensions.height;

      setWorkareaDimensions(dimensions);

      const ctx = imageLayerCanvas.getContext('2d');
      ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);

      // DrawingManagerInstance = new DrawingManager(drawingLayerCanvas, previewContentRef);
      // DrawingManagerInstance.activate(state.tools[state.selectedToolId].instance, state.tools[state.selectedToolId].color, state.tools[state.selectedToolId].size);

      appDownloadManager.construct(rootScope.managers);

      // await setupStickers();

      workareaImage = await createImageBitmap(image);
      setOriginalImage(image);
    };

    if(props.mediaFile instanceof File) {
      const image = new Image();

      image.addEventListener('load', async() => {
        const dimensions = getScaledImageSize(previewRef, {
          imageHeight: image.naturalHeight,
          imageWidth: image.naturalWidth
        });

        await setupImageProcessing(image, dimensions);
      });

      // Create an object URL for the file and set it as the image source
      const objectUrl = URL.createObjectURL(props.mediaFile);
      image.src = objectUrl;

      // Revoke the object URL after the image has loaded
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
      };

      console.log('hello world onMount: ', props.mediaFile);
    } else if(props.mediaFile === null) {
      // Handle the case when mediaFile is null

      // const png = img_3840x2160_8_4; // Placeholder for the actual image source
      const png = main_canvas_png; // Placeholder for the actual image source

      const image = new Image();

      image.addEventListener('load', async() => {
        const dimensions = getScaledImageSize(previewRef, {
          imageHeight: image.naturalHeight,
          imageWidth: image.naturalWidth
        });

        await setupImageProcessing(image, dimensions);
      });

      image.src = png;
    }

    setTimeout(() => {
      renderMedia();
      // document.querySelector('[data-ref="0"]')?.remove();
      // document.querySelector('[data-ref="1"]')?.remove();
      // document.querySelector('[data-ref="2"]')?.remove();
      // document.querySelector('[data-ref="3"]')?.remove();
    }, 250);

    window.addEventListener('resize', handleWindowResize);
  });

  const handleMediaEditorCloseClick = () => {
    props.onClose();
  };

  // imageLayerCanvas // HTMLCanvasElement
  // console.log('RENDER MEDIA FOR TEST');

  const renderMediaForTest = () => {
    const ctx = imageLayerCanvas.getContext('2d');

    const width = 200;
    const height = 200;

    // Calculate the position to place the rectangle in the middle of the canvas
    const x = (imageLayerCanvas.width - width) / 2;
    const y = (imageLayerCanvas.height - height) / 2;

    // Draw a purple rectangle
    ctx.fillStyle = 'purple';
    ctx.fillRect(x, y, width, height);

    // Convert the canvas to a Blob
    imageLayerCanvas.toBlob((blob) => {
      // Create a File from the Blob
      const file = new File([blob], 'canvasImage.png', {type: 'image/png'});

      // Call the callback with the file
      if(props.onMediaSave) {
        props.onMediaSave(file);
        props.onClose();
      }
    }, 'image/png');

    console.log('RENDER MEDIA FOR TEST');
  };

  const renderVideo = async() => {
    const stickers = state.entities.filter(item => item.type === 'sticker');

    const captureFrames = (stickerCanvas: HTMLCanvasElement, duration: number, fps: number) => {
      return new Promise<ImageBitmap[]>((resolve) => {
        const capturedFrames: ImageBitmap[] = [];
        let framesCaptured = 0;
        const captureInterval = 1000 / fps; // Interval in milliseconds

        const captureFrame = () => {
          if(framesCaptured >= (duration / captureInterval)) {
            resolve(capturedFrames);
            return;
          }
          stickerCanvas.toBlob((blob) => {
            createImageBitmap(blob).then((bitmap) => {
              capturedFrames.push(bitmap);
              framesCaptured++;
              setTimeout(captureFrame, captureInterval);
            });
          });
        };

        captureFrame();
      });
    };

    const createVideoFromFrames = (frames: ImageBitmap[], fps: number) => {
      return new Promise<Blob>((resolve) => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        if(!context) {
          throw new Error('Failed to get 2D context');
        }

        canvas.width = frames[0].width;
        canvas.height = frames[0].height;

        const stream = canvas.captureStream();
        const recordedBlobs: Blob[] = [];
        const options = {mimeType: 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'};
        let mediaRecorder: MediaRecorder;

        try {
          mediaRecorder = new MediaRecorder(stream, options);
        } catch(e0) {
          console.error('Exception while creating MediaRecorder:', e0);
          return;
        }

        mediaRecorder.onstop = (event) => {
          console.log('Recorder stopped:', event);
          const superBuffer = new Blob(recordedBlobs, {type: 'video/mp4'});
          resolve(superBuffer);
        };

        mediaRecorder.ondataavailable = (event) => {
          if(event.data && event.data.size > 0) {
            recordedBlobs.push(event.data);
          }
        };

        mediaRecorder.start();

        let frameIndex = 0;
        const drawNextFrame = () => {
          if(frameIndex >= frames.length) {
            mediaRecorder.stop();
            return;
          }
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(frames[frameIndex], 0, 0);
          frameIndex++;
          setTimeout(drawNextFrame, 1000 / fps);
        };

        drawNextFrame();
      });
    };

    const captureAllStickerFrames = async(stickers: any) => {
      const promises = stickers.map((sticker: any) => {
        const stickerCanvas = sticker.container.querySelector('canvas');
        return captureFrames(stickerCanvas, 3000, 60);
      });
      return Promise.all(promises);
    };

    const composeFramesWithBackground = (backgroundCtx: any, stickerFrames: any, stickers: any) => {
      const framesWithBackground = [];

      for(let i = 0; i < stickerFrames[0].length; i++) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = backgroundCtx.canvas.width;
        tempCanvas.height = backgroundCtx.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Draw the background
        tempCtx.drawImage(backgroundCtx.canvas, 0, 0);

        // Draw each sticker frame at its respective position
        stickers.forEach((sticker: any, index: number) => {
          const frame = stickerFrames[index][i];
          tempCtx.drawImage(frame, sticker.x, sticker.y);
        });

        // Convert the result to an ImageBitmap and store it
        framesWithBackground.push(tempCanvas);
      }

      return framesWithBackground;
    };

    const imageLayerCanvasCtx = imageLayerCanvas.getContext('2d');

    if(imageLayerCanvasCtx) {
      const stickerFrames = await captureAllStickerFrames(stickers);
      const framesWithBackgroundCanvases = composeFramesWithBackground(imageLayerCanvasCtx, stickerFrames, stickers);

      // Convert canvases to ImageBitmap
      const framesWithBackgroundPromises = framesWithBackgroundCanvases.map(canvas => {
        return new Promise<ImageBitmap>((resolve) => {
          canvas.toBlob((blob) => {
            createImageBitmap(blob).then((bitmap) => {
              resolve(bitmap);
            });
          });
        });
      });

      const framesWithBackground = await Promise.all(framesWithBackgroundPromises);

      createVideoFromFrames(framesWithBackground, 60).then((videoBlob) => {
        const url = window.URL.createObjectURL(videoBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = 'recorded.mp4';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);

        console.log('Frames with background:', framesWithBackground);
        console.log('Stickers:', stickers);
      });
    }
  };

  onCleanup(() => {
    window.removeEventListener('resize', handleWindowResize);
  });

  createEffect(() => {
    console.log('state.entities: ', state.entities.length, unwrap(state.entities));
  })

  // createEffect(on(activeTab, () => {
  // if(previewDimensions()) {
  // console.log('previewDimensions(): ', previewDimensions());
  // previewContentRef.style.width = `${previewDimensions().width}px`;
  // previewContentRef.style.height = `${previewDimensions().height}px`;
  // }
  // }));

  return (
    <div class={styles.MediaEditor}>

      <div style={{
        'display': 'none',
        'position': 'absolute',
        'top': 0,
        'left': 0,
        'width': '200px',
        'background': 'rgba(255, 255, 255, 0.5)',
        'color': 'black',
        'font-size': '12px',
        'z-index': 1000,
        'pointer-events': 'none'
      }}>
        <p>Orig. img natural h: {originalImage() && originalImage().naturalHeight}</p>
        <p>Orig. Img natural w: {originalImage() && originalImage().naturalWidth}</p>
        <p>_______</p>
        <p>Workarea img h: {workareaImage && workareaImage.height}</p>
        <p>Workarea img w: {workareaImage && workareaImage.width}</p>
        <p>_______</p>
        <p>P.Content h: {workareaDimensions() && Math.floor(workareaDimensions().height)}</p>
        <p>P.Content w: {workareaDimensions() && Math.floor(workareaDimensions().width)}</p>
        <p>______</p>
        <p>crop h: {state.crop.height}</p>
        <p>crop w: {state.crop.width}</p>
        <p>crop x: {state.crop.x}</p>
        <p>crop y: {state.crop.y}</p>
        <p>______</p>
        <p>crop rotate: {state.crop.rotate}</p>
        <p>crop tilt: {state.crop.tilt}</p>
        <p>______</p>
        <p>crop WA h: {state.crop.workareaHeight}</p>
        <p>crop WA w: {state.crop.workareaWidth}</p>
      </div>

      <div class={styles.MediaEditorContainer}>
        <div id="previewRef" class={styles.MediaEditorPreview} ref={previewRef}>
          <div class={styles.MediaEditorInnerPreview}>
            <div
              id="previewContentRef"
              style={{display: activeTab() === 'crop' ? 'none' : 'initial'}}
              class={styles.MediaEditorPreviewContent}
              ref={previewContentRef}
            >
              <For each={state.entities}>
                {(entity) => {
                  return (
                    <TransformableEntity
                      workareaDimensions={workareaDimensions()}
                      previewRef={previewContentRef}
                      id={entity.id}
                      x={entity.x}
                      y={entity.y}
                      width={entity.width}
                      height={entity.height}
                      isSelected={entity.id === state.selectedEntityId}
                      onMove={({x, y}) => {
                        if(entity.id !== state.selectedEntityId) {
                          selectEntity(entity.id);
                        }

                        setState('entities', entity.id, {x, y});
                      }}
                      controls={[
                        <ButtonIconTsx icon='delete_filled'  onClick={deleteTextEntity} />
                      ]}
                    >
                      {isTextEntity(entity) ? (
                        <TextEntity {...entity} />
                      ) : (
                        <StickerEntity {...entity} />
                      )}
                    </TransformableEntity>
                  )
                }}
              </For>

              <canvas
                ref={drawingLayerCanvas}
                class={classNames(styles.MediaEditorPreviewLayer, styles.MediaEditorPreviewDrawingLayer)}
              />

              <canvas
                ref={imageLayerCanvas}
                class={classNames(styles.MediaEditorPreviewLayer, styles.MediaEditorPreviewImageLayer)}
              />
            </div>
          </div>

          {activeTab() === 'crop' && (
            // <div id="previewContentRef" class={styles.MediaEditorCropContent} ref={previewContentRef}>
            <Crop
              state={state.crop}
              image={cropPreview()}
              onCropChange={onCropChange}
            />
            // </div>
          )}
        </div>

        <div class={styles.MediaEditorSidebar}>
          <div class={styles.MediaEditorSidebarHeader}>
            <div class={styles.MediaEditorSidebarHeaderCloseButton}>
              <ButtonIconTsx
                icon="close"
                class="sidebar-back-button"
                onClick={handleMediaEditorCloseClick}
              />
            </div>

            <div class={styles.MediaEditorSidebarHeaderTitle}>Edit</div>
          </div>

          <div class={styles.MediaEditorSidebarTabs}>
            <div class={styles.MediaEditorSidebarTabsList}>
              <ButtonIconTsx
                icon="enhance_media"
                noRipple={true}
                class={classNames(styles.MediaEditorSidebarTabsListTab, activeTab() === 'enhance' && styles.active)}
                onClick={() => handleTabClick('enhance')}
              />
              <ButtonIconTsx
                icon="crop"
                noRipple={true}
                class={classNames(styles.MediaEditorSidebarTabsListTab, activeTab() === 'crop' && styles.active)}
                onClick={handleCropTabToggle}
              />
              <ButtonIconTsx
                icon="text"
                noRipple={true}
                class={classNames(styles.MediaEditorSidebarTabsListTab, activeTab() === 'text' && styles.active)}
                onClick={() => handleTabClick('text')}
              />
              <ButtonIconTsx
                icon="brush"
                noRipple={true}
                class={classNames(styles.MediaEditorSidebarTabsListTab, activeTab() === 'brush' && styles.active)}
                onClick={() => handleTabClick('brush')}
              />
              <ButtonIconTsx
                icon="smile"
                noRipple={true}
                class={classNames(styles.MediaEditorSidebarTabsListTab, activeTab() === 'smile' && styles.active)}
                onClick={() => handleTabClick('smile')}
              />
            </div>

            <div class={styles.MediaEditorSidebarTabsContent}>
              {activeTab() === 'enhance' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>
                  <div class={styles.MediaEditorSidebarTabsContentTabPanelFilter}>
                    <MediaEditorRangeSelector
                      label="Enhance"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleEnhanceUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Brightness"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleBrigthnessUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Contrast"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleContrastUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Saturation"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleSaturationUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Warmth"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleWarmthUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Fade"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFadeUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Highlights"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleHighlightsUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Shadows"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleShadowsUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Vignette"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleVignetteUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Sharpen"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleSharpUpdate}
                    />
                    <MediaEditorRangeSelector
                      label="Grain"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleGrainUpdate}
                    />
                  </div>
                </div>
              )}

              {activeTab() === 'crop' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>
                  <div class={styles.MediaEditorSidebarSectionHeader}>
                    Aspect ratio
                  </div>

                  {/* class={classNames(styles.MediaEditorSidebarTabsListTab, activeTab() === 'brush' && styles.active)} */}

                  <div class={styles.MediaEditorSidebarTabsContentTabPanelCrop}>
                    <RowTsx
                      title='Free'
                      icon='aspect_ratio_free'
                      clickable={() => setState('crop', {aspectRatio: 'Free'})}
                      rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === 'Free' && styles.Active]}
                    />

                    <RowTsx
                      title='Original'
                      icon='aspect_ratio_image_original'
                      clickable={() => setState('crop', {aspectRatio: 'Original'})}
                      rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === 'Original' && styles.Active]}
                    />

                    <RowTsx
                      title='Square'
                      icon='aspect_ratio_square'
                      clickable={() => setState('crop', {aspectRatio: 'Square'})}
                      rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === 'Square' && styles.Active]}
                    />

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx
                        title='3:2'
                        icon='aspect_ratio_3_2'
                        clickable={() => setState('crop', {aspectRatio: '3:2'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '3:2' && styles.Active]}
                      />

                      <RowTsx
                        title='2:3'
                        icon='aspect_ratio_3_2'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => setState('crop', {aspectRatio: '2:3'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '2:3' && styles.Active]}
                      />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx
                        title='4:3'
                        icon='aspect_ratio_4_3'
                        clickable={() => setState('crop', {aspectRatio: '4:3'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '4:3' && styles.Active]}
                      />

                      <RowTsx
                        title='3:4'
                        icon='aspect_ratio_4_3'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => setState('crop', {aspectRatio: '3:4'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '3:4' && styles.Active]}
                      />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx
                        title='5:4'
                        icon='aspect_ratio_5_4'
                        clickable={() => setState('crop', {aspectRatio: '5:4'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '5:4' && styles.Active]}
                      />

                      <RowTsx
                        title='4:5'
                        icon='aspect_ratio_5_4'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => setState('crop', {aspectRatio: '4:5'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '4:5' && styles.Active]}
                      />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx
                        title='7:5'
                        icon='aspect_ratio_7_5'
                        clickable={() => setState('crop', {aspectRatio: '7:5'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '7:5' && styles.Active]}
                      />

                      <RowTsx
                        title='5:7'
                        icon='aspect_ratio_7_5'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => setState('crop', {aspectRatio: '5:7'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '5:7' && styles.Active]}
                      />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx
                        title='16:9'
                        icon='aspect_ratio_16_9'
                        clickable={() => setState('crop', {aspectRatio: '16:9'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '16:9' && styles.Active]}
                      />

                      <RowTsx
                        title='9:16'
                        icon='aspect_ratio_16_9'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => setState('crop', {aspectRatio: '9:16'})}
                        rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '9:16' && styles.Active]}
                      />
                    </div>

                    <RowTsx
                      title='DO CROP'
                      icon='bomb'
                      iconClasses={['row-icon-rotated']}
                      // clickable={() => setState('crop', {aspectRatio: '9:16'})}
                      rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === '9:16' && styles.Active]}
                      clickable={() => {
                        setActiveTab('enhance');
                        setTimeout(applyCrop);
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab() === 'text' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>
                  <div class={styles.MediaEditorSidebarTabsContentTabPanelText}>
                    <div class={styles.MediaEditorSidebarTabsContentTabPanelTextRow}>
                      <MediaEditorColorPicker onChange={(color) => setTextEntityFontColor(color.rgba)} />
                    </div>

                    <div class={classNames(styles.MediaEditorSidebarTabsContentTabPanelTextRow, styles.MediaEditorSidebarTabsContentTabPanelTextSettings)}>
                      <div class={styles.MediaEditorSidebarTabsContentTabPanelTextCol}>
                        <ButtonIconTsx
                          icon="text_align_left"
                          class={classNames(styles.Button, (state.entities[state.selectedEntityId] as TextEntityType)?.textAlign === 'left' && styles.Active)}
                          onClick={() => {
                            setTextEntityTextAlign('left')
                          }}
                        />

                        <ButtonIconTsx
                          icon="text_align_centre"
                          class={classNames(styles.Button, (state.entities[state.selectedEntityId] as TextEntityType)?.textAlign === 'center' && styles.Active)}
                          onClick={() => {
                            setTextEntityTextAlign('center')
                          }}
                        />

                        <ButtonIconTsx
                          icon="text_align_right"
                          class={classNames(styles.Button, (state.entities[state.selectedEntityId] as TextEntityType)?.textAlign === 'right' && styles.Active)}
                          onClick={() => {
                            setTextEntityTextAlign('right')
                          }}
                        />
                      </div>

                      <div class={styles.MediaEditorSidebarTabsContentTabPanelTextCol}>
                        <ButtonIconTsx
                          icon="font_no_frame"
                          class={classNames(styles.Button, (state.entities[state.selectedEntityId] as TextEntityType)?.appearance === 'plain' && styles.Active)}
                          onClick={() => {
                            setTextEntityAppearance('plain')
                          }}
                        />

                        <ButtonIconTsx
                          icon="font_black"
                          class={classNames(styles.Button, styles.ButtonMediumSize, (state.entities[state.selectedEntityId] as TextEntityType)?.appearance === 'border' && styles.Active)}
                          onClick={() => {
                            setTextEntityAppearance('border')
                          }}
                        />

                        <ButtonIconTsx
                          icon="font_white"
                          class={classNames(styles.Button, (state.entities[state.selectedEntityId] as TextEntityType)?.appearance === 'background' && styles.Active)}
                          onClick={() => {
                            setTextEntityAppearance('background')
                          }}
                        />
                      </div>
                    </div>

                    <div class={styles.MediaEditorSidebarSectionHeader}>
                      <MediaEditorRangeSelector
                        label="Size"
                        min={10}
                        max={64}
                        step={1}
                        value={(state.entities[state.selectedEntityId] as TextEntityType)?.fontSize ?? DEFAULT_FONT_SIZE}
                        onScrub={setTextEntityFontSize}
                        style={{
                          '--color': `${(state.entities[state.selectedEntityId] as TextEntityType)?.color ?? DEFAULT_FONT_COLOR}`
                        }}
                      />
                    </div>

                    <div>
                      <div class={styles.MediaEditorSidebarSectionHeader}>
                        Controls
                      </div>

                      <RowTsx title='Add text' clickable={addTextEntity} />
                      <RowTsx title='Remove text' clickable={() => true} />
                      <RowTsx title='Render result' clickable={() => true} />
                    </div>

                    <div>
                      <div class={styles.MediaEditorSidebarSectionHeader}>
                        Font
                      </div>
                      <RowTsx title='Roboto' clickable={() => setTextEntityFont('Roboto')} rowClasses={[styles.MediaEditorFontRow, styles.MediaEditorFontRowRoboto]} />
                      <RowTsx title='Courier New' clickable={() => setTextEntityFont('Courier New')} rowClasses={[styles.MediaEditorFontRow, styles.MediaEditorFontRowCourierNew]} />
                      <RowTsx title='Georgia' clickable={() => setTextEntityFont('Georgia')} rowClasses={[styles.MediaEditorFontRow, styles.MediaEditorFontRowGeorgia]} />
                      <RowTsx title='Times New Roman' clickable={() => setTextEntityFont('Times New Roman')} rowClasses={[styles.MediaEditorFontRow, styles.MediaEditorFontRowTimesNewRoman]} />
                      <RowTsx title='Trebuchet MS' clickable={() => setTextEntityFont('Trebuchet MS')} rowClasses={[styles.MediaEditorFontRow, styles.MediaEditorFontRowTrebuchetMS]} />
                      <RowTsx title='Comic Sans' clickable={() => setTextEntityFont('Comic Sans MS')} rowClasses={[styles.MediaEditorFontRow, styles.MediaEditorFontRowComicSans]} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab() === 'brush' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>
                  <div class={styles.MediaEditorSidebarTabsContentTabPanelTextRow}>
                    <MediaEditorColorPicker onChange={(color) => setToolColor(color.rgba)} />
                  </div>

                  <MediaEditorRangeSelector
                    label="Size"
                    min={10}
                    max={48}
                    step={1}
                    value={14}
                    onScrub={(value) => setToolSize(value)}
                  />

                  <div class={styles.MediaEditorSidebarSectionHeader}>
                    Tool
                  </div>

                  <MediaEditorTool
                    title="Pen"
                    color={state.tools[0].color}
                    svg={<PenSvg />}
                    isSelected={state.selectedToolId === 0}
                    onClick={() => selectTool(0)}
                  />

                  <MediaEditorTool
                    title="Arrow"
                    color={state.tools[1].color}
                    svg={<ArrowSvg />}
                    isSelected={state.selectedToolId === 1}
                    onClick={() => selectTool(1)}
                  />

                  <MediaEditorTool
                    title="Brush"
                    color={state.tools[2].color}
                    svg={<BrushSvg />}
                    isSelected={state.selectedToolId === 2}
                    onClick={() => selectTool(2)}
                  />

                  <MediaEditorTool
                    title="Neon"
                    color={state.tools[3].color}
                    svg={<NeonBrushSvg />}
                    isSelected={state.selectedToolId === 3}
                    onClick={() => selectTool(3)}
                  />

                  <MediaEditorTool
                    title="Blur"
                    color={state.tools[4].color}
                    svg={<BlurSvg />}
                    isSelected={state.selectedToolId === 4}
                    onClick={() => selectTool(4)}
                  />

                  <MediaEditorTool
                    title="Eraser"
                    color={state.tools[5].color}
                    svg={<EraserSvg />}
                    isSelected={state.selectedToolId === 5}
                    onClick={() => selectTool(5)}
                  />
                </div>
              )}

              {activeTab() === 'smile' && (
                <div class={classNames(styles.MediaEditorSidebarTabsContentTabPanel, styles.Stickers)} ref={stickerTabRef}>
                  <h1>STICKERS</h1>
                  <button
                    style={{padding: '16px', background: 'blue'}}
                    onClick={renderVideo}
                  >
                    Render!
                  </button>

                  <button
                    style={{'margin-left': '8px', 'padding': '16px', 'background': 'green'}}
                    onClick={renderMediaForTest}
                  >
                    File Update Debug
                  </button>

                  <button
                    style={{'margin-left': '8px', 'padding': '16px', 'background': 'red'}}
                    onClick={renderMedia}
                  >
                    Render Media
                  </button>
                </div>
              )}
            </div>
          </div>

          <ButtonCornerTsx onClick={() => alert('click stuff')} />
        </div>
      </div>

      <div class={styles.MediaEditorBackground} />
    </div>
  );
};

type CreateMediaEditorProps = {
  mediaFile: File;
  onMediaSave: (file: File) => void;
}

export const createMediaEditor = ({
  mediaFile,
  onMediaSave
}: CreateMediaEditorProps) => {
  const dispose = render(
    () => (
      <Portal mount={document.getElementById('media-editor')}>
        <MediaEditor
          onClose={() => dispose()}
          onMediaSave={onMediaSave}
          mediaFile={mediaFile}
        />
      </Portal>
    ),
    document.getElementById('media-editor')
  );

  return dispose;
};
