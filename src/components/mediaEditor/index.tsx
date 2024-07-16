import {Dynamic, Portal} from 'solid-js/web';
import {createEffect, createSignal, For, on, onMount, splitProps} from 'solid-js';
import classNames from '../../helpers/string/classNames';
import {RangeSelectorTsx} from '../rangeSelectorTsx';
import RowTsx from '../rowTsx';
import type {RangeSelectorProps} from '../rangeSelectorTsx';
import {ButtonIconTsx} from '../buttonIconTsx';
import {Ripple} from '../rippleTsx';
import ColorPickerTsx from '../colorPickerTsx';
import styles from './mediaEditor.module.scss';
import {hexToRgbaWithOpacity} from '../../helpers/color';
import ButtonMenu from '../buttonMenu';
import ButtonIcon from '../buttonIcon';
import {PenSvg, ArrowSvg, BrushSvg, NeonBrushSvg, BlurSvg, EraserSvg} from './tools';
// import png from './main-canvas.png';
import png from './main-canvas-big.png';
import {makeMediaSize} from '../../helpers/mediaSize';
import scaleMediaElement from '../../helpers/canvas/scaleMediaElement';
import { useAppState } from '../../stores/appState';

// class={classNames(
//   styles.ViewerStoryMediaAreaReactionBubbles,

// .sidebar
// &-header
// &-close-button
// &-content

/* Navbar & Tabs */


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

const MediaEditorColorPicker = () => {
  const colors = [
    '#FFFFFF',
    '#FE4438',
    '#FF8901',
    '#FFD60A',
    '#33C759',
    '#62E5E0',
    '#0A84FF',
    '#BD5CF3'
  ];

  const ripplifiedColors = colors.map(color => `rgba(${hexToRgbaWithOpacity(color, 0.2).join(', ')})`);

  return (
    <div class={styles.MediaEditorColorPicker}>
      <div class={styles.MediaEditorColorPickerTabs}>
        <For each={colors}>
          {(_, index) => (
            <ButtonIconTsx style={{
              '--color-picker-tabs-circle-color': colors[index()],
              '--color-picker-tabs-circle-ripple-color': ripplifiedColors[index()]
            }}>
              <div class={styles.MediaEditorColorPickerTabsCircle} />
            </ButtonIconTsx>
          )}
        </For>

        <ButtonIconTsx style={{
          '--color-picker-tabs-circle-color': colors[0],
          '--color-picker-tabs-circle-ripple-color': ripplifiedColors[0]
        }}>
          <div class={styles.MediaEditorColorPickerTabsCircle} />
        </ButtonIconTsx>
      </div>

      {/* <ColorPickerTsx class={styles.MediaEditorColorPickerWidget} /> */}
    </div>
  )
};

const MediaEditorTool = (props: {svg: any; color: string; title: string}) => {
  // <div class={styles.MediaEditorColorPicker}>
  //   <div class={styles.MediaEditorColorPickerTabs}>
  //     <For each={colors}>
  //       {(_, index) => (
  //         <ButtonIconTsx style={{
  //           '--color-picker-tabs-circle-color': colors[index()],
  //           '--color-picker-tabs-circle-ripple-color': ripplifiedColors[index()]
  //         }}>
  //           <div class={styles.MediaEditorColorPickerTabsCircle} />
  //         </ButtonIconTsx>
  //       )}
  //     </For>

  //     <ButtonIconTsx style={{
  //       '--color-picker-tabs-circle-color': colors[0],
  //       '--color-picker-tabs-circle-ripple-color': ripplifiedColors[0]
  //     }}>
  //       <div class={styles.MediaEditorColorPickerTabsCircle} />
  //     </ButtonIconTsx>
  //   </div>

  //   {/* <ColorPickerTsx class={styles.MediaEditorColorPickerWidget} /> */}
  // </div>

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
    <RowTsx title={ret} clickable={true} rowClasses={[styles.Tool, 'row-small']} />
  );
};

const MediaEditorPreview = () => {

};

const MediaEditorMainCanvas = () => {

};

// protected setFullAspect(aspecter: HTMLDivElement, containerRect: DOMRect, rect: DOMRect) {
//   /* let media = aspecter.firstElementChild;
//   let proportion: number;
//   if(media instanceof HTMLImageElement) {
//     proportion = media.naturalWidth / media.naturalHeight;
//   } else if(media instanceof HTMLVideoElement) {
//     proportion = media.videoWidth / media.videoHeight;
//   } */
//   const proportion = containerRect.width / containerRect.height;

//   let {width, height} = rect;
//   /* if(proportion === 1) {
//     aspecter.style.cssText = '';
//   } else { */
//   if(proportion > 0) {
//     width = height * proportion;
//   } else {
//     height = width * proportion;
//   }

//   // this.log('will set style aspecter:', `width: ${width}px; height: ${height}px; transform: scale(${containerRect.width / width}, ${containerRect.height / height});`);

//   aspecter.style.cssText = `width: ${width}px; height: ${height}px; transform: scale3d(${containerRect.width / width}, ${containerRect.height / height}, 1);`;
//   // }
// }


