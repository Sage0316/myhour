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
  async complete(date: string, records: MyRecord[], generatedVideo: Blob): Promise<WrapUpResult> {
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
