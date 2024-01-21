/*
 * https://github.com/morethanwords/tweb
 * Copyright (C) 2019-2021 Eduard Kuzmenko
 * https://github.com/morethanwords/tweb/blob/master/LICENSE
 */

import type {GroupCallConnectionType, GroupCallId, GroupCallOutputSource} from '../appManagers/appGroupCallsManager';
import {IS_FIREFOX, IS_SAFARI} from '../../environment/userAgent';
import {GroupCall, GroupCallParticipant, InputGroupCall} from '../../layer';
import rootScope from '../rootScope';
import {AppManagers} from '../appManagers/managers';
import blobConstruct from '../../helpers/blob/blobConstruct';
import readBlobAsArrayBuffer from '../../helpers/blob/readBlobAsArrayBuffer';
import pause from '../../helpers/schedulers/pause';
import EventListenerBase from '../../helpers/eventListenerBase';

enum LIVE_STREAM_STATE {
  LOADING,
  RUNNING,
  STOPPED,
}

const STREAM_CHUNK_DURATION = 1000;
const RECORDER_METHOD_NAME: any = IS_FIREFOX ? 'mozCaptureStream' : 'captureStream';
const MEDIA_RECORDER_CODEC_MIME_TYPE = IS_FIREFOX ? 'video/webm' : 'video/webm;codecs=vp9,opus';
const MEDIA_SOURCE_BUFFER_CODEC_MIME_TYPE = 'video/webm;codecs="vp9,opus"';

export default class LiveStreamInstance {
  protected managers: AppManagers;

  private stream: InputGroupCall.inputGroupCall;

  private mediaSource: MediaSource;
  private sourceBuffer: SourceBuffer;

  private streamChunksMp4: ArrayBuffer[];
  private streamChunksWebm: ArrayBuffer[];

  private streamState: LIVE_STREAM_STATE;

  private streamPlayerVideo: HTMLVideoElement;
  private transcodingPlayer: HTMLVideoElement;

  private streamStartTimestamp: number;

  constructor(
    streamPlayerVideo: HTMLVideoElement,
    transcodingPlayer: HTMLVideoElement,
    stream: InputGroupCall.inputGroupCall,
    streamStartTimestamp: number
  ) {
    this.managers = rootScope.managers;
    this.stream = stream;
    this.streamChunksMp4 = [];
    this.streamChunksWebm = [];
    this.streamPlayerVideo = streamPlayerVideo;
    this.transcodingPlayer = transcodingPlayer;
    this.streamStartTimestamp = streamStartTimestamp;

    this.mediaSource = new MediaSource();
    this.streamPlayerVideo.src = URL.createObjectURL(this.mediaSource);
    this.mediaSource.addEventListener('sourceopen', () => {
      const sourceBuffer = this.mediaSource.addSourceBuffer(MEDIA_SOURCE_BUFFER_CODEC_MIME_TYPE);
      sourceBuffer.mode = 'sequence';
      this.sourceBuffer = sourceBuffer;
    });

    return this;
  };

  public playStream() {
    this.streamState = LIVE_STREAM_STATE.RUNNING;

    this.transcodingPlayer.volume = 0.0001;

    this.runMp4ChunkScheduler();

    setTimeout(() => {
      this.runMp4ToWebmScheduler()
    }, 2000);

    setTimeout(() => {
      this.runWebmPlayerScheduler();
      rootScope.dispatchEventSingle('live_stream_started');
    }, 4000);
  };

  public stopStream() {
    this.streamState = LIVE_STREAM_STATE.STOPPED;

    delete this.mediaSource;
    delete this.streamChunksMp4;
    delete this.streamChunksWebm;
  };

  public async runMp4ChunkScheduler() {
    while(this.streamState === LIVE_STREAM_STATE.RUNNING) {
      try {
        await this.loadMp4Chunk();
      } catch{}
    };
  };

  public async runMp4ToWebmScheduler() {
    while(this.streamState === LIVE_STREAM_STATE.RUNNING) {
      try {
        if(this.streamChunksMp4.length > 0) {
          await this.transcodeMp4ToWebm();
        } else {
          await pause(1000);
        }
      } catch{}
    }
  };

  public async runWebmPlayerScheduler() {
    while(this.streamState === LIVE_STREAM_STATE.RUNNING) {
      if(this.streamChunksWebm.length === 0) {
        await pause(750);
        continue;
      }

      if(this.mediaSource.readyState === 'open') {
        const arrayBuffer = this.streamChunksWebm.shift();
        this.sourceBuffer.appendBuffer(arrayBuffer);
      }

      await new Promise((resolve) => {
        this.sourceBuffer.addEventListener('updateend', resolve, {once: true});
      });
    }
  };

  public async loadMp4Chunk() {
    console.debug('this.streamStartTimestamp: ', this.streamStartTimestamp);

    try {
      const chunk = await this.managers.appLiveStreamsManager.getStreamChunk(
        this.stream,
        {
          call: this.stream,
          time_ms: this.streamStartTimestamp
        }
      );

      this.streamStartTimestamp += STREAM_CHUNK_DURATION;
      this.streamChunksMp4.push(chunk);

      await pause(1000);
    } catch(error) {
      console.debug('ERROR DURING FETCH: ', error);
      await pause(3000);
    }
  };

  public async transcodeMp4ToWebm() {
    return new Promise<void>((resolve) => {
      let mediaRecorder: MediaRecorder;

      const blobSrc = URL.createObjectURL(blobConstruct<any>(this.streamChunksMp4.shift()));
      this.transcodingPlayer.src = blobSrc;
      this.transcodingPlayer.load();

      this.transcodingPlayer.onloadedmetadata = async() => {
        await this.transcodingPlayer.play();

        const stream = (this.transcodingPlayer as any)[RECORDER_METHOD_NAME]();
        mediaRecorder = new MediaRecorder(stream, {mimeType: MEDIA_RECORDER_CODEC_MIME_TYPE});
        const recordedChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if(event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async() => {
          const blob = new Blob(recordedChunks, {type: 'video/webm'});
          const arrayBufferFromBlob = await readBlobAsArrayBuffer(blob);
          this.streamChunksWebm.push(arrayBufferFromBlob);

          console.debug('======> APPENDING NEW WEBM: ', arrayBufferFromBlob);
          console.debug('===> TOTAL CHUNKS: ', this.streamChunksWebm);

          URL.revokeObjectURL(blobSrc);
          resolve();
        };

        mediaRecorder.start();
      };

      this.transcodingPlayer.onended = () => {
        if(mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      };
    });
  };
}
