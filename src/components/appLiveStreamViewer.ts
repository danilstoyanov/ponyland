/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */
import {IS_MOBILE, IS_MOBILE_SAFARI, IS_SAFARI, IS_FIREFOX, IS_CHROMIUM} from '../environment/userAgent';
import VideoPlayer from '../lib/mediaPlayer';
import rootScope from '../lib/rootScope';
import ButtonIcon from './buttonIcon';
import replaceContent from '../helpers/dom/replaceContent';
import {NULL_PEER_ID} from '../lib/mtproto/mtproto_config';
import {AppManagers} from '../lib/appManagers/managers';
import wrapEmojiText from '../lib/richTextProcessor/wrapEmojiText';
import wrapPeerTitle from './wrappers/peerTitle';
import {avatarNew} from './avatarNew';
import blur from '../helpers/blur';
import {MiddlewareHelper, getMiddleware} from '../helpers/middleware';
import {ButtonMenuItemOptions, ButtonMenuItemOptionsVerifiable} from './buttonMenu';
import ButtonMenuToggle from './buttonMenuToggle';
import PopupElement from './popups';
import PopupForward from './popups/forward';
import LiveStreamInstance from '../lib/calls/liveStreamInstance';
import {copyTextToClipboard} from '../helpers/clipboard';
import {toast} from './toast';
import Row from './row';
import Icon from './icon';
import pause from '../helpers/schedulers/pause';
import {i18n} from '../lib/langPack';
import {GroupCall, InputGroupCall, PhoneGroupCallStreamChannels} from '../layer';
import PopupLiveStreamSettings from './popups/liveStreamSettings';
import PopupLiveStreamOutputDevice from './popups/liveStreamOutputDevice';
import PopupLiveStreamStartRecording from './popups/liveStreamStartRecording';
import confirmationPopup from './confirmationPopup';
import apiManagerProxy from '../lib/mtproto/mtprotoworker';
import blobConstruct from '../helpers/blob/blobConstruct';

export const MEDIA_VIEWER_CLASSNAME = 'media-viewer';

export default class AppLiveStreamViewer {
  protected streamIsPlayingSafari: boolean;
  protected wholeDiv: HTMLElement;
  protected overlaysDiv: HTMLElement;
  protected channel: {
    avatarEl: ReturnType<typeof avatarNew>,
    avatarMiddlewareHelper?: MiddlewareHelper,
    container: HTMLElement,
    nameEl: HTMLElement,
    streaming: HTMLElement
  } = {} as any;
  protected content: {[k in 'main' | 'container' | 'media' | 'mover']: HTMLElement} = {} as any;
  protected buttons: {[k in 'forward' | 'download' | 'close' | 'mobile-close']: HTMLElement} = {} as any;
  protected topbar: HTMLElement;
  protected topButtons: any[];
  protected streamPlayerButtons: ButtonMenuItemOptions[];
  protected call: any;


  protected channelId: ChatId;
  protected liveStreamInstance: LiveStreamInstance;

  protected streamLoadingScreen: HTMLElement;
  protected streamPlayerWrapper: VideoPlayer;
  protected streamPlayerVideo: HTMLVideoElement;
  protected transcodingPlayer: HTMLVideoElement;

  protected initialContentRect: DOMRect;
  protected pageEl = document.getElementById('page-chats') as HTMLDivElement;

  protected managers: AppManagers;
  protected closing: boolean;

  protected middlewareHelper: MiddlewareHelper;

