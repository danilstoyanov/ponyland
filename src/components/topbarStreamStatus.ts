/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import cancelEvent from '../helpers/dom/cancelEvent';
import {attachClickEvent} from '../helpers/dom/clickEvent';
import ListenerSetter from '../helpers/listenerSetter';
import GROUP_CALL_STATE from '../lib/calls/groupCallState';
import rootScope from '../lib/rootScope';
import ButtonIcon from './buttonIcon';
import SetTransition from './singleTransition';
import PopupGroupCall from './groupCall';
import GroupCallTitleElement from './groupCall/title';
import PopupElement from './popups';
import throttle from '../helpers/schedulers/throttle';
import GroupCallInstance from '../lib/calls/groupCallInstance';
import CALL_STATE from '../lib/calls/callState';
import replaceContent from '../helpers/dom/replaceContent';
import PeerTitle from './peerTitle';
import CallDescriptionElement from './call/description';
import PopupCall from './call';
import GroupCallMicrophoneIconMini from './groupCall/microphoneIconMini';
import CallInstance from '../lib/calls/callInstance';
import {AppManagers} from '../lib/appManagers/managers';
import groupCallsController from '../lib/calls/groupCallsController';
import callsController from '../lib/calls/callsController';

function convertCallStateToGroupState(state: CALL_STATE, isMuted: boolean) {
  switch(state) {
    case CALL_STATE.CLOSING:
    case CALL_STATE.CLOSED:
      return GROUP_CALL_STATE.CLOSED;
    case CALL_STATE.CONNECTED:
      return isMuted ? GROUP_CALL_STATE.MUTED : GROUP_CALL_STATE.UNMUTED;
    default:
      return GROUP_CALL_STATE.CONNECTING;
  }
}

const CLASS_NAME = 'topbar-stream';

export default class TopbarStream {
  public container: HTMLElement;
  private listenerSetter: ListenerSetter;
  private center: HTMLDivElement;
  private groupCallTitle: GroupCallTitleElement;
  private groupCallMicrophoneIconMini: GroupCallMicrophoneIconMini;

  private instance: GroupCallInstance | any/* CallInstance */;
  private instanceListenerSetter: ListenerSetter;

  constructor(private managers: AppManagers) {
    const listenerSetter = this.listenerSetter = new ListenerSetter();

    console.error('TOPBAR STREAM INITIALIZED');

    listenerSetter.add(callsController)('instance', ({instance}) => {
      if(!this.instance) {
        this.updateInstance(instance);
      }
    });

    listenerSetter.add(callsController)('accepting', (instance) => {
      if(this.instance !== instance) {
        this.updateInstance(instance);
      }
    });

    listenerSetter.add(groupCallsController)('instance', (instance) => {
      this.updateInstance(instance);
    });

    listenerSetter.add(rootScope)('group_call_update', (groupCall) => {
      const instance = groupCallsController.groupCall;
      if(instance?.id === groupCall.id) {
        this.updateInstance(instance);
      }
    });
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

      if(instance instanceof GroupCallInstance) {
      } else {
        this.instanceListenerSetter.add(instance)('muted', this.onState);
      }

      this.container.classList.toggle('is-call', !(instance instanceof GroupCallInstance));
    }

    const isMuted = this.instance.isMuted;
    const state = instance instanceof GroupCallInstance ? instance.state : convertCallStateToGroupState(instance.connectionState, isMuted);

    const isClosed = state === GROUP_CALL_STATE.CLOSED;
    if((!document.body.classList.contains('is-calling') || isChangingInstance) || isClosed) {
      if(isClosed) {}

      SetTransition({
        element: document.body,
        className: 'is-calling',
        forwards: !isClosed,
        duration: 250,
        onTransitionEnd: isClosed ? () => {
          this.clearCurrentInstance();
        } : undefined
      });
    }

    if(isClosed) {
      return;
    }

    this.setTitle(instance);
    this.groupCallMicrophoneIconMini.setState(!isMuted);
  }

  private setTitle(instance: TopbarStream['instance']) {
    if(instance instanceof GroupCallInstance) {
      return this.groupCallTitle.update(instance);
    } else {
      replaceContent(this.center, new PeerTitle({peerId: instance.interlocutorUserId.toPeerId()}).element);
    }
  }

  private construct() {
    const {listenerSetter} = this;
    const container = this.container = document.createElement('div');
    container.classList.add('sidebar-header', CLASS_NAME + '-container');

    container.style.border = '10px solid red';

    const left = document.createElement('div');
    left.classList.add(CLASS_NAME + '-left');

    const groupCallMicrophoneIconMini = this.groupCallMicrophoneIconMini = new GroupCallMicrophoneIconMini();

    const mute = ButtonIcon();
    mute.append(groupCallMicrophoneIconMini.container);
    left.append(mute);

    const throttledMuteClick = throttle(() => {
      this.instance.toggleMuted();
    }, 600, true);

    attachClickEvent(mute, (e) => {
      cancelEvent(e);
      throttledMuteClick();
    }, {listenerSetter});

    const center = this.center = document.createElement('div');
    center.classList.add(CLASS_NAME + '-center');

    this.groupCallTitle = new GroupCallTitleElement(center);

    const right = document.createElement('div');
    right.classList.add(CLASS_NAME + '-right');

    const end = ButtonIcon('endcall_filled');
    right.append(end);

    // attachClickEvent(end, (e) => {
    //   cancelEvent(e);

    //   const {instance} = this;
    //   if(!instance) {
    //     return;
    //   }

    //   if(instance instanceof GroupCallInstance) {
    //     instance.hangUp();
    //   } else {
    //     instance.hangUp('phoneCallDiscardReasonHangup');
    //   }
    // }, {listenerSetter});

    // attachClickEvent(container, () => {
    //   if(this.instance instanceof GroupCallInstance) {
    //     if(PopupElement.getPopups(PopupGroupCall).length) {
    //       return;
    //     }

    //     PopupElement.createPopup(PopupGroupCall).show();
    //   } else if(this.instance instanceof CallInstance) {
    //     const popups = PopupElement.getPopups(PopupCall);
    //     if(popups.find((popup) => popup.getCallInstance() === this.instance)) {
    //       return;
    //     }

    //     PopupElement.createPopup(PopupCall, this.instance).show();
    //   }
    // }, {listenerSetter});

    container.append(left, center, right);

    console.log('CONTAINER: ', container);

    document.getElementById('column-center').append(container);
  }
}
