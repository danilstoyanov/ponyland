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
  let originalImageParent: HTMLDivElement;
  let resizeableImageInstance: ReturnType<typeof resizeableImage>;

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

  onMount(() => {
    console.log('image: ', props.image);

    resizeableImageInstance = resizeableImage(props.image, originalImageParent);
  });

  onCleanup(() => {
    if(resizeableImageInstance) {
      resizeableImageInstance.removeHandlers();
    }
  })

  return (
    <div class={styles.MediaEditorCrop}>
      <div class={styles.MediaEditorCropWorkArea} ref={originalImageParent}>
        {props.image}
      </div>
      <div class={styles.MediaEditorCropBarContainer}>
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
      </div>
    </div>
  )
}