  constructor(channelId: ChatId, call: any) {
    this.topButtons = [];
    this.managers = rootScope.managers;
    this.call = call;
    this.channelId = channelId;
    this.middlewareHelper = getMiddleware();

    this.wholeDiv = document.createElement('div');
    this.wholeDiv.classList.add(MEDIA_VIEWER_CLASSNAME + '-whole');

    this.overlaysDiv = document.createElement('div');
    this.overlaysDiv.classList.add('overlays');

    const mainDiv = document.createElement('div');
    mainDiv.classList.add(MEDIA_VIEWER_CLASSNAME);

    const topbar = this.topbar = document.createElement('div');
    topbar.classList.add(MEDIA_VIEWER_CLASSNAME + '-topbar', MEDIA_VIEWER_CLASSNAME + '-appear');

    const topbarLeft = document.createElement('div');
    topbarLeft.classList.add(MEDIA_VIEWER_CLASSNAME + '-topbar-left');

    this.buttons['mobile-close'] = ButtonIcon('close', {onlyMobile: true});

    // * channel
    this.channel.container = document.createElement('div');
    this.channel.container.classList.add(MEDIA_VIEWER_CLASSNAME + '-author', 'no-select');
    const authorRight = document.createElement('div');

    this.channel.nameEl = document.createElement('div');
    this.channel.nameEl.classList.add(MEDIA_VIEWER_CLASSNAME + '-name');

    this.channel.streaming = document.createElement('div');
    this.channel.streaming.classList.add(MEDIA_VIEWER_CLASSNAME + '-date');

    authorRight.append(this.channel.nameEl, this.channel.streaming);

    this.channel.container.append(authorRight);

    // * buttons
    const buttonsDiv = document.createElement('div');
    buttonsDiv.classList.add(MEDIA_VIEWER_CLASSNAME + '-buttons');

    ['forward', 'close'].forEach((name) => {
      const button = ButtonIcon(name as Icon, {noRipple: true});
      this.buttons[name as 'forward' | 'close'] = button;
      buttonsDiv.append(button);
    });

    // * content
    this.content.main = document.createElement('div');
    this.content.main.classList.add(MEDIA_VIEWER_CLASSNAME + '-content');

    this.content.container = document.createElement('div');

    this.content.media = document.createElement('div');
    this.content.media.classList.add(MEDIA_VIEWER_CLASSNAME + '-media');

    this.content.container.append(this.content.media);

    this.content.main.append(this.content.container);
    mainDiv.append(this.content.main);
    this.overlaysDiv.append(mainDiv);

    topbarLeft.append(this.buttons['mobile-close'], this.channel.container);
    topbar.append(topbarLeft, buttonsDiv);

    this.wholeDiv.append(this.overlaysDiv, this.topbar);

    if(!this.wholeDiv.parentElement) {
      this.pageEl.insertBefore(this.wholeDiv, document.getElementById('main-columns'));
    }

    this.wholeDiv.classList.add('active');

    this.setChannelInfo(channelId.toPeerId(true));

    // * end building

    // * player buttons dependencies
    this.streamPlayerButtons = [
      {
        icon: 'speaker' as Icon,
        regularText: i18n('LiveStream.MediaViewer.Menu.Option.OutputDevice'),
        onClick: () => {
          PopupElement.createPopup(PopupLiveStreamOutputDevice).show();
        }
      },
      {
        icon: 'radioon' as Icon,
        regularText: i18n('LiveStream.MediaViewer.Menu.Option.StartRecording'),
        onClick: () => {
          PopupElement.createPopup(PopupLiveStreamStartRecording, this.call).show();
        }
      },
      {
        icon: 'settings' as Icon,
        regularText: i18n('LiveStream.MediaViewer.Menu.Option.StreamSettings'),
        onClick: async() => {
          const channelPeerId = await this.managers.appPeersManager.getInputPeerById(this.channelId.toPeerId(true));
          const streamRtpInfo = await this.managers.appLiveStreamsManager.getGroupCallStreamRtmpUrl(channelPeerId);

          PopupElement.createPopup(PopupLiveStreamSettings, streamRtpInfo, this.channelId.toChatId(), this.closeStream.bind(this)).show();
        }
      },
      {
        icon: 'crossround' as Icon,
        regularText: i18n('LiveStream.MediaViewer.Menu.Option.EndLiveStream'),
        onClick: async() => {
          await confirmationPopup({
            titleLangKey: 'LiveStream.PopUp.Stream.EndStream.Title',
            descriptionLangKey: 'LiveStream.PopUp.Stream.EndStream.Description',
            button: {
              langKey: 'LiveStream.PopUp.Stream.EndStream.End',
              isDanger: true
            }
          });

          this.closeStream();
        },
        danger: true
      }
    ];

    // * event listeners
    this.buttons['forward'].addEventListener('click', this.onForwardClick.bind(this));
    this.buttons['close'].addEventListener('click', this.closeStream.bind(this));

    rootScope.addEventListener('live_stream_started', () => {
      this.removeLoadingScreen();
      this.togglePlayerStreamBadge();
    });
  }

