import PopupElement from '.';
import {i18n} from '../../lib/langPack';
import Button from '../button';
import Row from '../row';
import Icon from '../icon';
import {PhoneGroupCallStreamRtmpUrl} from '../../layer';
import {copyTextToClipboard} from '../../helpers/clipboard';
import confirmationPopup from '../confirmationPopup';
import {AppManagers} from '../../lib/appManagers/managers';
import {toast} from '../toast';

export default class PopupLiveStreamSettings extends PopupElement {
  private streamRtmpUrl: PhoneGroupCallStreamRtmpUrl.phoneGroupCallStreamRtmpUrl;
  private chatId: ChatId;
  private closeStream: () => void;

  constructor(
    streamRtmpUrl: PhoneGroupCallStreamRtmpUrl.phoneGroupCallStreamRtmpUrl,
    chatId: ChatId,
    closeStream: () => void
  ) {
    super('popup-stream', {
      title: 'LiveStream.PopUp.Stream.TitleSettings',
      closable: true,
      body: true,
      footer: true
    });

    this.streamRtmpUrl = streamRtmpUrl;
    this.chatId = chatId;
    this.closeStream = closeStream;

    this.construct();
  }

  private async construct() {
    const content = document.createElement('div');
    content.classList.add('popup-content');

    const description = document.createElement('div');
    description.classList.add('popup-description');
    description.append(i18n('LiveStream.PopUp.Stream.Description'));

    const streamRtmpsUrlRow = new Row({
      havePadding: true,
      title: this.streamRtmpUrl.url,
      subtitle: i18n('LiveStream.PopUp.Stream.ServerURL'),
      icon: 'link',
      clickable: () => {
        copyTextToClipboard(this.streamRtmpUrl.url);
        toast(i18n('LiveStream.RtmpUrl.Copied'));
      },
      rightContent: Icon('copy', 'btn-icon', 'rp')
    });

    const streamKeyRow = new Row({
      havePadding: true,
      titleHiddenLike: true,
      title: this.streamRtmpUrl.key,
      subtitle: i18n('LiveStream.PopUp.Stream.StreamKey'),
      icon: 'lock',
      clickable: () => {
        copyTextToClipboard(this.streamRtmpUrl.key);
        toast(i18n('LiveStream.Key.Copied'));
      },
      rightContent: Icon('copy', 'btn-icon', 'rp')
    });

    const revokeKeyRow = new Row({
      havePadding: true,
      title: i18n('LiveStream.PopUp.Stream.RevokeStreamKey'),
      icon: 'rotate_right',
      danger: true,
      clickable: async(e) => {
        await confirmationPopup({
          titleLangKey: 'LiveStream.PopUp.Stream.RevokeStreamKey',
          descriptionLangKey: 'LiveStream.PopUp.Stream.RevokeStreamKeyConfirm',
          button: {
            langKey: 'LiveStream.PopUp.Stream.Revoke',
            isDanger: true
          }
        });

        const channelPeerId = await this.managers.appPeersManager.getInputPeerById(this.chatId.toPeerId(true));
        await this.managers.appLiveStreamsManager.getGroupCallStreamRtmpUrl(channelPeerId, true);

        toast(i18n('LiveStream.Key.Revoked'));
      }
    });

    const endLiveStreamButton = Button('btn-danger', {text: 'LiveStream.PopUp.Stream.EndLiveStream'});
    endLiveStreamButton.addEventListener('click', () => {
      this.closeStream();
      this.hide();
    });

    content.append(
      description,
      streamRtmpsUrlRow.container,
      streamKeyRow.container,
      revokeKeyRow.container
    );

    this.body.prepend(content);

    this.footer.prepend(endLiveStreamButton);
  };
}
