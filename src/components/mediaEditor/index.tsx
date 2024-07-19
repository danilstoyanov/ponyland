import {Portal} from 'solid-js/web';
import {createStore, unwrap} from 'solid-js/store';
import {ChatType} from '../chat/chat';
import {createEffect, createSignal, JSX, For, on, onMount, Show, splitProps} from 'solid-js';
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
// import png from './main-canvas.png';
import png from './main-canvas-big.png';
import debounce from '../../helpers/schedulers/debounce';
import {useAppState} from '../../stores/appState';
import {
  applyBrightness,
  applyContrast,
  applyVignetteEffect,
  applyEnhanceEffect,
  applySaturation,
  applyWarmth,
  applyFade,
  applyHighlights,
  applySelectiveShadow,
  applyGrain
} from './filters';
import {StickerEntityType, TextEntityType, TransformableEntity} from './entities'
import ColorPicker from '../colorPicker';
import {DrawingManager, PenTool, ArrowTool, BrushTool, NeonTool, EraserTool} from './drawing';
import StickersTab from './sticker-tab';
import appDownloadManager from '../../lib/appManagers/appDownloadManager';

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

const MediaEditorRangeSelector = (props: RangeSelectorProps & { label: string }) => {
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
        <div class={classNames(styles.MediaEditorRangeSelectorLegendValue, currentValue() === props.value && styles.MediaEditorRangeSelectorLegendValueDefault)}>
          {currentValue()}
        </div>
      </div>

      <div class={styles.MediaEditorRangeSelectorTrack}>
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
  selectedEntityId: number;
  selectedToolId: number;
  tools: MediaEditorTool[];
  entities: Array<TextEntityType | StickerEntityType>;
};

