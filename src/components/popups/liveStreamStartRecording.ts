import PopupElement from '.';
import {_i18n, i18n} from '../../lib/langPack';
import Button from '../button';
import Row from '../row';
import InputField from '../inputField';
import CheckboxField from '../checkboxField';
import replaceContent from '../../helpers/dom/replaceContent';
import {toast} from '../toast';

export default class PopupLiveStreamStartRecording extends PopupElement {
  private call: any;

  private recordVideo: boolean;
  private isPortraitOrientation: boolean;

  private previewContent: HTMLElement;
  private previewTitle: HTMLElement;

  constructor(call: any) {
    super('popup-stream', {
      title: 'LiveStream.PopUp.Recording.Title',
      closable: true,
      footer: true,
      body: true
    });

    this.call = call;
    this.recordVideo = false;
    this.isPortraitOrientation = true;

    this.construct();
  }

  private async construct() {
    this.container.classList.add('popup-record-stream');

    const content = document.createElement('div');
    content.classList.add('popup-content');

    const inputField = new InputField({
      maxLength: 512,
      label: 'LiveStream.PopUp.Recording.RecordingTitle',
      placeholder: 'LiveStream.PopUp.Recording.RecordingTitle'
    });

    const liveStreamRecordingQuestion = document.createElement('div');
    liveStreamRecordingQuestion.classList.add('popup-description');
    liveStreamRecordingQuestion.append(i18n('LiveStream.PopUp.Recording.RecordingQuestion'));

    const liveStreamRecordingHint = document.createElement('div');
    liveStreamRecordingHint.classList.add('popup-description');
    liveStreamRecordingHint.append(i18n('LiveStream.PopUp.Recording.RecordingHint'));

    const videoRecordRow = new Row({
      titleLangKey: 'LiveStream.PopUp.Recording.AlsoRecordVideo',
      icon: 'videocamera',
      checkboxField: new CheckboxField({toggle: true}),
      clickable: () => {
        this.recordVideo = !this.recordVideo;

        if(this.recordVideo) {
          this.renderOrientationPreview();
        } else {
          this.renderAudioPreview();
        }
      }
    });

    const startStreamRecordingButton = Button('btn-primary btn-color-primary', {text: 'LiveStream.PopUp.Recording.ButtonRecord'});

    content.append(
      inputField.container,
      liveStreamRecordingQuestion,
      liveStreamRecordingHint,
      videoRecordRow.container
    )

    const preview = document.createElement('div');
    preview.classList.add('popup-record-stream-preview');

    const previewTitle = this.previewTitle = document.createElement('div');
    previewTitle.classList.add('popup-record-stream-preview-title');

    const previewContent = this.previewContent = document.createElement('div');
    previewContent.classList.add('popup-record-stream-preview-content');

    preview.append(previewContent, previewTitle);

    this.body.prepend(content, preview);
    this.footer.prepend(startStreamRecordingButton);

    // private recordVideo: boolean;
    // private isPortraitOrientation: boolean;

    startStreamRecordingButton.addEventListener('click', async() => {
      try {
        await this.managers.appLiveStreamsManager.recordLiveStream({
          call: this.call,
          start: true,
          title: 'Stream title',
          video: this.recordVideo,
          video_portrait: this.isPortraitOrientation
        });

        toast('Livestream will be recorded and sent to your saved messages');
      } catch(err) {
        console.debug('err: ', err);
      }

      this.hide();
    });

    this.renderAudioPreview();
  }

  private renderAudioPreview() {
    const audio = document.createElement('div');
    audio.classList.add('popup-record-stream-preview-audio');

    const img = document.createElement('img');
    img.src = 'assets/img/recording_info_audio.svg';

    audio.append(img);

    replaceContent(this.previewContent, audio);
    replaceContent(this.previewTitle, i18n('LiveStream.PopUp.Recording.RecordAudioHint'));
  }

  private renderOrientationPreview() {
    const radioButtons = document.createElement('div');
    radioButtons.classList.add('popup-record-stream-preview-radio-buttons');

    const landscapeRadioButton = document.createElement('div');
    landscapeRadioButton.classList.add('popup-record-stream-preview-radio', 'landscape');
    const landscapeRadioButtonImage = document.createElement('img');
    landscapeRadioButtonImage.src = 'assets/img/recording_info_video_landscape.svg';
    landscapeRadioButton.append(landscapeRadioButtonImage);

    const portraitRadioButton = document.createElement('div');
    portraitRadioButton.classList.add('popup-record-stream-preview-radio', 'portrait');
    const portraitRadioButtonImage = document.createElement('img');
    portraitRadioButtonImage.src = 'assets/img/recording_info_video_portrait.svg';
    portraitRadioButton.append(portraitRadioButtonImage);

    radioButtons.append(landscapeRadioButton, portraitRadioButton);

    landscapeRadioButton.addEventListener('click', () => {
      if(this.isPortraitOrientation) {
        this.isPortraitOrientation = !this.isPortraitOrientation;
        portraitRadioButton.classList.remove('active');
        landscapeRadioButton.classList.add('active');
      }
    });

    portraitRadioButton.addEventListener('click', () => {
      if(!this.isPortraitOrientation) {
        this.isPortraitOrientation = !this.isPortraitOrientation;
        portraitRadioButton.classList.add('active');
        landscapeRadioButton.classList.remove('active');
      }
    });

    replaceContent(this.previewContent, radioButtons);
    replaceContent(this.previewTitle, i18n('LiveStream.PopUp.Recording.RecordVideoHint'));
  }
}
