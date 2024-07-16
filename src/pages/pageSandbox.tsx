/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import {createEffect, createMemo, createSignal, onCleanup} from 'solid-js';
import {render} from 'solid-js/web';
import ButtonIcon from '../components/buttonIcon';
import blurActiveElement from '../helpers/dom/blurActiveElement';
import loadFonts from '../helpers/dom/loadFonts';
import Icons from '../icons';
import I18n from '../lib/langPack';
import rootScope from '../lib/rootScope';
import Page from './page';
import {ButtonIconTsx} from '../components/buttonIconTsx';
import {createMediaEditor, MediaEditor} from '../components/mediaEditor';

const onFirstMount = () => {
  rootScope.managers.appStateManager.pushToState('authState', {_: 'authStateSignedIn'});
  // ! TOO SLOW
  /* appStateManager.saveState(); */

  if(!I18n.requestedServerLanguage) {
    I18n.getCacheLangPack().then((langPack) => {
      if(langPack.local) {
        I18n.getLangPack(langPack.lang_code);
      }
    });
  }

  createMediaEditor();

  // const IconGallery = () => {
  //   return (
  //     <div style={{
  //       'display': 'grid',
  //       'grid-template-columns': `repeat(10, min-content)`
  //     }}>
  //       {Object.keys(Icons).sort((a, b) => a.localeCompare(b)).map(icon => {
  //         return (
  //           <div style={{'padding': '8px'}}>
  //             <ButtonIconTsx icon={icon as Icon} noRipple />
  //             <span>{icon}</span>
  //           </div>
  //         )
  //       })}
  //     </div>
  //   )
  // }

  // page.pageEl.style.display = '';
  // page.pageEl.style.overflow = 'scroll';

  // const editor = new MediaEditor();

  // render(() => <IconGallery />, page.pageEl);

  // const buttonsDiv = document.createElement('div');
  // buttonsDiv.classList.add('media-item-buttons');
  // buttonsDiv.style.display = 'grid';
  // buttonsDiv.style.gridTemplateColumns = `repeat(32, min-content)`; // Adjust 'auto' as per your icon size

  // Object.keys(Icons).forEach((name) => {
  //   const button = ButtonIcon(name as Icon, {noRipple: true});
  //   buttonsDiv.appendChild(button);
  // });

  // page.pageEl.appendChild(buttonsDiv);
};

const page = new Page('page-sandbox', false, onFirstMount);
export default page;
