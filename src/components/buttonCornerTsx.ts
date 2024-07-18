/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import {JSX, splitProps} from 'solid-js';
import {unwrap} from 'solid-js/store';
import Button from './button';


type ButtonCornerTsxProps = {
  className: string;
  icon: Icon;
  noRipple: true;
  onlyMobile: true;
  asDiv: boolean;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const ButtonCornerTsx = (props: Partial<ButtonCornerTsxProps> = {}) => {
  const button = Button('btn-circle btn-corner z-depth-1' + (props.className ? ' ' + props.className : ''), unwrap(props));
  button.tabIndex = -1;
  return button;
};
