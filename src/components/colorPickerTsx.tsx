import {createEffect, onMount} from 'solid-js';
import ColorPicker from './colorPicker';

type ColorPickerTsxProps = any & {
  class?: string;
}

export default function ColorPickerTsx(props: ColorPickerTsxProps) {
  const colorPicker = new ColorPicker();

  onMount(() => {
    if(props.onChange) {
      colorPicker.onChange = props.onChange;
    }

    if(props.class) {
      colorPicker.container.classList.add(props.class);
    }
  });

  createEffect(() => {
    if(props.onChange) {
      colorPicker.onChange(props.onChange);
    }
  });

  createEffect(() => {
    if(props.class) {
      colorPicker.container.className = props.class;
    }
  });

  return colorPicker.container;
}
