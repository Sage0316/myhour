import type { MyRecord } from '../store';
import { generateVideo } from '../videoGenerator';

export interface VideoGenerationOptions {
  title?: string;
  closing?: string;
  bgmUrl?: string;
  emojis?: string;
  mood?: string;
  captions?: string[];
  // 기록별 이모지 — 무드 이모지(emojis)와 절대 섞지 않는다 (CLAUDE.md 이모지 규칙)
  recordEmojis?: string[];
}

export interface VideoCapabilityReport {
  supported: boolean;
  mimeType?: string;
  warnings: string[];
}

export interface VideoEnginePort {
  capabilities(): VideoCapabilityReport;
  generate(
    records: MyRecord[],
    dateLabel: string,
    onProgress: (progress: number) => void,
    options: VideoGenerationOptions,
    onWarning: (warning: string) => void,
    signal?: AbortSignal,
  ): Promise<Blob>;
}

export class BrowserVideoGenerationService implements VideoEnginePort {
  capabilities(): VideoCapabilityReport {
    if (typeof MediaRecorder === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
      return { supported: false, warnings: ['이 브라우저는 영상 생성을 지원하지 않아요.'] };
    }
    // videoGenerator와 같은 우선순위 — mp4가 먼저다 (iOS 사진첩 저장 때문에, CLAUDE.md 참고)
    const mimeType = [
      'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
      'video/mp4;codecs=h264,aac',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
    ].find(type => MediaRecorder.isTypeSupported(type));
    return mimeType
      ? { supported: true, mimeType, warnings: [] }
      : { supported: false, warnings: ['지원되는 영상 코덱을 찾지 못했어요.'] };
  }

  generate(
    records: MyRecord[],
    dateLabel: string,
    onProgress: (progress: number) => void,
    options: VideoGenerationOptions,
    onWarning: (warning: string) => void,
    signal?: AbortSignal,
  ): Promise<Blob> {
    const report = this.capabilities();
    if (!report.supported) throw new Error(report.warnings.join('\n'));
    return generateVideo(records, dateLabel, onProgress, options, onWarning, signal);
  }
}

export const videoGenerationService = new BrowserVideoGenerationService();
