import {Portal, render} from 'solid-js/web';
import {createStore} from 'solid-js/store';
import {createEffect, createSignal, JSX, For, on, onMount, Show, splitProps, onCleanup} from 'solid-js';
import classNames from '../../helpers/string/classNames';
import {RangeSelectorTsx} from '../rangeSelectorTsx';
import RowTsx from '../rowTsx';
import type {RangeSelectorProps} from '../rangeSelectorTsx';
import {ButtonIconTsx} from '../buttonIconTsx';
import ColorPickerTsx from '../colorPickerTsx';
import {i18n} from '../../lib/langPack';
import rootScope from '../../lib/rootScope';
import styles from './mediaEditor.module.scss';
import {hexaToRgba, hexToRgb, hexToRgbaWithOpacity} from '../../helpers/color';
import {ButtonCornerTsx} from '../buttonCornerTsx';
import {PenSvg, ArrowSvg, BrushSvg, NeonBrushSvg, BlurSvg, EraserSvg} from './tools-svg';
import {getMiddleware} from '../../helpers/middleware';
import {rotateImage, flipImage, tiltImage, changeImageBitmapSize} from './canvas';
import debounce from '../../helpers/schedulers/debounce';
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
import {isTextEntity, StickerEntity, StickerEntityType, TextEntity, TextEntityType, TransformableEntity} from './entities'
import ColorPicker from '../colorPicker';
import {DrawingManager, PenTool, ArrowTool, BrushTool, NeonTool, BlurTool, EraserTool} from './drawing';
import StickersTab from './sticker-tab';
import appDownloadManager from '../../lib/appManagers/appDownloadManager';
import throttle from '../../helpers/schedulers/throttle';
import EmoticonsDropdown from './emoticons-dropdown';
import {Crop} from './crop';
import type {CropAspectRatio} from './crop';
import wrapSticker from '../wrappers/sticker';
import ProgressivePreloader from '../preloader';
import {IS_WEBM_SUPPORTED} from '../../environment/videoSupport';
import {RenderManager} from './render';
import main_canvas_png from './sandbox/main-canvas.png';

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
  | 'sticker';

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
  title: string | HTMLElement;
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
  rotate: number; // rotate is angle we can apply with rotate button
  isFlipped: boolean;
  isApplied: boolean;
  aspectRatio: CropAspectRatio;
}

type MediaEditorRangeSelectorProps = RangeSelectorProps & {
  label: string | HTMLElement;
  style?: Record<string, string>;
}

