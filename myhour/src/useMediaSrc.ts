import { useEffect, useState } from 'react';
import type { MyRecord } from './store';
import { loadVideoFromIDB } from './store';

// 사진·짤·음성 원본의 표시용 src.
// 신규 기록은 IndexedDB(mediaKey)에서 불러오고, 구버전 기록은 content의 data URL을 그대로 쓴다.
// 원본이 정리된 기록(영상 완성 후)은 null을 돌려준다.
export function useMediaSrc(record: MyRecord): string | null {
  const isInlineDataUrl = record.content.startsWith('data:');
  const [src, setSrc] = useState<string | null>(isInlineDataUrl ? record.content : null);

  useEffect(() => {
    if (isInlineDataUrl) { setSrc(record.content); return; }
    if (!record.mediaKey) { setSrc(null); return; }

    let cancelled = false;
    let objectUrl: string | null = null;
    loadVideoFromIDB(record.mediaKey).then(url => {
      if (cancelled) {
        if (url) URL.revokeObjectURL(url);
        return;
      }
      objectUrl = url;
      setSrc(url);
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [record.mediaKey, record.content, isInlineDataUrl]);

  return src;
}
