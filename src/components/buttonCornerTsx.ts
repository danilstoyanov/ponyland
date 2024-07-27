import {JSX, onCleanup, onMount, splitProps} from 'solid-js';
import {unwrap} from 'solid-js/store';
import Button from './button';

type ButtonCornerTsxProps = {
  className?: string;
  icon?: Icon;
  noRipple?: boolean;
  onlyMobile?: boolean;
  asDiv?: boolean;
  onClick?: (event: MouseEvent) => void;
} & JSX.ButtonHTMLAttributes<HTMLButtonElement>;

export const ButtonCornerTsx = (props: ButtonCornerTsxProps) => {
  const [local, otherProps] = splitProps(props, ['className', 'icon', 'noRipple', 'onlyMobile', 'asDiv', 'onClick']);

  const button = Button('btn-circle btn-corner z-depth-1' + (local.className ? ' ' + local.className : ''), {
    'icon': local.icon,
    'asDiv': local.asDiv
  });

  button.tabIndex = -1;

  const handleClick = (event: MouseEvent) => {
    if(local.onClick) {
      local.onClick(event);
    }
  };

  onMount(() => {
    if(local.onClick) {
      button.addEventListener('click', handleClick);
    }
  })

  onCleanup(() => {
    button.removeEventListener('click', handleClick);
  });

  return button;
};
