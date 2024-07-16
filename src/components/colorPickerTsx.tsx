import {createEffect, onCleanup, onMount, splitProps} from 'solid-js';
import ColorPicker from './colorPicker';

type ColorPickerTsxProps = any & {
  class?: string;
}

export default function ColorPickerTsx(props: ColorPickerTsxProps) {
  const colorPicker = new ColorPicker();

  // Split the props to extract handlers and other options
  const [local, others] = splitProps(props, [
    'classNames',
    'value',
    'onChange',
    'class'
  ]);

  // Handle initial setup and mounting of the ColorPicker
  onMount(() => {
    if(local.value) {
      colorPicker.setColor(local.value);
    }

    if(local.onChange) {
      colorPicker.onChange(local.onChange);
    }


    if(local.class) {
      colorPicker.container.classList.add(local.class);
    }
  });

  // Effect to update ColorPicker when props.value changes
  createEffect(() => {
    if(local.value) {
      colorPicker.setColor(local.value);
    }
  });

  // Effect to handle changes in the onChange prop
  createEffect(() => {
    if(local.onChange) {
      colorPicker.onChange(local.onChange);
    }
  });

  // Effect to update className
  createEffect(() => {
    if(local.class) {
      colorPicker.container.className = local.class;
    }
  });

  // Return the ColorPicker container
  return colorPicker.container;
}
