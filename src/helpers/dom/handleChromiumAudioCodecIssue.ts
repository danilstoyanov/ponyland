/*
  This file has set of utils which can help to bypass issue which happens to the videos
  having audio encoded with HE-AACv2 codec

  Chromium bug discussion:
  https://bugs.chromium.org/p/chromium/issues/detail?id=1250841
*/

import loadScript from './loadScript';
import readBlobAsArrayBuffer from '../blob/readBlobAsArrayBuffer';

export default async function loadMp4box() {
  if(typeof(window as any).MP4Box === 'undefined') {
    await loadScript('mp4box.min.js');
    console.debug('mp4box.min.js script loaded');
  } else {
    console.debug('MP4Box is already loaded');
  }
}

export async function testIsChromiumAudioCodecIssue(blob: Blob, video: any) {
  await loadMp4box();

  console.debug('BLOB: ', blob);
  console.debug('TARGET VIDEO: ', video);

  const videoArrayBuffer = await readBlobAsArrayBuffer(blob);
  (videoArrayBuffer as any).fileStart = 0;

  // КОНСТАНТЫ
  const SEGMENT_SIZE_LABEL = 10000;

  async function prepareMediaSource(video: HTMLVideoElement) {
    return new Promise<MediaSource>((resolve) => {
      const mediaSource = new MediaSource();
      video.src = URL.createObjectURL(mediaSource);
      mediaSource.addEventListener('sourceopen', () => resolve(mediaSource), {once: true});
    });
  }

  const mediaSource = await prepareMediaSource(video);
  (mediaSource as any).video = video;
  video.ms = mediaSource;

  let movieInfo: any;
  const ms = video.ms;
  const mp4boxFile = (window as any).MP4Box.createFile();

  function addBuffer(video: any, mp4track: any) {
    const mediaSource = video.ms;
    const trackId = mp4track.id;
    const mimeType = `video/mp4; codecs="${mp4track.codec}"`;
    const isTrackSupported = MediaSource.isTypeSupported(mimeType);

    let sourceBuffer;

    if(isTrackSupported) {
      try {
        console.debug(`MSE - SourceBuffer #${trackId} Creation with type '${mimeType}'`);

        sourceBuffer = mediaSource.addSourceBuffer(mimeType);
        sourceBuffer.ms = mediaSource;
        sourceBuffer.id = trackId;

        mp4boxFile.setSegmentOptions(trackId, sourceBuffer, {nbSamples: SEGMENT_SIZE_LABEL});
        sourceBuffer.pendingAppends = [];
      } catch(e) {
        console.debug(`MSE - SourceBuffer #${trackId} Cannot create buffer with type '${mimeType}'`, e);
      }
    }
  }

  function initializeAllSourceBuffers() {
    console.debug('INITIALIZE ALL BUFFERS DID WORK');

    if(movieInfo) {
      var info = movieInfo;

      for(var i = 0; i < info.tracks.length; i++) {
        var track = info.tracks[i];
        addBuffer(video, track);
      }
      initializeSourceBuffers();
    }
  }

  function onUpdateEnd(this: any, isNotInit: any, isEndOfAppend: any) {
    console.debug('ON UPDATE END DID WORK: ', this);

    if(isEndOfAppend === true) {
      if(this.sampleNum) {
        mp4boxFile.releaseUsedSamples(this.id, this.sampleNum);
        delete this.sampleNum;
      }
      if(this.is_last) {
        this.ms.endOfStream();
      }
    }

    if(this.ms.readyState === 'open' && this.updating === false && this.pendingAppends.length > 0) {
      var obj = this.pendingAppends.shift();
      console.debug('MSE - SourceBuffer #' + this.id, 'Appending new buffer, pending: ' + this.pendingAppends.length);
      this.sampleNum = obj.sampleNum;
      this.is_last = obj.is_last;
      this.appendBuffer(obj.buffer);
    }
  }

  function onInitAppended(event: any) {
    console.debug('ON INIT APPEND DID WORK');

    var sb = event.target;
    if(sb.ms.readyState === 'open') {
      sb.sampleNum = 0;
      sb.removeEventListener('updateend', onInitAppended);
      sb.addEventListener('updateend', onUpdateEnd.bind(sb, true, true));

      /* In case there are already pending buffers we call onUpdateEnd to start appending them */
      onUpdateEnd.call(sb, false, true);
      sb.ms.pendingInits--;
      if(sb.ms.pendingInits === 0) {
        mp4boxFile.start();
      }
    }
  }

  function initializeSourceBuffers() {
    console.debug('INITIALIZE SEGMENTATION DID WORK', mp4boxFile);

    var initSegs = mp4boxFile.initializeSegmentation();

    for(var i = 0; i < initSegs.length; i++) {
      var sb = initSegs[i].user;
      if(i === 0) {
        sb.ms.pendingInits = 0;
      }
      sb.addEventListener('updateend', onInitAppended);
      console.debug('MSE - SourceBuffer #' + sb.id, 'Appending initialization data');
      sb.appendBuffer(initSegs[i].buffer);
      sb.segmentIndex = 0;
      sb.ms.pendingInits++;
    }
  }

  mp4boxFile.onReady = function(info: any) {
    movieInfo = info;

    if(info.isFragmented) {
      ms.duration = info.fragment_duration / info.timescale;
    } else {
      ms.duration = info.duration / info.timescale;
    }

    console.debug('FUNCTION IN ONREADY: ', mp4boxFile, initializeAllSourceBuffers, video);

    mp4boxFile.start();
    initializeAllSourceBuffers();

    video.play();
  };

  mp4boxFile.onSegment = function(id: any, user: any, buffer: any, sampleNum: any, is_last: any) {
    console.debug('Segment received...', sampleNum);

    user.segmentIndex++;
    user.pendingAppends.push({id: id, buffer: buffer, sampleNum: sampleNum, is_last: is_last});
    onUpdateEnd.call(user, true, false);
  };

  mp4boxFile.onError = function(error: any) {
    console.debug('ERROR: ', error);
  }

  mp4boxFile.appendBuffer(videoArrayBuffer);
};
