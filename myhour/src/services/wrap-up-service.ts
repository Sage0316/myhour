import {
  addToArchive,
  archiveVideoKey,
  deleteVideoFromIDB,
  saveVideoToIDB,
  type MyRecord,
} from '../store';
import { createStableId } from '../domain/model';

export interface WrapUpResult {
  archiveId: string;
  generated: boolean;
}

export class WrapUpService {
  // title: 영상에 실제로 들어간 제목 — 아카이브 카드에서 같은 제목을 보여주려면 반드시 넘겨야 한다
  async complete(date: string, records: MyRecord[], generatedVideo: Blob, title?: string): Promise<WrapUpResult> {
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
      return { archiveId, generated: true };
    } catch (error) {
      await deleteVideoFromIDB(videoKey).catch(() => undefined);
      throw error;
    }
  }

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
