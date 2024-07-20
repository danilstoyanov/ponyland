import {createEffect, onCleanup, onMount, Show, splitProps} from 'solid-js';
import {ButtonIconTsx} from '../buttonIconTsx'
import styles from './mediaEditor.module.scss'
import resizeableImage from './resizeableImage';

export type CropAspectRatio = 'Free'
  | 'Original'
  | 'Square'
  | '3:2'
  | '2:3'
  | '4:3'
  | '3:4'
  | '5:4'
  | '4:5'
  | '7:5'
  | '5:7'
  | '16:9'
  | '9:16';

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CropPops {
  image: HTMLImageElement;
  aspectRatio: CropAspectRatio;
  onCrop: () => void;
}

export const Crop = (props: CropPops) => {
  let containerRef: HTMLDivElement;
  let cropImageRef: HTMLImageElement;

  let cropImage: HTMLImageElement,
    cropLeft = 0,
    cropTop = 0,
    cropWidth = 0,
    cropHeight = 0,
    scaledRatio = 0;

  const CROPWIDTH = 200;
  const CROPHEIGHT = 200;

  const event_state: Partial<{
    mouse_x: number,
    mouse_y: number,
    container_width: number,
    container_height: number,
    container_left: number,
    container_top: number
  }> = {};

  function generateDegreesArray() {
    const start = -180;
    const end = 180;
    const step = 15;
    const degreesArray = [];

    for(let i = start; i <= end; i += step) {
      degreesArray.push(i);
    }

    return degreesArray;
  };

  const degrees = generateDegreesArray();

  function addHandlers() {
    containerRef.addEventListener('mousedown', startMoving, false);
    containerRef.addEventListener('touchstart', startMoving, false);
  }

  function updateCropSize(width: number, height: number) {
    cropWidth = width * scaledRatio;
    cropHeight = height * scaledRatio;

    containerRef.style.width = width + 'px';
    containerRef.style.height = height + 'px';
  }

  function updateCropImage(left: number, top: number) {
    cropTop = top * scaledRatio;
    cropLeft = left * scaledRatio;

    cropImageRef.style.top = -top + 'px';
    cropImageRef.style.left = -left + 'px';
  }

  function updateContainer(left: number, top: number) {
    containerRef.style.top = top + 'px';
    containerRef.style.left = left + 'px';
  }

  // Events
  // Save the initial event details and container state
  function saveEventState(e: any) {
    event_state.container_width = containerRef.offsetWidth;
    event_state.container_height = containerRef.offsetHeight;

    event_state.container_left = containerRef.offsetLeft;
    event_state.container_top = containerRef.offsetTop;

    event_state.mouse_x = (e.clientX || e.pageX || e.touches && e.touches[0].clientX) + window.scrollX;
    event_state.mouse_y = (e.clientY || e.pageY || e.touches && e.touches[0].clientY) + window.scrollY;
  }

  function removeHandlers() {
    containerRef.removeEventListener('mousedown', startMoving);
    containerRef.removeEventListener('touchstart', startMoving);

    document.removeEventListener('mouseup', endMoving);
    document.removeEventListener('touchend', endMoving);
    document.removeEventListener('mousemove', moving);
    document.removeEventListener('touchmove', moving);
  }

  function startMoving(e: MouseEvent | TouchEvent) {
    e.preventDefault();
    e.stopPropagation();

    saveEventState(e);

    document.addEventListener('mousemove', moving);
    document.addEventListener('touchmove', moving);
    document.addEventListener('mouseup', endMoving);
    document.addEventListener('touchend', endMoving);
  }

  function endMoving(e: MouseEvent | TouchEvent) {
    e.preventDefault();

    document.removeEventListener('mouseup', endMoving);
    document.removeEventListener('touchend', endMoving);
    document.removeEventListener('mousemove', moving);
    document.removeEventListener('touchmove', moving);
  }

  function moving(e: any) {
    const currentTouch = {x: 0, y: 0};

    e.preventDefault();
    e.stopPropagation();

    currentTouch.x = e.pageX || e.touches && e.touches[0].pageX;
    currentTouch.y = e.pageY || e.touches && e.touches[0].pageY;

    let left = currentTouch.x - (event_state.mouse_x - event_state.container_left);
    let top = currentTouch.y - (event_state.mouse_y - event_state.container_top);
    const w = containerRef.offsetWidth;
    const h = containerRef.offsetHeight;

    if(left < 0) left = 0;
    else if(left > cropImageRef.offsetWidth - w) left = cropImageRef.offsetWidth - w;

    if(top < 0) top = 0;
    else if(top > cropImageRef.offsetHeight - h) top = cropImageRef.offsetHeight - h;

    updateCropImage(left, top);
    updateContainer(left, top);
  }

  onMount(() => {
    // scaledRatio = props.image.naturalWidth / props.image.offsetWidth;
    scaledRatio = 1;

    // const left = props.image.offsetWidth / 2 - CROPWIDTH / 2;
    // const top = props.image.offsetHeight / 2 - CROPHEIGHT / 2;


    const left = props.image.offsetWidth / 2 - CROPWIDTH / 2;
    const top = props.image.offsetHeight / 2 - CROPHEIGHT / 2;

    updateCropSize(CROPWIDTH, CROPHEIGHT);
    updateCropImage(left, top);
    updateContainer(left, top);
    addHandlers();
  });

  onCleanup(() => {
    removeHandlers();
  });

  console.log('props.image.width: ', props.image.width);
  console.log('props.image.height: ', props.image.height);

  return (
    <div class={styles.MediaEditorCrop}>
      <div class={styles.MediaEditorCropWorkArea}>
        <div class="crop-component">
          <div class="crop-overlay" ref={containerRef}>
            <img
              ref={cropImageRef}
              draggable={false}
              src={props.image.src}
              class="crop-overlay-image"
              style={{'max-width': props.image.width + 'px'}}
            />
          </div>

          <img draggable={false} src={props.image.src}/>

          <div class="crop-overlay-color"></div>
        </div>
      </div>

      {/* <div class={styles.MediaEditorCropBarContainer}>
        <ButtonIconTsx icon='rotate' class={styles.MediaEditorCropBar}/>
        <div class={styles.MediaEditorCropBarDegreesBar}>
          <div class={styles.MediaEditorCropBarDegrees}>
            {degrees.map(degree => {
              return (
                <div>
                  {degree}
                </div>
              )
            })}
          </div>
        </div>
        <ButtonIconTsx icon='media_editor_flip' class={styles.MediaEditorCropBar}/>
      </div> */}
    </div>
  )
}
