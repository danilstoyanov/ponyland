/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import cancelEvent from '../../helpers/dom/cancelEvent';
import ListenerSetter from '../../helpers/listenerSetter';
import rootScope from '../../lib/rootScope';
import ButtonIcon from '../buttonIcon';
import SetTransition from '../singleTransition';
import GroupCallTitleElement from '../groupCall/title';
import GroupCallInstance from '../../lib/calls/groupCallInstance';
import Button from '../../components/button';
import replaceContent from '../../helpers/dom/replaceContent';
import PeerTitle from '../peerTitle';
import {AppManagers} from '../../lib/appManagers/managers';
import groupCallsController from '../../lib/calls/groupCallsController';
import callsController from '../../lib/calls/callsController';

const CLASS_NAME = 'topbar-stream';

export default class TopbarStream {
  public container: HTMLElement;
  private streamHeading: HTMLElement;
  private streamViewersCount: HTMLElement;
  private streamJoinBtn: HTMLElement;

  private listenerSetter: ListenerSetter;
  private center: HTMLDivElement;

  private instance: GroupCallInstance | any/* CallInstance */;
  private instanceListenerSetter: ListenerSetter;

  constructor(private managers: AppManagers) {
    // const listenerSetter = this.listenerSetter = new ListenerSetter();

    // listenerSetter.add(callsController)('instance', ({instance}) => {
    //   if(!this.instance) {
    //     this.updateInstance(instance);
    //   }
    // });

    // listenerSetter.add(callsController)('accepting', (instance) => {
    //   if(this.instance !== instance) {
    //     this.updateInstance(instance);
    //   }
    // });

    // listenerSetter.add(groupCallsController)('instance', (instance) => {
    //   this.updateInstance(instance);
    // });

    // listenerSetter.add(rootScope)('group_call_update', (groupCall) => {
    //   const instance = groupCallsController.groupCall;
    //   if(instance?.id === groupCall.id) {
    //     this.updateInstance(instance);
    //   }
    // });w
  }

  private onState = () => {
    this.updateInstance(this.instance);
  };

  private clearCurrentInstance() {
    if(!this.instance) return;
    this.center.textContent = '';

    this.instance = undefined;
    this.instanceListenerSetter.removeAll();
  };

  private updateInstance(instance: TopbarStream['instance']) {
    if(this.construct) {
      this.construct();
      this.construct = undefined;
    }

    const isChangingInstance = this.instance !== instance;

    if(isChangingInstance) {
      this.clearCurrentInstance();

      this.instance = instance;
      this.instanceListenerSetter = new ListenerSetter();

      this.instanceListenerSetter.add(instance as GroupCallInstance)('state', this.onState);
    }
  }

  private construct() {
    const container = this.container = document.createElement('div');
    container.classList.add(CLASS_NAME + '-container');

    container.style.border = '10px solid red';

    const btn = Button('btn-primary btn-color-primary', {text: 'JOIN' as any});

    container.append(btn);


    // &-confirm {
    //   --ripple-color: rgba(255, 255, 255, #{$hover-alpha});
    //   background: linear-gradient(88.39deg, #6C93FF -2.56%, #976FFF 51.27%, #DF69D1 107.39%) !important;
    //   font-weight: var(--font-weight-bold);
    //   color: #fff;
    //   text-transform: uppercase;
    //   height: 3rem;
    //   @include hover() {
    //     &:after {
    //       content: " ";
    //       position: absolute;
    //       top: 0;
    //       right: 0;
    //       bottom: 0;
    //       left: 0;
    //       background-color: #fff;
    //       opacity: $hover-alpha;
    //     }
    //   }
    // }

    // const right = document.createElement('div');
    // right.classList.add(CLASS_NAME + '-right');

    // const end = ButtonIcon('endcall_filled');
    // right.append(end);

    // console.log('CONTAINER: ', container)
  }
}
