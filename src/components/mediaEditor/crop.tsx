import {createEffect, createSignal, JSX, onCleanup, onMount} from 'solid-js';
import {createStore, unwrap} from 'solid-js/store';
import type {MediaEditorCropState} from '.';
import {ButtonIconTsx} from '../buttonIconTsx';
import styles from './mediaEditor.module.scss';

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
  state: MediaEditorCropState;
  image: HTMLImageElement;
  onCropChange: any;
}

type CropBarProps = {
  onRotate: any;
  onFlip: any;
  onAngleChange: any;
};

const CropBar = (props: Partial<CropBarProps>) => {
  let degreeBarRef: HTMLDivElement;
  let anchorPointRef: HTMLDivElement;

  function generateDegreesArray() {
    const originalStart = -180;
    const originalEnd = 180;
    const expansion = 15;
    const step = 15;

    const start = originalStart - expansion;
    const end = originalEnd + expansion;
    const degreesArray = [];

    for(let i = start; i <= end; i += step) {
      degreesArray.push(i);
    }

    return degreesArray;
  }

  const degrees = generateDegreesArray();

  const [dragging, setDragging] = createSignal(false);
  const [initialScrollLeft, setInitialScrollLeft] = createSignal(0);
  const [initialMouseX, setInitialMouseX] = createSignal(0);
  const [currentAngle, setCurrentAngle] = createSignal(0.0);

  const updateCurrentAngle = () => {
    const scrollWidth = degreeBarRef.scrollWidth;
    const clientWidth = degreeBarRef.clientWidth;
    const maxScrollLeft = scrollWidth - clientWidth;
    const ratio = degreeBarRef.scrollLeft / maxScrollLeft;
    const angleRange = 180; // Full range from -90 to 90
    const angle = (ratio * angleRange) - 90;
    setCurrentAngle(Math.round(angle));

    updateActiveDegree();
  };

  const updateActiveDegree = () => {
    const degreeElements = degreeBarRef.querySelectorAll('[data-degree]');
    degreeElements.forEach(element => {
      element.classList.remove('active');
    });

    const angle = currentAngle();
    degreeElements.forEach(element => {
      const elementDegree = parseInt(element.getAttribute('data-degree')!, 10);
      if(Math.abs(elementDegree - angle) <= 2) {
        element.classList.add('active');
      }
    });
  };

  const onMouseDown = (event: MouseEvent) => {
    setDragging(true);
    setInitialMouseX(event.clientX);
    setInitialScrollLeft(degreeBarRef.scrollLeft);

    const onMouseMove = (event: MouseEvent) => {
      if(!dragging()) return;

      const deltaX = event.clientX - initialMouseX();
      degreeBarRef.scrollLeft = initialScrollLeft() - deltaX;
      updateCurrentAngle(); // Update the current angle while dragging
    };

    const onMouseUp = () => {
      setDragging(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      updateCurrentAngle(); // Ensure the current angle is updated after dragging stops
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  onMount(() => {
    setTimeout(() => {
      if(degreeBarRef) {
        const scrollWidth = degreeBarRef.scrollWidth;
        const clientWidth = degreeBarRef.clientWidth;
        const scrollPosition = (scrollWidth - clientWidth) / 2;

        degreeBarRef.scrollLeft = scrollPosition;
        updateCurrentAngle(); // Set initial current angle

        const defaultActiveElement = degreeBarRef.querySelector('[data-degree="0"]');
        if(defaultActiveElement) {
          defaultActiveElement.classList.add('active');
        }
      }
    });
  });

  createEffect(() => {
    if(props.onAngleChange) {
      props.onAngleChange(currentAngle());
    }
  });

  return (
    <div class={styles.MediaEditorCropBarContainer}>
      <ButtonIconTsx
        icon="rotate"
        class={styles.MediaEditorCropBar}
        onClick={props.onRotate}
      />
      <div class={styles.MediaEditorCropBarDegreesBar}>
        <div
          ref={el => degreeBarRef = el!}
          class={styles.MediaEditorCropBarDegrees}
          onMouseDown={onMouseDown}
        >
          {degrees.map((degree, idx) => (
            <div class={styles.MediaEditorCropBarDegree} data-degree={degree}>
              {degree}
            </div>
          ))}
        </div>

        <div class={styles.MediaEditorCropBarDegreesCurrentTick} ref={anchorPointRef}></div>
      </div>
      <ButtonIconTsx
        icon="media_editor_flip"
        class={styles.MediaEditorCropBar}
        onClick={props.onFlip}
      />
    </div>
  );
};

export const Crop = (props: CropPops) => {
  const [localState, setLocalState] = createSignal(props.state);

  // Create an effect to update localCrop when crop prop changes
  createEffect(() => {
    setLocalState(props.state);

    console.log('unwrap(props.state): ', unwrap(props.state));
  });

  function handleCropChange(cropState: Partial<MediaEditorCropState>) {
    setLocalState({
      ...localState(),
      ...cropState
    });

    console.log('===change===');
    console.log(unwrap(cropState), unwrap(localState()));
    console.log('===change===');

    props.onCropChange(localState());
  }

  let containerRef: HTMLDivElement;
  let containerWrapperRef: HTMLDivElement;
  let cropImageRef: HTMLImageElement;
  let overlayImageRef: HTMLImageElement;
  let cropWorkAreaRef: HTMLImageElement;

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

  function addHandlers() {
    containerRef.addEventListener('mousedown', startMoving, false);
    containerRef.addEventListener('touchstart', startMoving, false);
  }

  function updateCropSize(width: number, height: number) {
    containerRef.style.width = width + 'px';
    containerRef.style.height = height + 'px';

    containerWrapperRef.style.width = width + 'px';
    containerWrapperRef.style.height = height + 'px';

    console.log('updateCropSize: ', width, height);

    handleCropChange({width, height});
  }

  function updateCropImage(left: number, top: number) {
    cropImageRef.style.top = -top + 'px';
    cropImageRef.style.left = -left + 'px';

    handleCropChange({x: left, y: top});
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
    const left = 0;
    const top = 0;

    cropImageRef.style.maxWidth = overlayImageRef.width - 2 + 'px';

    CROPWIDTH = overlayImageRef.width - 200;
    CROPHEIGHT = overlayImageRef.height - 200;

    updateCropSize(CROPWIDTH, CROPHEIGHT);
    updateCropImage(left, top);
    updateContainer(left, top);

    handleCropChange({
      workareaHeight: cropImageRef.height,
      workareaWidth: cropImageRef.width
    });

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
    adjustCropSizeToAspectRatio(props.state.aspectRatio);
  });

  const handleCropAreaResize = () => {
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

        const initialWidth = containerRef.offsetWidth;
        const initialHeight = containerRef.offsetHeight;
        const initialLeft = containerRef.offsetLeft;
        const initialTop = containerRef.offsetTop;

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

          // Ensure minimum size
          if(width < minimum_size) width = minimum_size;
          if(height < minimum_size) height = minimum_size;

          // Respect the selected aspect ratio
          switch(props.state.aspectRatio) {
            case 'Free':
              break; // Allow free resizing
            case 'Original':
              const originalAspectRatio = props.image.naturalWidth / props.image.naturalHeight;
              height = width / originalAspectRatio;
              break;
            case 'Square':
              height = width; // Keep width and height equal for square aspect ratio
              break;
            default:
              const [aspectWidth, aspectHeight] = props.state.aspectRatio.split(':').map(Number);
              if(aspectWidth && aspectHeight) {
                if(width / aspectWidth > height / aspectHeight) {
                  width = height * (aspectWidth / aspectHeight);
                } else {
                  height = width * (aspectHeight / aspectWidth);
                }
              }
              break;
          }

          // Update the cropper dimensions and position
          containerRef.style.width = width + 'px';
          containerWrapperRef.style.width = width + 'px';
          containerRef.style.height = height + 'px';
          containerWrapperRef.style.height = height + 'px';
          containerRef.style.left = left + 'px';
          containerWrapperRef.style.left = left + 'px';
          containerRef.style.top = top + 'px';
          containerWrapperRef.style.top = top + 'px';

          const maxWidth = overlayImageRef.offsetWidth;
          const maxHeight = overlayImageRef.offsetHeight;

          // Ensure cropper stays within image bounds
          if(width > maxWidth) {
            width = maxWidth;
            containerRef.style.width = width + 'px';
            containerWrapperRef.style.width = width + 'px';
          }

          if(height > maxHeight) {
            height = maxHeight;
            containerRef.style.height = height + 'px';
            containerWrapperRef.style.height = height + 'px';
          }

          // Update the crop image position
          updateCropImage(left, top);
          handleCropChange({width, height});
        }

        function stopResize() {
          window.removeEventListener('mousemove', resize);
          window.removeEventListener('mouseup', stopResize);
        }

        window.addEventListener('mousemove', resize);
        window.addEventListener('mouseup', stopResize);
      });
    });
  };

  const handleRotationAngleUpdate = (value: number) => {
    const theta = value * (Math.PI / 180);
    const absTheta = Math.abs(theta);

    const width = cropImageRef.offsetWidth;
    const height = cropImageRef.offsetHeight;

    // Stackoverflow
    const scalingFactor = Math.cos(absTheta) + Math.max(width / height, height / width) * Math.sin(absTheta);

    overlayImageRef.style.transform = `rotate(${value}deg) scale(${scalingFactor})`;
    cropImageRef.style.transform = `rotate(${value}deg) scale(${scalingFactor})`;
  };

  const handleRotateClick = () => {
    // Get the current transform property
    const overlayTransform = overlayImageRef.style.transform;
    const cropTransform = cropImageRef.style.transform;

    // Initialize variables for rotation and flip
    let currentAngle = 0;
    let flipX = 1;

    // Extract the current angle from the transform property
    if(overlayTransform.includes('rotate(')) {
      const angleMatch = overlayTransform.match(/rotate\(([^)]+)\)/);
      if(angleMatch) {
        currentAngle = parseFloat(angleMatch[1]);
      }
    } else if(cropTransform.includes('rotate(')) {
      const angleMatch = cropTransform.match(/rotate\(([^)]+)\)/);
      if(angleMatch) {
        currentAngle = parseFloat(angleMatch[1]);
      }
    }

    // Extract the current flip state
    if(overlayTransform.includes('scaleX(-1)')) {
      flipX = -1;
    } else if(cropTransform.includes('scaleX(-1)')) {
      flipX = -1;
    }

    // Update the angle by 90 degrees
    currentAngle += 90;

    // Apply the new transformation
    overlayImageRef.style.transform = `rotate(${currentAngle}deg) scaleX(${flipX})`;
    cropImageRef.style.transform = `rotate(${currentAngle}deg) scaleX(${flipX})`;
  };

  const handleFlipClick = () => {
    // Get the current transform property
    const overlayTransform = overlayImageRef.style.transform;
    const cropTransform = cropImageRef.style.transform;

    // Initialize variables for rotation and flip
    let currentAngle = 0;
    let flipX = 1;

    // Extract the current angle from the transform property
    if(overlayTransform.includes('rotate(')) {
      const angleMatch = overlayTransform.match(/rotate\(([^)]+)\)/);
      if(angleMatch) {
        currentAngle = parseFloat(angleMatch[1]);
      }
    } else if(cropTransform.includes('rotate(')) {
      const angleMatch = cropTransform.match(/rotate\(([^)]+)\)/);
      if(angleMatch) {
        currentAngle = parseFloat(angleMatch[1]);
      }
    }

    // Extract the current flip state
    if(overlayTransform.includes('scaleX(-1)')) {
      flipX = -1;
    } else if(cropTransform.includes('scaleX(-1)')) {
      flipX = -1;
    }

    // Toggle the flip effect
    flipX = flipX === 1 ? -1 : 1;

    // Apply the new transformation
    overlayImageRef.style.transform = `rotate(${currentAngle}deg) scaleX(${flipX})`;
    cropImageRef.style.transform = `rotate(${currentAngle}deg) scaleX(${flipX})`;
  };

  return (
    <div class={styles.MediaEditorCrop}>
      <div id="cropWorkAreaRef" class={styles.MediaEditorCropWorkArea} ref={cropWorkAreaRef}>
        <div class="crop-component">
          <div class="crop-overlay-wrapper">
            <div id="containerRef" class="crop-overlay" ref={containerRef}>
              <img
                id="cropImageRef"
                ref={cropImageRef}
                draggable={false}
                src={props.image.src}
                class="crop-overlay-image"
              />
            </div>

            <div id="containerWrapperRef" class="crop-grid" ref={containerWrapperRef}>
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

      <CropBar
        onFlip={handleFlipClick}
        onRotate={handleRotateClick}
        onAngleChange={handleRotationAngleUpdate}
      />
    </div>
  )
}
