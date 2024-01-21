import Chat from './chat/chat';
import type {Chat as ChatType} from '../layer';
import {AppManagers} from '../lib/appManagers/managers';
import I18n, {i18n, LangPackKey} from '../lib/langPack';
import Button from './button';
import rootScope from '../lib/rootScope';
import ListenerSetter from '../helpers/listenerSetter';
import AppLiveStreamViewer from './appLiveStreamViewer';
import {GroupCall} from '../layer';
import replaceContent from '../helpers/dom/replaceContent';
import apiManagerProxy from '../lib/mtproto/mtprotoworker';
import {IS_SAFARI} from '../environment/userAgent';

const STREAM_BAR_CLASSNAME = 'stream-bar';

// This is actually could be done in more generic and re-usable way, but there's 3 AM, so it's the simplest I can do 🩼🙈
export default class TopbarSecondary {
  public container: HTMLElement;
  public listenerSetter: ListenerSetter;
  private streamBarViewers: HTMLElement;

  constructor(
    private chat: Chat,
    private managers: AppManagers
  ) {
    this.listenerSetter = new ListenerSetter();
  }

  public construct() {
    const secondaryBar = document.createElement('div');
    secondaryBar.classList.add('topbar', 'topbar-secondary', 'sidebar-header');

    const streamBar = document.createElement('div');
    streamBar.classList.add(STREAM_BAR_CLASSNAME)

    const streamBarLeft = document.createElement('div');
    streamBarLeft.classList.add(`${STREAM_BAR_CLASSNAME}-left`);

    const streamBarTitle = document.createElement('div');
    streamBarTitle.classList.add(`${STREAM_BAR_CLASSNAME}-title`);
    streamBarTitle.append(i18n('LiveStream.Bar.Title'));

    this.streamBarViewers = document.createElement('div');
    this.streamBarViewers.classList.add(`${STREAM_BAR_CLASSNAME}-viewers`);
    this.streamBarViewers.append(I18n.format('LiveStream.Bar.Watching', true, [1]));

    const streamBarRight = document.createElement('div');
    streamBarRight.classList.add(`${STREAM_BAR_CLASSNAME}-right`);

    const streamBarJoinButton = Button(`${STREAM_BAR_CLASSNAME}-join`, {text: 'LiveStream.Bar.Join'});
    streamBarJoinButton.classList.add();

    secondaryBar.append(streamBar);
    streamBar.append(streamBarLeft, streamBarRight);
    streamBarLeft.append(streamBarTitle, this.streamBarViewers);
    streamBarRight.append(streamBarJoinButton);

    this.container = secondaryBar;

    this.listenerSetter.add(streamBarJoinButton)('click', this.onJoinStreamButtonClick);

    this.listenerSetter.add(rootScope)('group_call_update', (groupCall) => {
      if(groupCall._ !== 'groupCallDiscarded') {
        this.updateViewersCount(groupCall);
      }
    });
  }

  onJoinStreamButtonClick = async() => {
    const {peerId} = this.chat;

    const call = await this.managers.appLiveStreamsManager.joinLiveStream(peerId.toChatId());

    if(IS_SAFARI) {
      new AppLiveStreamViewer(peerId.toChatId(), call).playStreamInSafari();
    } else {
      new AppLiveStreamViewer(peerId.toChatId(), call).playStream();
    }
  }

  public async finishPeerChange(options: Parameters<Chat['finishPeerChange']>[0]) {
    const {peerId} = this.chat;

    const [isChannel, chat] = await Promise.all([
      this.managers.appPeersManager.isChannel(peerId),
      peerId.isAnyChat() ? apiManagerProxy.getChat(peerId.toChatId()) : undefined
    ]);

    const channelChat = chat as ChatType.chat | ChatType.channel;
    const isLiveStreamOrGroupCallActive = channelChat?.pFlags?.call_active && channelChat?.pFlags?.call_not_empty;

    return () => {
      if(isChannel && isLiveStreamOrGroupCallActive) {
        this.show();
      } else {
        this.hide();
      }
    }
  }

  private updateViewersCount(groupCall: GroupCall.groupCall) {
    replaceContent(this.streamBarViewers, I18n.format('LiveStream.Bar.Watching', true, [groupCall.participants_count]));
  }

  private hide() {
    this.container.classList.remove('is-visible');
  }

  private show() {
    this.container.classList.add('is-visible');
  }
}