const MediaEditorRangeSelector = (props: MediaEditorRangeSelectorProps) => {
  const [local, others] = splitProps(props, ['label']);

  const [initialValue, setInitialValue] = createSignal(props.value);
  const [currentValue, setCurrentValue] = createSignal(props.value);

  const handleValueChange = (value: number) => {
    if(others.onScrub) {
      others.onScrub(value);
      setCurrentValue(value);
    }
  };

  createEffect(() => {
    if(props.value !== currentValue()) {
      setCurrentValue(props.value);
    }
  });

  onMount(() => {
    setInitialValue(props.value);
  });

  return (
    <div class={styles.MediaEditorRangeSelector}>
      <div class={styles.MediaEditorRangeSelectorLegend}>
        <div class={styles.MediaEditorRangeSelectorLegendLabel}>
          {local.label}
        </div>
        <div classList={{
          [styles.MediaEditorRangeSelectorLegendValue]: true,
          [styles.MediaEditorRangeSelectorLegendValueDefault]: initialValue() === currentValue()
        }}>
          {currentValue()}
        </div>
      </div>

      <div classList={{
        [styles.MediaEditorRangeSelectorTrack]: true,
        [styles.MediaEditorRangeSelectorTrackInitial]: others.min === props.value,
        [styles.MediaEditorRangeSelectorTrackFilled]: others.max === props.value
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
  const DEFAULT_FONT_SIZE = 48;
  const DEFAULT_FONT_FAMILY = 'Roboto';
  const DEFAULT_FONT_COLOR = 'var(--primary-color)';

  let previewRef: HTMLDivElement;
  let loaderRef: HTMLDivElement;
  let previewContentRef: HTMLDivElement;
  let stickerTabRef: HTMLDivElement;
  let imageLayerCanvas: HTMLCanvasElement;
  let drawingLayerCanvas: HTMLCanvasElement;
  let workareaImage: ImageBitmap;

  let DrawingManagerInstance: DrawingManager;
  let ProgressivePreloaderInstance: ProgressivePreloader;

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
        size: 32,
        color: '#fff',
        instance: new BlurTool()
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
      // {
      //   'id': 0,
      //   'x': 0,
      //   'y': 0,
      //   'fontSize': 24,
      //   'rotate': 0,
      //   'textAlign': 'left',
      //   'color': 'rgba(51,199,89)',
      //   'type': 'text',
      //   'appearance': 'plain',
      //   'height': 'auto',
      //   'width': 'auto',
      //   'fontFamily': 'Comic Sans MS'
      // },
      // {
      //   'id': 1,
      //   'x': 255,
      //   'y': 380,
      //   'fontSize': 32,
      //   'fontFamily': 'Comic Sans MS',
      //   'rotate': 0,
      //   'textAlign': 'center',
      //   'color': 'rgba(255,255,255)',
      //   'type': 'text',
      //   'appearance': 'background',
      //   'height': 'auto',
      //   'width': 'auto'
      // }
      // {
      //   'id': 2,
      //   'x': 50,
      //   'y': 740,
      //   'fontSize': 18,
      //   'rotate': 0,
      //   'textAlign': 'left',
      //   'color': 'rgba(255,255,255)',
      //   'type': 'text',
      //   'appearance': 'border',
      //   'height': 'auto',
      //   'width': 'auto',
      //   'fontFamily': 'Times New Roman'
      // }
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

  const [isLoading, setIsLoading] = createSignal<boolean>(false);
  const [activeTab, setActiveTab] = createSignal<MediaEditorTab>('enhance');
  const [originalImage, setOriginalImage] = createSignal<HTMLImageElement>();
  const [workareaDimensions, setWorkareaDimensions] = createSignal<MediaEditorWorkareaDimensions>();
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

  const readBlobAsDataURL = (blob: any) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const renderMediaNew = async() => {
    const renderer = new RenderManager({
      entities: state.entities,
      imageLayerCanvas,
      drawingLayerCanvas
    });

    setIsLoading(true);

    const t0 = performance.now();
    const media = await renderer.render();
    const t1 = performance.now();
    console.log(`Rendering of video took ${(t1 - t0) / 1000} seconds.`);

    setIsLoading(false);

    props.onMediaSave(media);
    props.onClose();
  }

  const renderMediaForCrop = (angle: number) => {
    return new Promise(async(resolve, reject) => {
      const radians = angle * (Math.PI / 180);
      const width = imageLayerCanvas.width;
      const height = imageLayerCanvas.height;
      const newWidth = Math.abs(width * Math.cos(radians)) + Math.abs(height * Math.sin(radians));
      const newHeight = Math.abs(width * Math.sin(radians)) + Math.abs(height * Math.cos(radians));

      const resultCanvas = document.createElement('canvas');
      resultCanvas.width = newWidth;
      resultCanvas.height = newHeight;
      const resultCtx = resultCanvas.getContext('2d');

      resultCtx.translate(newWidth / 2, newHeight / 2);
      resultCtx.rotate(radians);

      const originalImageBitmap = await createImageBitmap(originalImage());
      const resizedWorkareaImage = await changeImageBitmapSize(originalImageBitmap, width, height);

      resultCtx.drawImage(
        resizedWorkareaImage,
        -width / 2,
        -height / 2,
        resizedWorkareaImage.width,
        resizedWorkareaImage.height
      );

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

    DrawingManagerInstance.update({
      size: state.tools[state.selectedToolId].size,
      color
    });
  };

  const setToolSize = (size: MediaEditorTool['size']) => {
    setState('tools', state.selectedToolId, {size});

    DrawingManagerInstance.update({
      color: state.tools[state.selectedToolId].color,
      size
    });
  };

  // * Entity Handlers
  const selectEntity = (id: number) => {
    setState({selectedEntityId: id});
  };

  const addStickerEntity = (container: StickerEntityType['container'], docId: StickerEntityType['docId'], stickerType: StickerEntityType['stickerType']) => {
    setState('entities', state.entities.length, {
      id: state.entities.length,
      x: 100,
      y: 200,
      width: 200,
      height: 200,
      rotate: 0,
      type: 'sticker',
      docId,
      stickerType,
      container
    });
  };

  // * Text Entity Handlers
  const addTextEntity = () => {
    const workareaCenterX = imageLayerCanvas.width / 2;
    const workareaCenterY = imageLayerCanvas.height / 2;

    const defaultTextWidth = 200;
    const defaultTextHeight = 50;

    setState('entities', state.entities.length, {
      id: state.entities.length,
      x: workareaCenterX - defaultTextWidth / 2,
      y: workareaCenterY - defaultTextHeight / 2,
      fontSize: DEFAULT_FONT_SIZE,
      fontFamily: DEFAULT_FONT_FAMILY,
      rotate: 0,
      textAlign: 'left',
      color: '#fff',
      type: 'text',
      appearance: 'plain',
      height: 'auto',
      width: 'auto'
    });

    setTimeout(() => {
      const textNode = previewRef.querySelector(`[data-ref="${state.entities.length - 1}"]`) as HTMLDivElement;
      textNode.focus();

      const range = document.createRange();
      const selection = window.getSelection();

      range.selectNodeContents(textNode);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }, 200);
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

    // Save the current state of the drawing layer as an image
    const drawingLayerImage = new Image();
    drawingLayerImage.src = drawingLayerCanvas.toDataURL();

    const oldDimensions = {
      width: previewContentRef.offsetWidth,
      height: previewContentRef.offsetHeight
    };

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

    // Clear and restore the drawing layer with the scaled image
    drawingLayerImage.onload = () => {
      if(drawingLayerCtx) {
        drawingLayerCtx.clearRect(0, 0, drawingLayerCanvas.width, drawingLayerCanvas.height);
        drawingLayerCtx.drawImage(drawingLayerImage, 0, 0, oldDimensions.width, oldDimensions.height, 0, 0, dimensions.width, dimensions.height);
      }
    };

    const scaleX = dimensions.width / oldDimensions.width;
    const scaleY = dimensions.height / oldDimensions.height;

    // Update coordinates of text entities
    setState('entities', (entities) => {
      return entities.map(entity => ({
        ...entity,
        x: entity.x * scaleX,
        y: entity.y * scaleY
      }));
    });
  }, 16);

  onMount(() => {
    const setupStickers = () => {
      EmoticonsDropdown.init(
        {
          handleStickerClick: async(target: any) => {
            const doc = await rootScope.managers.appDocsManager.getDoc(target.dataset.docId);
            const wrapper = document.createElement('div');
            const middleware = getMiddleware();

            wrapSticker({
              doc,
              div: wrapper,
              loop: true,
              play: true,
              withThumb: false,
              loopEffect: true,
              middleware: middleware.get()
            });

            if(IS_WEBM_SUPPORTED) {
              addStickerEntity(wrapper, target.dataset.docId, doc.sticker);
            } else {
              if(doc.sticker === 3) {
                // We treat video sticker as static in Safari
                addStickerEntity(wrapper, target.dataset.docId, 1);
              }

              addStickerEntity(wrapper, target.dataset.docId, doc.sticker);
            }
          }
        }
      );
    };

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

      appDownloadManager.construct(rootScope.managers);

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
    } else if(props.mediaFile === null) {
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

    DrawingManagerInstance = new DrawingManager(drawingLayerCanvas, imageLayerCanvas, previewContentRef);

    ProgressivePreloaderInstance = new ProgressivePreloader({
      isUpload: true,
      cancelable: false,
      tryAgainOnFail: false
    });

    ProgressivePreloaderInstance.attach(loaderRef, false);

    setupStickers();

    // setupStickers();
    // DrawingManagerInstance = new DrawingManager(drawingLayerCanvas, previewContentRef);

    window.addEventListener('resize', handleWindowResize);
  });

  const handleMediaEditorCloseClick = () => {
    props.onClose();
  };

  onCleanup(() => {
    window.removeEventListener('resize', handleWindowResize);
  });

  createEffect(on(activeTab, () => {
    if(activeTab() === 'brush') {
      DrawingManagerInstance.activate(
        state.tools[state.selectedToolId].instance,
        state.tools[state.selectedToolId].color,
        state.tools[state.selectedToolId].size
      );
    } else {
      DrawingManagerInstance.deactivate();
    }

    if(activeTab() === 'sticker' && !stickerTabRef.childNodes.length) {
      const stickers = EmoticonsDropdown.getElement();
      stickerTabRef.appendChild(stickers);

      const activeButton  = stickers.querySelector('.btn-icon.menu-horizontal-div-item.active');

      if(activeButton) {
        (activeButton as HTMLButtonElement).click();
      }
    }
  }));

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
              id="loaderRef"
              ref={loaderRef}
              classList={{
                [styles.MediaEditorLoader]: true,
                [styles.MediaEditorLoaderActive]: isLoading()
              }}
            />

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
            <Crop
              state={state.crop}
              image={cropPreview()}
              onCropChange={onCropChange}
            />
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

            <div class={styles.MediaEditorSidebarHeaderTitle}>
              {i18n('MediaEditor.Title')}
            </div>
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
                class={classNames(styles.MediaEditorSidebarTabsListTab, activeTab() === 'sticker' && styles.active)}
                onClick={() => handleTabClick('sticker')}
              />
            </div>

            <div class={styles.MediaEditorSidebarTabsContent}>
              {activeTab() === 'enhance' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>
                  <div class={styles.MediaEditorSidebarTabsContentTabPanelFilter}>
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Enhance')}
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleEnhanceUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Brightness')}
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleBrigthnessUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Contrast')}
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleContrastUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Saturation')}
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleSaturationUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Warmth')}
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleWarmthUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Fade')}
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFadeUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Highlights')}
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleHighlightsUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Shadows')}
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleShadowsUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Vignette')}
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleVignetteUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Sharpen')}
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleSharpUpdate}
                    />
                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.Filter.Grain')}
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
                    {i18n('MediaEditor.AspectRatio.Title')}
                  </div>

                  <div class={styles.MediaEditorSidebarTabsContentTabPanelCrop}>
                    <RowTsx
                      title={i18n('MediaEditor.AspectRatio.Free')}
                      icon='aspect_ratio_free'
                      clickable={() => setState('crop', {aspectRatio: 'Free'})}
                      rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === 'Free' && styles.Active]}
                    />

                    <RowTsx
                      title={i18n('MediaEditor.AspectRatio.Original')}
                      icon='aspect_ratio_image_original'
                      clickable={() => setState('crop', {aspectRatio: 'Original'})}
                      rowClasses={[styles.MediaEditorRow, state.crop.aspectRatio === 'Original' && styles.Active]}
                    />

                    <RowTsx
                      title={i18n('MediaEditor.AspectRatio.Square')}
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
                      title={i18n('MediaEditor.Crop.Apply')}
                      icon='check1'
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
                        label={i18n('MediaEditor.ControlLabel.Size')}
                        min={10}
                        max={64}
                        step={1}
                        onScrub={setTextEntityFontSize}
                        value={(state.entities[state.selectedEntityId] as TextEntityType)?.fontSize ?? DEFAULT_FONT_SIZE}
                        style={{
                          '--color': `${(state.entities[state.selectedEntityId] as TextEntityType)?.color ?? DEFAULT_FONT_COLOR}`
                        }}
                      />
                    </div>

                    <div>
                      <div class={styles.MediaEditorSidebarSectionHeader}>
                        {i18n('MediaEditor.ControlLabel.Controls')}
                      </div>

                      <RowTsx title={i18n('MediaEditor.ControlLabel.AddText')} clickable={addTextEntity} />
                    </div>

                    <div>
                      <div class={styles.MediaEditorSidebarSectionHeader}>
                        {i18n('MediaEditor.ControlLabel.Font')}
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
                  <div class={styles.MediaEditorSidebarTabsContentTabPanelDrawing}>
                    <div class={styles.MediaEditorSidebarTabsContentTabPanelTextRow}>
                      <MediaEditorColorPicker onChange={(color) => setToolColor(color.rgba)} />
                    </div>

                    <MediaEditorRangeSelector
                      label={i18n('MediaEditor.ControlLabel.Size')}
                      min={10}
                      max={48}
                      step={1}
                      value={state.tools[state.selectedToolId].size}
                      onScrub={setToolSize}
                      style={{
                        '--color': state.tools[state.selectedToolId].color
                      }}
                    />

                    <div>
                      <div class={styles.MediaEditorSidebarSectionHeader}>
                        Tool
                      </div>

                      <MediaEditorTool
                        title={i18n('MediaEditor.Tool.Pen')}
                        color={state.tools[0].color}
                        svg={<PenSvg />}
                        isSelected={state.selectedToolId === 0}
                        onClick={() => selectTool(0)}
                      />

                      <MediaEditorTool
                        title={i18n('MediaEditor.Tool.Arrow')}
                        color={state.tools[1].color}
                        svg={<ArrowSvg />}
                        isSelected={state.selectedToolId === 1}
                        onClick={() => selectTool(1)}
                      />

                      <MediaEditorTool
                        title={i18n('MediaEditor.Tool.Brush')}
                        color={state.tools[2].color}
                        svg={<BrushSvg />}
                        isSelected={state.selectedToolId === 2}
                        onClick={() => selectTool(2)}
                      />

                      <MediaEditorTool
                        title={i18n('MediaEditor.Tool.Neon')}
                        color={state.tools[3].color}
                        svg={<NeonBrushSvg />}
                        isSelected={state.selectedToolId === 3}
                        onClick={() => selectTool(3)}
                      />

                      <MediaEditorTool
                        title={i18n('MediaEditor.Tool.Blur')}
                        color={state.tools[4].color}
                        svg={<BlurSvg />}
                        isSelected={state.selectedToolId === 4}
                        onClick={() => selectTool(4)}
                      />

                      <MediaEditorTool
                        title={i18n('MediaEditor.Tool.Eraser')}
                        color={state.tools[5].color}
                        svg={<EraserSvg />}
                        isSelected={state.selectedToolId === 5}
                        onClick={() => selectTool(5)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab() === 'sticker' && (
                <div ref={stickerTabRef} class={classNames(styles.MediaEditorSidebarTabsContentTabPanel, styles.Stickers)} />
              )}
            </div>
          </div>

          <ButtonCornerTsx
            icon='check'
            className='is-visible'
            onClick={() => {
              renderMediaNew();
            }}
          />
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
