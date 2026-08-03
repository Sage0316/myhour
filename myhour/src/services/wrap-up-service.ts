import {
  addToArchive,
  archiveVideoKey,
  deleteVideoFromIDB,
  saveVideoToIDB,
  type MyRecord,
} from '../store';
import { createStableId } from '../domain/model';
import { consumeVideoForDate, hasVideoForDate } from '../videoEntitlement';

export interface WrapUpResult {
  archiveId: string;
  generated: boolean;
}

export class WrapUpService {
  // title: 영상에 실제로 들어간 제목 — 아카이브 카드에서 같은 제목을 보여주려면 반드시 넘겨야 한다
  async complete(date: string, records: MyRecord[], generatedVideo: Blob, title?: string): Promise<WrapUpResult> {
    // 같은 날짜로 두 번 만들 수 없다 — 이용권은 날짜당 한 번이다
    if (hasVideoForDate(date)) throw new Error('이 날짜는 이미 영상을 만들었어요.');
    const archiveId = createStableId('archive');
    const videoKey = archiveVideoKey({ id: archiveId, date });
    await saveVideoToIDB(videoKey, generatedVideo);
    try {
      addToArchive({
        id: archiveId,
        date,
        records,
        isWrapped: true,
        trimmed: false,
        title: title?.trim() || undefined,
      });
      // 차감은 여기 한 곳뿐이다: 영상이 만들어지고 아카이브까지 저장에 성공한 뒤.
      // 앞에서 실패하면 아래로 오지 않으므로 되돌릴 차감도 없다.
      consumeVideoForDate(date);
      return { archiveId, generated: true };
    } catch (error) {
      await deleteVideoFromIDB(videoKey).catch(() => undefined);
      throw error;
    }
  }

  // "영상 없이 마감" — AI 결과는 이미 캐시에 저장돼 있고, 이용권은 차감하지 않는다
  skip(date: string, records: MyRecord[]): WrapUpResult {
    const archiveId = createStableId('archive');
    addToArchive({
      id: archiveId,
      date,
      records,
      isWrapped: false,
      trimmed: false,
    });
    return { archiveId, generated: false };
  }
}

export const wrapUpService = new WrapUpService();