  public createTranscodingPlayer() {
    const transcodingPlayer = this.transcodingPlayer = document.createElement('video');
    transcodingPlayer.classList.add('player-transcoding');
    this.content.container.append(transcodingPlayer);
  };

  private createStreamPlayer() {
    this.streamPlayerVideo = document.createElement('video');
    this.streamPlayerVideo.classList.add('player-stream', 'player-primary');
    this.streamPlayerVideo.autoplay = true;

    this.content.main.append(this.streamPlayerVideo);

    this.streamPlayerWrapper = new VideoPlayer({
      video: this.streamPlayerVideo,
      streamable: true,
      streamPlayer: true,
      play: IS_SAFARI ? false : true,
      streamControls: this.streamPlayerButtons,
      streamCreator: !!(apiManagerProxy.getChat(this.channelId) as any).pFlags?.creator
    });

    this.streamPlayerWrapper.playerWrapper.classList.add('player-stream-wrapper');
    this.streamPlayerWrapper.lockControls(true);

    this.wholeDiv.classList.toggle('has-video-controls');
  };

  private setChannelInfo(fromId: PeerId | string) {
    const isPeerId = fromId.isPeerId();
    let wrapTitlePromise: Promise<HTMLElement> | HTMLElement;
    if(isPeerId) {
      wrapTitlePromise = wrapPeerTitle({
        peerId: fromId as PeerId,
        dialog: false,
        onlyFirstName: false,
        plainText: false
      })
    } else {
      const title = wrapTitlePromise = document.createElement('span');
      title.append(wrapEmojiText(fromId));
      title.classList.add('peer-title');
    }

    const oldAvatar = this.channel.avatarEl;
    const oldAvatarMiddlewareHelper = this.channel.avatarMiddlewareHelper;
    const newAvatar = this.channel.avatarEl = avatarNew({
      middleware: (this.channel.avatarMiddlewareHelper = this.middlewareHelper.get().create()).get(),
      size: 44,
      peerId: fromId as PeerId || NULL_PEER_ID,
      peerTitle: isPeerId ? undefined : '' + fromId
    });

    newAvatar.node.classList.add(MEDIA_VIEWER_CLASSNAME + '-userpic');

    return Promise.all([
      newAvatar.readyThumbPromise,
      wrapTitlePromise
    ]).then(([_, title]) => {
      replaceContent(this.channel.streaming, i18n('LiveStream.MediaViewer.Streaming'));
      replaceContent(this.channel.nameEl, title);

      if(oldAvatar?.node && oldAvatar.node.parentElement) {
        oldAvatar.node.replaceWith(this.channel.avatarEl.node);
      } else {
        this.channel.container.prepend(this.channel.avatarEl.node);
      }

      if(oldAvatar) {
        oldAvatar.node.remove();
        oldAvatarMiddlewareHelper.destroy();
      }
    });
  };