export const MediaEditor = () => {
  const [appState, setAppState] = useAppState();
  const [activeTab, setActiveTab] = createSignal('brush');

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
  };

  let previewRef: HTMLDivElement;
  let originalImageRef: HTMLImageElement;
  let filterLayerCanvas: HTMLCanvasElement;
  let drawingLayerCanvas: HTMLCanvasElement;

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
      width: newWidth, height: newHeight
    };
  }

  onMount(() => {
    // previewRef.clientWidth:  1685
    // previewRef.clientHeight:  699

    // originalImageRef.clientWidth:  2616
    // originalImageRef.clientHeight:  3488

    // originalImageAspectRatio:  0.75

    const image = new Image();

    image.addEventListener('load', async() => {
      console.log('image: ', image.naturalWidth);
      console.log('image height: ', image.naturalHeight);

      const dimensions = getScaledImageSize(previewRef, image);

      console.log(dimensions);

      // originalImageRef.style.width = `${dimensions.width}px`;
      // originalImageRef.style.height = `${dimensions.height}px`;

      previewRef.style.width = `${dimensions.width}px`;
      previewRef.style.height = `${dimensions.height}px`;

      filterLayerCanvas.width = dimensions.width;
      filterLayerCanvas.height = dimensions.height;

      const ctx = filterLayerCanvas.getContext('2d');
      ctx.drawImage(image, 0, 0, dimensions.width, dimensions.height);
    });

    image.src = png;
  });

  return (
    <div class={styles.MediaEditor}>
      <div class={styles.MediaEditorContainer}>
        <div class={styles.MediaEditorPreview} ref={previewRef}>
          <canvas ref={drawingLayerCanvas}/>
          <canvas ref={filterLayerCanvas}/>

          {/* <img src={png} ref={originalImageRef} /> */}
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
                    <MediaEditorRangeSelector label="Enhance" min={0} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Brightness" min={-1} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Contrast" min={-1} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Saturation" min={-1} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Warmth" min={-1} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Fade" min={0} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Highlights" min={0} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Shadows" min={-1} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Vignette" min={0} max={1} step={0.01} value={0} />
                    <MediaEditorRangeSelector label="Grain" min={0} max={1} step={0.01} value={0} />
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
                    <MediaEditorColorPicker />

                    <div class={styles.MediaEditorSidebarTabsContentTabPanelTextRow}>
                      <div class={styles.MediaEditorSidebarTabsContentTabPanelTextCol}>
                        <ButtonIconTsx
                          icon="text_align_left"
                          noRipple={true}
                        />

                        <ButtonIconTsx
                          icon="text_align_centre"
                          noRipple={true}
                        />

                        <ButtonIconTsx
                          icon="text_align_right"
                          noRipple={true}
                        />
                      </div>

                      <div class={styles.MediaEditorSidebarTabsContentTabPanelTextCol}>
                        <ButtonIconTsx
                          icon="font_no_frame"
                          noRipple={true}
                        />

                        <ButtonIconTsx
                          icon="font_black"
                          noRipple={true}
                        />

                        <ButtonIconTsx
                          icon="font_white"
                          noRipple={true}
                        />
                      </div>
                    </div>

                    <MediaEditorRangeSelector label="Size" min={10} max={48} step={1} value={14} />

                    <div class={styles.MediaEditorSidebarSectionHeader}>
                      Aspect ratio
                    </div>

                    <RowTsx title='Roboto' clickable={() => true} />
                    <RowTsx title='Typewriter' clickable={() => true} />
                    <RowTsx title='Avenir Next' clickable={() => true} />
                    <RowTsx title='Courier New' clickable={() => true} />
                    <RowTsx title='Noteworthy' clickable={() => true} />
                    <RowTsx title='Georgia' clickable={() => true} />
                    <RowTsx title='Papyrus' clickable={() => true} />
                    <RowTsx title='Snell Roundhand' clickable={() => true} />
                  </div>
                </div>
              )}
              {activeTab() === 'brush' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>

                  <MediaEditorRangeSelector label="Size" min={10} max={48} step={1} value={14} />

                  <div class={styles.MediaEditorSidebarSectionHeader}>
                    Tool
                  </div>

                  <MediaEditorTool title="Pen" svg={<PenSvg />} color="red" />
                  <MediaEditorTool title="Arrow" svg={<ArrowSvg />} color="green" />
                  <MediaEditorTool title="Brush" svg={<BrushSvg />} color="blue" />
                  <MediaEditorTool title="Neon" svg={<NeonBrushSvg />} color="orange" />
                  <MediaEditorTool title="Blur" svg={<BlurSvg />} color="purple" />
                  <MediaEditorTool title="Eraser" svg={<EraserSvg />} color="blue" />
                </div>
              )}
              {activeTab() === 'smile' && (
                <div class={styles.MediaEditorSidebarTabsContentTabPanel}>
                  <h1>STICKERS</h1>
                </div>
              )}
            </div>
          </div>
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

{/* <div class="search-super-tabs-scrollable menu-horizontal-scrollable sticky">
  <div class="scrollable scrollable-x search-super-nav-scrollable">
    <nav class="search-super-tabs menu-horizontal-div">
      <div class="menu-horizontal-div-item rp hide">
        <span class="menu-horizontal-div-item-span"><span class="i18n">Chats</span><i></i></span>
        <div class="c-ripple"></div>
      </div>
      <div class="menu-horizontal-div-item rp hide">
        <span class="menu-horizontal-div-item-span"><span class="i18n">Stories</span><i></i></span>
        <div class="c-ripple"></div>
      </div>
      <div class="menu-horizontal-div-item rp active">
        <span class="menu-horizontal-div-item-span"><span class="i18n">Members</span><i class="animate" style="transform: none;"></i></span>
        <div class="c-ripple"></div>
      </div>
    </nav>
  </div>
</div> */}
