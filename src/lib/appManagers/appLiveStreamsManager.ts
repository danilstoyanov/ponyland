import {getEnvironment} from '../../environment/utils';
import {nextRandomUint} from '../../helpers/random';
import UniqueNumberGenerator from '../../helpers/uniqueNumberGenerator';
import {DataJSON, GroupCall, InputGroupCall, InputPeer, Updates, Update, GroupCallParticipant, InputFileLocation, UploadFile, PhoneGroupCall} from '../../layer';
import {JoinGroupCallJsonPayload} from './appGroupCallsManager';
import {AppManager} from './manager';

export type GroupCallId = GroupCall['id'];

export type MyGroupCall = GroupCall | InputGroupCall;

interface RecordLiveStreamParams {
  call: InputGroupCall.inputGroupCall,
  start?: boolean,
  video?: boolean,
  title?: string,
  video_portrait?: boolean,
};

export default class AppLiveStreamsManager extends AppManager {
  public async createLiveStream(chatId: ChatId) {
    const updates = await this.apiManager.invokeApi('phone.createGroupCall', {
      peer: this.appPeersManager.getInputPeerById(chatId.toPeerId(true)),
      random_id: nextRandomUint(32),
      rtmp_stream: true
    });

    this.apiUpdatesManager.processUpdateMessage(updates);

    const update = (updates as Updates.updates).updates.find((update) => update._ === 'updateGroupCall') as Update.updateGroupCall;

    return update.call;
  }

  public getGroupCallStreamRtmpUrl(peerId: InputPeer, revoke?: boolean) {
    return this.apiManager.invokeApi('phone.getGroupCallStreamRtmpUrl', {peer: peerId, revoke: !!revoke});
  }

  public getStreamChannels(call: InputGroupCall) {
    debugger;
    return this.apiManager.invokeApi('phone.getGroupCallStreamChannels', {call});
  }

  public getGroupCall(call: InputGroupCall) {
    return this.apiManager.invokeApi('phone.getGroupCall', {call, limit: 10});
  }

  public async recordLiveStream({
    call,
    start = true,
    video = true,
    title = '',
    video_portrait = true
  }: RecordLiveStreamParams) {
    try {
      await this.apiManager.invokeApi('phone.toggleGroupCallRecord', {
        call,
        start,
        video,
        title,
        video_portrait
      });
    } catch(err) {
      debugger;
    }
  }

  public async joinLiveStream(channelId: ChatId, call?: GroupCall.groupCall) {
    let callInstance: GroupCall.groupCall | PhoneGroupCall.phoneGroupCall;
    let inputGroupCall: InputGroupCall.inputGroupCall;

    if(call) {
      callInstance = call;
    } else {
      const chatInfo = await this.appProfileManager.getChatFull(channelId);
      callInstance = await this.getGroupCall(chatInfo.call);
    }

    if('call' in callInstance) {
      inputGroupCall = {
        _: 'inputGroupCall',
        id: callInstance.call.id,
        access_hash: callInstance.call.access_hash
      }
    } else {
      inputGroupCall = {
        _: 'inputGroupCall',
        id: callInstance.id,
        access_hash: callInstance.access_hash
      }
    }

    const generator = new UniqueNumberGenerator(2, 4294967295);
    const inputPeerSelf = this.appPeersManager.getInputPeerSelf();

    const JSONDataParams: JoinGroupCallJsonPayload = {
      'ssrc': generator.generate(),
      'pwd': '',
      'ufrag': '',
      'fingerprints': [],
      'ssrc-groups': []
    };

    const updates = await this.apiManager.invokeApi('phone.joinGroupCall', {
      call: inputGroupCall,
      join_as: inputPeerSelf,
      muted: true,
      video_stopped: true,
      params: {
        _: 'dataJSON',
        data: JSON.stringify(JSONDataParams)
      }
    });

    const update = (updates as Updates.updates).updates.find((update) => update._ === 'updateGroupCall') as Update.updateGroupCall;

    return update.call;
  }

  public async getStreamChunk(
    call: InputGroupCall.inputGroupCall,
    {
      time_ms,
      scale = 0,
      video_channel = 1,
      video_quality = 1
    }: Partial<InputFileLocation.inputGroupCallStream>
  ) {
    const STREAM_CHUNK_SIGNATURE_OFFSET = 32;

    const streamChunk = await this.apiManager.invokeApi('upload.getFile', {
      location: {
        _: 'inputGroupCallStream',
        call,
        time_ms,
        scale,
        video_channel,
        video_quality
      },
      precise: true,
      offset: 0,
      limit:  1_048_576
    }) as UploadFile.uploadFile;

    return streamChunk.bytes.slice(STREAM_CHUNK_SIGNATURE_OFFSET);
  }
}
