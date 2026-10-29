import { Capacitor, registerPlugin } from '@capacitor/core';
import { writeBlobToCache } from './shareFile';
import { L } from '../i18n';

// 인스타 릴스로 바로 공유 (iOS 앱 전용, ios/App/App/HakkuBridgeViewController.swift).
// Meta가 출처 확인용으로 Facebook 앱 ID를 요구한다. 비밀값이 아니라 공개 식별자다.
const META_APP_ID = (import.meta.env.VITE_META_APP_ID as string | undefined)?.trim() ?? '';

interface InstagramSharePlugin {
  shareToReels(options: { path: string; appId: string }): Promise<void>;
}

const InstagramShare = registerPlugin<InstagramSharePlugin>('InstagramShare');

/** 릴스 버튼을 보여 줄 수 있는가 (앱 + Meta 앱 ID 등록됨) */
export function canShareToReels(): boolean {
  return Capacitor.isNativePlatform() && META_APP_ID !== '';
}

/** 영상을 담은 채로 인스타그램 릴스 편집 화면을 연다. 실패하면 사람이 읽을 문장으로 던진다 */
export async function shareToReels(blob: Blob): Promise<void> {
  if (!canShareToReels()) throw new Error(L('인스타 릴스 공유는 앱에서 할 수 있어요.', 'Sharing to Reels works in the app.'));
  const path = await writeBlobToCache(blob, `hakku-${Date.now()}.mp4`, 'reels');
  try {
    await InstagramShare.shareToReels({ path, appId: META_APP_ID });
  } catch (error) {
    throw new Error(error instanceof Error && error.message ? error.message : L('인스타그램을 열지 못했어요.', 'Couldn\'t open Instagram.'));
  }
}
