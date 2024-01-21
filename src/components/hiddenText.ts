/*
 * https://github.com/morethanwords/tweb
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import Button from './button';

export default class HiddenText {
  public container: HTMLElement;

  public text: any;
  public toggleButton: HTMLSpanElement;

  constructor(textValue: string) {
    this.text = document.createElement('div');
    this.text.innerText = textValue;

    this.container = document.createElement('div');

    const button = Button('btn-icon', {icon: 'eye'});

    this.container.append(button);
  }
}