export const MediaEditor = () => {
  let previewRef: HTMLDivElement;
  let stickerTabRef: HTMLDivElement;
  let filterLayerCanvas: HTMLCanvasElement;
  let drawingLayerCanvas: HTMLCanvasElement;
  let DrawingManagerInstance: DrawingManager;

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
        id: 0,
        x: 100,
        y: 100,
        width: 300,
        height: 100,
        type: 'text',
        textAlign: 'left',
        appearance: 'plain',
        backgroundColor: '',
        fontSize: 32,
        fontFamily: 'Roboto',
        color: '#fff',
        rotate: 0
      }
    ]
  }

  const [activeTab, setActiveTab] = createSignal<MediaEditorTab>('smile');

  const [state, setState] = createStore<MediaEditorStateType>(initialState);

  const handleTabClick = (tab: MediaEditorTab) => {
    setActiveTab(tab);
  };

  function getScaledImageSize(previewRef: any, originalImageRef: any): { width: number, height: number } {
    const previewWidth = previewRef.clientWidth;
    const previewHeight = previewRef.clientHeight;

    // Используем натуральные размеры изображения
    const originalWidth = originalImageRef.naturalWidth;
    const originalHeight = originalImageRef.naturalHeight;

    // Рассчитываем соотношения сторон
    const widthRatio = previewWidth / originalWidth;
    const heightRatio = previewHeight / originalHeight;

    // Выбираем наименьший коэффициент масштабирования
    const scale = Math.min(widthRatio, heightRatio);

    // Вычисляем новые размеры
    const newWidth = originalWidth * scale;
    const newHeight = originalHeight * scale;

    // Возвращаем новые размеры
    return {
      width: newWidth,
      height: newHeight
    };
  }

  // * Canvas Renderer
  const renderMedia = () => {
    alert('render media');

    /*
      порядок рендеринга, пока не учитываем обрезку

      1 слой с фото соединяем со слоем для рисования
    */
  };

  // * Handlers
  const handleFilterUpdate = (type: FilterType) => {
    const FILTER_DEBOUNCE_MS = 300;

    return (value: number) => {
      const filterMap: Record<FilterType, () => void> = {
        enhance: debounce(() => applyEnhanceEffect(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        brightness: debounce(() => applyBrightness(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        contrast: debounce(() => applyContrast(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        fade: debounce(() => applyFade(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        grain: debounce(() => applyGrain(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        highlights: debounce(() => applyHighlights(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        saturation: debounce(() => applySaturation(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        shadows: debounce(() => applySelectiveShadow(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        sharpen: debounce(() => applyVignetteEffect(filterLayerCanvas, value), FILTER_DEBOUNCE_MS, true, false),
        vignette: debounce(() => {}, FILTER_DEBOUNCE_MS),
        warmth: debounce(() => applyWarmth(filterLayerCanvas, value), FILTER_DEBOUNCE_MS)
      }

      filterMap[type]();
    };
  };

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

  // * Text Entity Handlers
  const addTextEntity = () => {
    setState('entities', state.entities.length, {
      id: state.entities.length,
      x: 100,
      y: 200,
      fontSize: 24,
      rotate: 0,
      textAlign: 'left',
      backgroundColor: '',
      color: 'white',
      type: 'text',
      appearance: 'plain',
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

  // * On Mount
  onMount(() => {
    const image = new Image();

    image.addEventListener('load', async() => {
      const dimensions = getScaledImageSize(previewRef, image);

      previewRef.style.width = `${dimensions.width}px`;
      previewRef.style.height = `${dimensions.height}px`;

      filterLayerCanvas.width = dimensions.width;
      filterLayerCanvas.height = dimensions.height;

      drawingLayerCanvas.width = dimensions.width;
      drawingLayerCanvas.height = dimensions.height;

      const ctx = filterLayerCanvas.getContext('2d');
      ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);

      const drawingCtx = drawingLayerCanvas.getContext('2d');
      drawingCtx.fillStyle = 'blue';
      drawingCtx.fillRect(0, 0, 400, 800);

      DrawingManagerInstance = new DrawingManager(drawingLayerCanvas, previewRef);
      DrawingManagerInstance.activate(state.tools[state.selectedToolId].instance, state.tools[state.selectedToolId].color, state.tools[state.selectedToolId].size);

      console.log(rootScope.managers, 'rootScope.managers', rootScope.managers.apiFileManager);

      // rootScope.managers.

      appDownloadManager.construct(rootScope.managers);

      const stickers = new StickersTab(rootScope.managers);
      stickers.init();

      stickerTabRef.appendChild(stickers.container);

      console.log('stickers: ', stickers);

      // const node = createSearch();
      // console.log('node: ', node);
    });

    image.src = png;
  });

  return (
    <div class={styles.MediaEditor}>
      <div class={styles.MediaEditorContainer}>
        <div class={styles.MediaEditorPreview}>
          <div class={styles.MediaEditorPreviewContent} ref={previewRef}>
            <For each={state.entities}>
              {(entity) => {
                return (
                  <TransformableEntity
                    previewRef={previewRef}
                    id={entity.id}
                    x={entity.x}
                    y={entity.y}
                    isSelected={entity.id === state.selectedEntityId}
                    onMove={({x, y}) => {
                      if(entity.id !== state.selectedEntityId) {
                        selectEntity(entity.id);
                      }

                      setState('entities', entity.id, {x, y});
                    }}
                    controls={[
                      <ButtonIconTsx icon='delete_filled'  onClick={() => deleteTextEntity()} />
                    ]}
                  >
                    <div contentEditable="plaintext-only" style={{
                      'text-align': (entity as TextEntityType)?.textAlign,
                      'font-family': (entity as TextEntityType)?.fontFamily,
                      'font-size': (entity as TextEntityType)?.fontSize + 'px',
                      'color': (entity as TextEntityType)?.color

                      // text shadow
                      // 'text-shadow': '-2px 0 black, 0 2px black, 2px 0 black, 0 -2px black'
                      // backgroundColor: red
                    }} class={styles.Text}>
                      Контент будет здесь, тест
                    </div>
                  </TransformableEntity>
                )
              }}
            </For>

            <canvas class={classNames(styles.MediaEditorPreviewLayer, styles.MediaEditorPreviewDrawingLayer)} ref={drawingLayerCanvas} />
            <canvas class={classNames(styles.MediaEditorPreviewLayer, styles.MediaEditorPreviewFilterLayer)} ref={filterLayerCanvas} />
          </div>
        </div>

        <div class={styles.MediaEditorSidebar}>
          <div class={styles.MediaEditorSidebarHeader}>
            <div class={styles.MediaEditorSidebarHeaderCloseButton}>
              <ButtonIconTsx icon="close" class="sidebar-back-button" />
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
                onClick={() => handleTabClick('crop')}
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
                      onScrub={handleFilterUpdate('enhance')}
                    />
                    <MediaEditorRangeSelector
                      label="Brightness"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('brightness')}
                    />
                    <MediaEditorRangeSelector
                      label="Contrast"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('contrast')}
                    />
                    <MediaEditorRangeSelector
                      label="Saturation"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('saturation')}
                    />
                    <MediaEditorRangeSelector
                      label="Warmth"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('warmth')}
                    />
                    <MediaEditorRangeSelector
                      label="Fade"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('fade')}
                    />
                    <MediaEditorRangeSelector
                      label="Highlights"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('highlights')}
                    />
                    <MediaEditorRangeSelector
                      label="Shadows"
                      min={-1}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('shadows')}
                    />
                    <MediaEditorRangeSelector
                      label="Vignette"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('vignette')}
                    />
                    <MediaEditorRangeSelector
                      label="Grain"
                      min={0}
                      max={1}
                      step={0.01}
                      value={0}
                      onScrub={handleFilterUpdate('grain')}
                    />
                  </div>
                </div>
              )}

              {activeTab() === 'crop' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>
                  <div class={styles.MediaEditorSidebarSectionHeader}>
                    Aspect ratio
                  </div>

                  <div class={styles.MediaEditorSidebarTabsContentTabPanelCrop}>
                    <RowTsx title='Free' icon='aspect_ratio_free' clickable={() => true} />
                    <RowTsx title='Original' icon='aspect_ratio_image_original' clickable={() => true} />
                    <RowTsx title='Square' icon='aspect_ratio_square' clickable={() => true} />

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx title='3:2' icon='aspect_ratio_3_2' clickable={() => true} />
                      <RowTsx
                        title='2:3'
                        icon='aspect_ratio_3_2'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => true}
                      />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx title='4:3' icon='aspect_ratio_4_3' clickable={() => true} />
                      <RowTsx
                        title='3:4'
                        icon='aspect_ratio_4_3'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => true}
                      />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx title='5:4' icon='aspect_ratio_5_4' clickable={() => true} />
                      <RowTsx
                        title='4:5'
                        icon='aspect_ratio_5_4'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => true}
                      />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx title='7:5' icon='aspect_ratio_7_5' clickable={() => true} />
                      <RowTsx
                        title='5:7'
                        icon='aspect_ratio_7_5'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => true}
                      />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelCropRow}>
                      <RowTsx title='16:9' icon='aspect_ratio_16_9' clickable={() => true} />
                      <RowTsx
                        title='9:16'
                        icon='aspect_ratio_16_9'
                        iconClasses={['row-icon-rotated']}
                        clickable={() => true}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab() === 'text' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>
                  <div class={styles.MediaEditorSidebarTabsContentTabPanelText}>
                    <div class={styles.MediaEditorSidebarTabsContentTabPanelTextRow}>
                      <MediaEditorColorPicker onChange={(color) => setTextEntityFontColor(color.rgba)} />
                    </div>

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelTextRow}>
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
                            // setEntities((value) => {
                            //   return value.map((item, idx) => idx === selectedEntityId() ? {...item, appearance: 'plain'} : item);
                            // })
                          }}
                        />

                        <ButtonIconTsx
                          icon="font_black"
                          class={classNames(styles.Button, styles.ButtonMediumSize, (state.entities[state.selectedEntityId] as TextEntityType)?.appearance === 'border' && styles.Active)}
                          onClick={() => {
                            // setEntities((value) => {
                            // return value.map((item, idx) => idx === selectedEntityId() ? {...item, appearance: 'border'} : item);
                            // })
                          }}
                        />

                        <ButtonIconTsx
                          icon="font_white"
                          class={classNames(styles.Button, (state.entities[state.selectedEntityId] as TextEntityType)?.appearance === 'background' && styles.Active)}
                          onClick={() => {
                            // setEntities((value) => {
                            // return value.map((item, idx) => idx === selectedEntityId() ? {...item, appearance: 'background'} : item);
                            // })
                          }}
                        />
                      </div>
                    </div>

                    <MediaEditorRangeSelector
                      label="Size"
                      min={10}
                      max={64}
                      step={1}
                      value={16}
                      onScrub={(value) => setTextEntityFontSize(value)}
                    />

                    <div class={styles.MediaEditorSidebarSectionHeader}>
                      Controls
                    </div>

                    <RowTsx title='Add text' clickable={addTextEntity} />
                    <RowTsx title='Remove text' clickable={() => true} />
                    <RowTsx title='Render result' clickable={renderMedia} />

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
                <div class={styles.MediaEditorSidebarTabsContentTabPanel} ref={stickerTabRef}>
                  <h1>STICKERS</h1>
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

export const createMediaEditor = () => {
  return (
    <Portal mount={document.getElementById('media-editor')}>
      <MediaEditor />
    </Portal>
  );
};

