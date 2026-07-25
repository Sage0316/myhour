import type { MyRecord } from '../store';
import { generateVideo } from '../videoGenerator';

export interface VideoGenerationOptions {
  title?: string;
  closing?: string;
  bgmUrl?: string;
  emojis?: string;
  mood?: string;
  captions?: string[];
  diaryEmojis?: string[];
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
    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
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
