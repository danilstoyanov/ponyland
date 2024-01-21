import PopupElement from '.';
import HiddenText from '../../components/hiddenText';
import {_i18n, i18n} from '../../lib/langPack';
import Button from '../button';
import Row from '../row';
import Icon from '../icon';
import {GroupCall, PhoneGroupCallStreamRtmpUrl} from '../../layer';
import {copyTextToClipboard} from '../../helpers/clipboard';
import {toast} from '../toast';
import {attachClickEvent} from '../../helpers/dom/clickEvent';
import AppLiveStreamViewer from '../appLiveStreamViewer';
import {IS_SAFARI} from '../../environment/userAgent';

export default class PopupLiveStreamStart extends PopupElement {
  private streamRtmpUrl: PhoneGroupCallStreamRtmpUrl.phoneGroupCallStreamRtmpUrl;
  private chatId: ChatId;

  constructor(streamRtmpUrl: PhoneGroupCallStreamRtmpUrl.phoneGroupCallStreamRtmpUrl, chatId: ChatId) {
    super('popup-stream', {
      title: 'LiveStream.PopUp.Stream.Title',
      closable: true,
      footer: true,
      body: true
    });

    this.streamRtmpUrl = streamRtmpUrl;
    this.chatId = chatId;

    this.construct();
    this.show();
  }

  private construct() {
    const content = document.createElement('div');
    content.classList.add('popup-content');

    const description = document.createElement('div');
    description.classList.add('popup-description');
    description.append(i18n('LiveStream.PopUp.Stream.Description'));

    const startStreamHint = document.createElement('div');
    startStreamHint.classList.add('popup-description');
    startStreamHint.append(i18n('LiveStream.PopUp.Stream.Hint'))

    const streamRtmpsUrlRow = new Row({
      havePadding: true,
      title: this.streamRtmpUrl.url,
      subtitle: i18n('LiveStream.PopUp.Stream.ServerURL'),
      icon: 'link',
      clickable: () => {
        copyTextToClipboard(this.streamRtmpUrl.url);
        toast('Stream server URL is copied');
      },
      rightContent: Icon('copy', 'btn-icon', 'rp')
    });

    const streamKeyRow = new Row({
      havePadding: true,
      titleHiddenLike: true,
      title: 'TODO' as any,
      subtitle: i18n('LiveStream.PopUp.Stream.StreamKey'),
      icon: 'lock',
      clickable: () => {
        copyTextToClipboard(this.streamRtmpUrl.key);
        toast(i18n('LiveStream.Key.Copied'));
      },
      rightContent: Icon('copy', 'btn-icon', 'rp')
    });

    const startStreamButton = Button('btn-primary btn-color-primary', {text: 'LiveStream.PopUp.Stream.StartStreaming'});

    attachClickEvent(startStreamButton, this.startLiveStream.bind(this));

    content.append(
      description,
      streamRtmpsUrlRow.container,
      streamKeyRow.container,
      startStreamHint
    )

    this.body.prepend(content);
    this.footer.prepend(startStreamButton);
  }

  private async startLiveStream() {
    const stream = await this.managers.appLiveStreamsManager.createLiveStream(this.chatId.toChatId()) as GroupCall.groupCall;
    const joinedCall = await this.managers.appLiveStreamsManager.joinLiveStream(this.chatId, stream);

    this.hide();

    if(IS_SAFARI) {
      await new AppLiveStreamViewer(this.chatId, joinedCall).playStreamInSafari({
        _: 'inputGroupCall',
        access_hash: joinedCall.access_hash,
        id: joinedCall.id
      });
    } else {
      await new AppLiveStreamViewer(this.chatId, joinedCall).playStream({
        _: 'inputGroupCall',
        access_hash: joinedCall.access_hash,
        id: joinedCall.id
      });
    }
  }
}
