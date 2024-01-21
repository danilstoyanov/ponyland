import PopupElement from '.';
import {i18n} from '../../lib/langPack';
import Row, {RadioFormFromRows} from '../row';
import RadioField from '../radioField';

export default class PopupLiveStreamOutputDevice extends PopupElement {
  constructor() {
    super('popup-stream', {
      title: i18n('LiveStream.PopUp.OutputDevice.Title'),
      closable: true,
      footer: true,
      body: true,
      buttons: [{
        langKey: 'OK' as any,
        callback: () => {
          alert('Click')
        }
      }]
    });

    this.construct();
  }

  private async construct() {
    const content = document.createElement('div');

    const defaultRow = new Row({
      radioField: new RadioField({
        text: 'DEFAULT',
        value: 'default',
        name: 'random'
      })
    });

    const form = RadioFormFromRows([defaultRow], (value) => {});

    content.append(form);

    this.body.prepend(content);
  };
}