  private setChannelAdminLoadingScreen() {
    const baseScreen = this.constructBaseLoadingScreen();

    const playerAwaitingStreamContainer = document.createElement('div');
    playerAwaitingStreamContainer.classList.add('await-stream-container');

    const awaitingStreamInfoContainer = document.createElement('div');
    awaitingStreamInfoContainer.classList.add('await-stream-info');

    const awaitingStreamTitleContainer = document.createElement('div');
    awaitingStreamTitleContainer.classList.add('await-stream-title');

    const awaitingStreamTitleText = document.createElement('div');
    awaitingStreamTitleText.append(i18n('LiveStream.MediaViewer.Failed.Title'));

    const awaitStreamTitlePreloader = document.createElement('div');
    awaitStreamTitlePreloader.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" class="preloader-circular await-stream-title-preloader" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9.83591 16.9562C14.23 16.4944 17.4177 12.5579 16.9559 8.16382C16.494 3.76974 12.5575 0.582034 8.16345 1.04387C3.76938 1.50571 0.58167 5.4422 1.04351 9.83627" stroke="white" stroke-width="2" stroke-linecap="round"/>
      </svg>
  `;

    awaitingStreamTitleContainer.append(awaitStreamTitlePreloader, awaitingStreamTitleText);

    const awaitingStreamText = document.createElement('div');
    awaitingStreamText.classList.add('await-stream-description');
    awaitingStreamText.append(i18n('LiveStream.MediaViewer.Failed.Description'));

    const streamRtmpsUrlRow = new Row({
      havePadding: true,
      title: 'WIP' as any,
      subtitle: i18n('LiveStream.PopUp.Stream.ServerURL'),
      icon: 'link',
      clickable: () => {
        // copyTextToClipboard(this.streamRtmpUrl.url);
        toast(i18n('LiveStream.RtmpUrl.Copied'));
      },
      rightContent: Icon('copy', 'btn-icon', 'rp')
    });

    const streamKeyRow = new Row({
      havePadding: true,
      titleHiddenLike: true,
      title: 'WIP' as any,
      subtitle: i18n('LiveStream.PopUp.Stream.StreamKey'),
      icon: 'lock',
      clickable: () => {
        // copyTextToClipboard(this.streamRtmpUrl.key);
        toast(i18n('LiveStream.Key.Copied'));
      },
      rightContent: Icon('copy', 'btn-icon', 'rp')
    });

    awaitingStreamInfoContainer.append(awaitingStreamTitleContainer, awaitingStreamText);

    playerAwaitingStreamContainer.append(
      awaitingStreamInfoContainer,
      streamRtmpsUrlRow.container,
      streamKeyRow.container
    );

    baseScreen.append(playerAwaitingStreamContainer);

    return baseScreen;
  };

  private setViewerLoadingScreen() {
    const loadingScreen = this.constructBaseLoadingScreen();
    this.streamPlayerWrapper.playerWrapper.append(loadingScreen);

    return loadingScreen;
  };

  private removeLoadingScreen() {
    this.streamLoadingScreen.remove();
  };

  private togglePlayerStreamBadge() {
    this.streamPlayerWrapper.playerWrapper.querySelector('.player-stream-status-badge').classList.add('live');
  };

  private constructBaseLoadingScreen() {
    const container = document.createElement('div');
    container.classList.add('player-loading-screen');

    const avatar = avatarNew({
      middleware: (this.channel.avatarMiddlewareHelper = this.middlewareHelper.get().create()).get(),
      size: 44,
      peerId: this.channelId.toPeerId(true) || NULL_PEER_ID
    });

    avatar.readyThumbPromise.then(() => {
      const src = avatar.node.querySelector('img').src;
      const result = blur(src, 16, 4);
      container.append(result.canvas);
    });

    return container;
  };

  public async playStream(call?: InputGroupCall.inputGroupCall) {
    this.createTranscodingPlayer();
    this.createStreamPlayer();

    const isUserChnnelCreator = !!(apiManagerProxy.getChat(this.channelId) as any).pFlags?.creator;

    if(isUserChnnelCreator) {
      this.streamLoadingScreen = this.setChannelAdminLoadingScreen();
      this.streamPlayerWrapper.playerWrapper.append(this.streamLoadingScreen);
    } else {
      this.streamLoadingScreen = this.setViewerLoadingScreen();
      this.streamPlayerWrapper.playerWrapper.append(this.streamLoadingScreen);
    }

    // Dirty stuff... deadline is near 🔪 =(
    if(!call) {
      const channel = await this.managers.appProfileManager.getChatFull(this.channelId);
      call = channel.call;
    }

    const inputGroupCall = {
      _: 'inputGroupCall',
      id: call.id,
      access_hash: call.access_hash
    } as InputGroupCall.inputGroupCall;

    let channelsCanBeReceived = false;
    let currentChannelStreamChannels: PhoneGroupCallStreamChannels.phoneGroupCallStreamChannels;
    const RETRY_TIMEOUT = 1000;

    while(!channelsCanBeReceived) {
      try {
        currentChannelStreamChannels = await this.managers.appLiveStreamsManager.getStreamChannels(inputGroupCall);

        if(currentChannelStreamChannels.channels.length > 0) {
          channelsCanBeReceived = true;
        } else {
          await pause(RETRY_TIMEOUT);
        }
      } catch(err) {
        await pause(RETRY_TIMEOUT);
      }
    }

    const STREAM_CHUNK_DURATION = 1000;
    const streamStartTimestamp = +currentChannelStreamChannels.channels[0].last_timestamp_ms - (6 * STREAM_CHUNK_DURATION);

    this.liveStreamInstance = new LiveStreamInstance(
      this.streamPlayerVideo,
      this.transcodingPlayer,
      call,
      streamStartTimestamp
    )

    this.liveStreamInstance.playStream();
  };

  public async playStreamInSafari(call?: InputGroupCall.inputGroupCall) {
    this.createStreamPlayer();
    this.streamPlayerVideo.muted = true;

    const primaryPlayer = this.streamPlayerVideo;

    const secondaryPlayer = document.createElement('video');
    secondaryPlayer.id = 'secondaryPlayer';
    secondaryPlayer.muted = true;
    secondaryPlayer.classList.add('player-stream', 'player-secondary');

    this.streamPlayerWrapper.playerWrapper.append(secondaryPlayer);

    const isUserChannelCreator = !!(apiManagerProxy.getChat(this.channelId) as any).pFlags?.creator;

    if(isUserChannelCreator) {
      this.streamLoadingScreen = this.setChannelAdminLoadingScreen();
      this.streamPlayerWrapper.playerWrapper.append(this.streamLoadingScreen);
    } else {
      this.streamLoadingScreen = this.setViewerLoadingScreen();
      this.streamPlayerWrapper.playerWrapper.append(this.streamLoadingScreen);
    }

    // Dirty stuff... deadline is near 🔪 =(
    if(!call) {
      const channel = await this.managers.appProfileManager.getChatFull(this.channelId);
      call = channel.call;
    }

    const inputGroupCall = {
      _: 'inputGroupCall',
      id: call.id,
      access_hash: call.access_hash
    } as InputGroupCall.inputGroupCall;

    let channelsCanBeReceived = false;
    let currentChannelStreamChannels: PhoneGroupCallStreamChannels.phoneGroupCallStreamChannels;
    const RETRY_TIMEOUT = 1000;

    while(!channelsCanBeReceived) {
      try {
        currentChannelStreamChannels = await this.managers.appLiveStreamsManager.getStreamChannels(inputGroupCall);

        if(currentChannelStreamChannels.channels.length > 0) {
          channelsCanBeReceived = true;
        } else {
          await pause(RETRY_TIMEOUT);
        }
      } catch(err) {
        await pause(RETRY_TIMEOUT);
      }
    }

    this.streamIsPlayingSafari = true;

    const mp4chunks: string[] = [];

    let streamStartTimestamp = +currentChannelStreamChannels.channels[0].last_timestamp_ms - 5000;

    const queryStreamChunk = async() => {
      while(this.streamIsPlayingSafari) {
        const chunk = await this.managers.appLiveStreamsManager.getStreamChunk(call, {
          call: call,
          time_ms: streamStartTimestamp
        });

        const videoURL = URL.createObjectURL(blobConstruct(chunk, 'video/mp4'));
        mp4chunks.push(videoURL);

        streamStartTimestamp += 1000;
        await pause(700);
      }
    };

    queryStreamChunk();

    function toggleSecondaryPlayer() {
      secondaryPlayer.classList.toggle('player-secondary-active');
    };

    primaryPlayer.addEventListener('ended', () => {
      primaryPlayer.src = mp4chunks.shift();
      primaryPlayer.preload = 'auto';
      primaryPlayer.pause();

      toggleSecondaryPlayer();
      secondaryPlayer.play();
    });

    secondaryPlayer.addEventListener('ended', () => {
      secondaryPlayer.src = mp4chunks.shift();
      secondaryPlayer.preload = 'auto';
      secondaryPlayer.pause();

      toggleSecondaryPlayer();
      primaryPlayer.play();
    });

    const isReadyToPlay = setInterval(() => {
      if(mp4chunks.length >= 4) {
        rootScope.dispatchEventSingle('live_stream_started');

        primaryPlayer.src = mp4chunks.shift();
        secondaryPlayer.src = mp4chunks.shift();
        primaryPlayer.play();

        clearInterval(isReadyToPlay);
      }
    }, 3000);
  };

  public closeStream() {
    this.streamIsPlayingSafari = false;
    this.wholeDiv.remove();
    this.liveStreamInstance?.stopStream?.();
  };

  private onForwardClick = () => {
    alert('Sorry, had to skip this in favour of stream part 🙈');
  };
}
