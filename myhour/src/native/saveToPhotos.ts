import { Capacitor } from '@capacitor/core';
import { Media } from '@capacitor-community/media';
import { writeBlobToCache } from './shareFile';

// iOS 앱에서 카메라로 찍은 사진·영상 기록을 사진 앱에도 넣는다.
// 웹(사파리)은 사진첩에 직접 쓸 수 없어서 앱에서만 동작한다.
// 권한은 "추가만 허용"으로 처음 저장할 때 한 번 묻는다.
const ENABLED_KEY = 'hakku_auto_save_photos_v1';
const SAVE_DIR = 'photos';

/** 켜고 끌 수 있는 곳(설정)은 앱에서만 보여 준다. 기본값은 켜짐 */
export function isAutoSaveEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) !== '0'; } catch { return true; }
}

export function setAutoSaveEnabled(on: boolean): void {
  try { localStorage.setItem(ENABLED_KEY, on ? '1' : '0'); } catch { /* 저장 실패 시 기본값(켜짐) 유지 */ }
}

function extensionFor(blob: Blob, kind: 'photo' | 'video'): string {
  if (kind === 'video') return blob.type.includes('quicktime') ? 'mov' : 'mp4';
  if (blob.type.includes('png')) return 'png';
  if (blob.type.includes('heic')) return 'heic';
  return 'jpg';
}

/**
 * 기록 저장과 함께 부른다. 실패해도(권한 거절 등) 기록 저장에는 영향이 없도록 오류를 밖으로 던지지 않는다.
 * 사진 앱이 못 읽는 형식(webm 영상)은 건너뛴다.
 */
export async function saveCaptureToPhotos(blob: Blob, kind: 'photo' | 'video'): Promise<boolean> {
  if (!Capacitor.isNativePlatform() || !isAutoSaveEnabled()) return false;
  if (kind === 'video' && blob.type.includes('webm')) return false;
  try {
    const path = await writeBlobToCache(blob, `hakku-${Date.now()}.${extensionFor(blob, kind)}`, SAVE_DIR);
    await (kind === 'photo' ? Media.savePhoto({ path }) : Media.saveVideo({ path }));
    return true;
  } catch {
    return false;
  }
}
