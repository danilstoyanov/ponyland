import {createEffect, createSignal, onCleanup, onMount} from 'solid-js';
import {ButtonIconTsx} from '../buttonIconTsx'
import styles from './mediaEditor.module.scss'

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
  let containerWrapperRef: HTMLDivElement;
  let cropImageRef: HTMLImageElement;
  let overlayImageRef: HTMLImageElement;

  let scaledRatio = 0;
  let CROPWIDTH = 200;
  let CROPHEIGHT = 200;

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
    containerRef.style.width = width + 'px';
    containerRef.style.height = height + 'px';

    containerWrapperRef.style.width = width + 'px';
    containerWrapperRef.style.height = height + 'px';
  }

  function updateCropImage(left: number, top: number) {
    cropImageRef.style.top = -top + 'px';
    cropImageRef.style.left = -left + 'px';
  }

  function updateContainer(left: number, top: number) {
    containerRef.style.top = top + 'px';
    containerRef.style.left = left + 'px';

    containerWrapperRef.style.top = top + 'px';
    containerWrapperRef.style.left = left + 'px';
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

  function init() {
    // ЭТО ДЛЯ РЕСАЙЗИНГА МОЖЕТ ПОНАДОБИТЬСЯ
    // scaledRatio = props.image.naturalWidth / props.image.offsetWidth;
    scaledRatio = 1;

    const left = 0;
    const top = 0;

    cropImageRef.style.maxWidth = overlayImageRef.width - 2 + 'px';

    CROPWIDTH = overlayImageRef.width - 200;
    CROPHEIGHT = overlayImageRef.height - 200;

    updateCropSize(CROPWIDTH, CROPHEIGHT);

    updateCropImage(left, top);
    updateContainer(left, top);
    addHandlers();
  }

  onMount(() => {
    overlayImageRef.onload = init;

    handleCropAreaResize();
  });

  onCleanup(() => {
    removeHandlers();
  });

  const adjustCropSizeToAspectRatio = (aspectRatio: CropAspectRatio) => {
    let width = CROPWIDTH;
    let height = CROPHEIGHT;
    let aspectWidth: number | undefined;
    let aspectHeight: number | undefined;

    switch(aspectRatio) {
      case 'Free':
        // Free aspect ratio, do not enforce any specific aspect ratio
        return;

      case 'Original':
        // Maintain the original aspect ratio of the image
        const originalWidth = props.image.naturalWidth;
        const originalHeight = props.image.naturalHeight;
        width = CROPWIDTH;
        height = (CROPWIDTH / originalWidth) * originalHeight;
        break;

      case 'Square':
        // Enforce a square aspect ratio
        width = CROPWIDTH;
        height = CROPWIDTH;
        break;

      default:
        // Handle custom aspect ratios
        [aspectWidth, aspectHeight] = aspectRatio.split(':').map(Number);
        if(aspectWidth && aspectHeight) {
          width = CROPWIDTH;
          height = (CROPWIDTH / aspectWidth) * aspectHeight;
        }
        break;
    }

    // Ensure the crop area fits within the image bounds
    const maxWidth = overlayImageRef.offsetWidth;
    const maxHeight = overlayImageRef.offsetHeight;

    if(width > maxWidth) {
      width = maxWidth;
      if(aspectWidth && aspectHeight) {
        height = (maxWidth / aspectWidth) * aspectHeight;
      }
    }

    if(height > maxHeight) {
      height = maxHeight;
      if(aspectWidth && aspectHeight) {
        width = (maxHeight / aspectHeight) * aspectWidth;
      }
    }

    updateCropSize(width, height);
    updateCropImage(0, 0); // Reset the crop image position to the top-left corner
    updateContainer(0, 0); // Reset the container position to the top-left corner
  };

  // Usage of the method
  createEffect(() => {
    adjustCropSizeToAspectRatio(props.aspectRatio);
  });

  const handleCropAreaResize = () => {
    const cropperBox = containerRef;
    const cropperOutBox = containerWrapperRef;

    const topRightNode = document.querySelector<HTMLDivElement>('[data-resize-action=top-right]');
    const topLeftNode = document.querySelector<HTMLDivElement>('[data-resize-action=top-left]');
    const bottomLeftNode = document.querySelector<HTMLDivElement>('[data-resize-action=bottom-left]');
    const bottomRightNode = document.querySelector<HTMLDivElement>('[data-resize-action=bottom-right]');

    const resizers: HTMLDivElement[] = [
      topRightNode,
      topLeftNode,
      bottomLeftNode,
      bottomRightNode
    ];

    const minimum_size = 20;

    resizers.forEach(currentResizer => {
      currentResizer.addEventListener('mousedown', (e: MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startY = e.clientY;

        const initialWidth = cropperBox.offsetWidth;
        const initialHeight = cropperBox.offsetHeight;
        const initialLeft = cropperBox.offsetLeft;
        const initialTop = cropperBox.offsetTop;

        const action = currentResizer.dataset.resizeAction;

        function resize(e: MouseEvent) {
          let width = initialWidth;
          let height = initialHeight;
          let left = initialLeft;
          let top = initialTop;

          if(action === 'top-right') {
            width = initialWidth + (e.clientX - startX);
            height = initialHeight - (e.clientY - startY);
            top = initialTop + (e.clientY - startY);
          } else if(action === 'top-left') {
            width = initialWidth - (e.clientX - startX);
            height = initialHeight - (e.clientY - startY);
            left = initialLeft + (e.clientX - startX);
            top = initialTop + (e.clientY - startY);
          } else if(action === 'bottom-right') {
            width = initialWidth + (e.clientX - startX);
            height = initialHeight + (e.clientY - startY);
          } else if(action === 'bottom-left') {
            width = initialWidth - (e.clientX - startX);
            height = initialHeight + (e.clientY - startY);
            left = initialLeft + (e.clientX - startX);
          }

          if(width > minimum_size) {
            cropperBox.style.width = width + 'px';
            cropperOutBox.style.width = width + 'px';
          }

          if(height > minimum_size) {
            cropperBox.style.height = height + 'px';
            cropperOutBox.style.height = height + 'px';
          }

          cropperBox.style.left = left + 'px';
          cropperOutBox.style.left = left + 'px';
          cropperBox.style.top = top + 'px';
          cropperOutBox.style.top = top + 'px';

          const maxWidth = overlayImageRef.offsetWidth;
          const maxHeight = overlayImageRef.offsetHeight;

          if(width > maxWidth) {
            cropperBox.style.width = maxWidth + 'px';
            cropperOutBox.style.width = maxWidth + 'px';
          }

          if(height > maxHeight) {
            cropperBox.style.height = maxHeight + 'px';
            cropperOutBox.style.height = maxHeight + 'px';
          }

          updateCropImage(left, top);
        }

        function stopResize() {
          window.removeEventListener('mousemove', resize);
          window.removeEventListener('mouseup', stopResize);

          // Ensure the crop area stays within the image bounds after resizing
          const newWidth = cropperBox.offsetWidth;
          const newHeight = cropperBox.offsetHeight;

          if(cropperBox.offsetLeft + newWidth > cropImageRef.offsetWidth) {
            cropperBox.style.left = cropImageRef.offsetWidth - newWidth + 'px';
            cropperOutBox.style.left = cropImageRef.offsetWidth - newWidth + 'px';
          }
          if(cropperBox.offsetTop + newHeight > cropImageRef.offsetHeight) {
            cropperBox.style.top = cropImageRef.offsetHeight - newHeight + 'px';
            cropperOutBox.style.top = cropImageRef.offsetHeight - newHeight + 'px';
          }

          adjustCropSizeToAspectRatio(props.aspectRatio); // Adjust to the aspect ratio after resizing
        }

        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
      });
    });
  };

  return (
    <div class={styles.MediaEditorCrop}>
      <div class={styles.MediaEditorCropWorkArea}>
        <div class="crop-component">
          <div class="crop-overlay-wrapper">
            <div class="crop-overlay" ref={containerRef}>
              <img
                ref={cropImageRef}
                draggable={false}
                src={props.image.src}
                class="crop-overlay-image"
              />
            </div>

            <div class="crop-grid" ref={containerWrapperRef}>
              <div
                class={`${styles.TransformableEntityCornerHandle} ${styles.TopLeft}`}
                data-resize-action="top-left"
              >
                <div class={styles.TransformableEntityCorner}></div>
              </div>

              <div
                class={`${styles.TransformableEntityCornerHandle} ${styles.TopRight}`}
                data-resize-action="top-right"
              >
                <div class={styles.TransformableEntityCorner}></div>
              </div>

              <div
                class={`${styles.TransformableEntityCornerHandle} ${styles.BottomLeft}`}
                data-resize-action="bottom-left"
              >
                <div class={styles.TransformableEntityCorner}></div>
              </div>

              <div
                class={`${styles.TransformableEntityCornerHandle} ${styles.BottomRight}`}
                data-resize-action="bottom-right"
              >
                <div class={styles.TransformableEntityCorner}></div>
              </div>

              <div class="crop-dashed crop-dashed-v"></div>
              <div class="crop-dashed crop-dashed-h"></div>
            </div>
          </div>

          <img ref={overlayImageRef} draggable={false} src={props.image.src}/>

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
