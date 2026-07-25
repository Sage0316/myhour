import type { RecordType } from '../store';

export const CAPTURE_LIMITS: Record<Exclude<RecordType, 'text'>, number> = {
  photo: 25 * 1024 * 1024,
  video: 80 * 1024 * 1024,
  audio: 15 * 1024 * 1024,
};

const STORAGE_RESERVE_BYTES = 50 * 1024 * 1024;

export interface CaptureCapabilityReport {
  allowed: boolean;
  availableBytes: number | null;
  limitBytes: number;
  reason?: string;
}

export async function checkCaptureCapacity(
  type: Exclude<RecordType, 'text'>,
  requestedBytes: number,
): Promise<CaptureCapabilityReport> {
  const limitBytes = CAPTURE_LIMITS[type];
  if (requestedBytes <= 0 || requestedBytes > limitBytes) {
    return {
      allowed: false,
      availableBytes: null,
      limitBytes,
      reason: `${type === 'photo' ? '사진' : type === 'video' ? '영상' : '음성'} 크기 제한을 초과했어요.`,
    };
  }

  const estimate = await navigator.storage?.estimate?.().catch(() => undefined);
  const availableBytes = estimate?.quota != null && estimate?.usage != null
    ? Math.max(0, estimate.quota - estimate.usage)
    : null;
  if (availableBytes != null && requestedBytes + STORAGE_RESERVE_BYTES > availableBytes) {
    return {
      allowed: false,
      availableBytes,
      limitBytes,
      reason: '기기 저장공간이 부족해요. 기존 기록을 백업한 뒤 공간을 확보해주세요.',
    };
  }
  return { allowed: true, availableBytes, limitBytes };
}

export async function assertCaptureCapacity(
  type: Exclude<RecordType, 'text'>,
  blob: Blob,
): Promise<void> {
  const report = await checkCaptureCapacity(type, blob.size);
  if (!report.allowed) throw new Error(report.reason ?? '미디어를 저장할 수 없어요.');
}

export async function hashBlob(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
}
