import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

// iOS 앱(WKWebView)에서는 a.download가 동작하지 않고 웹 공유 API도 믿을 수 없다.
// 그래서 파일을 앱 캐시 폴더에 쓴 뒤 iOS 공유 시트를 띄운다 — 시트에 "동영상 저장", "파일에 저장"이 들어 있다.
const SHARE_DIR = 'share';
// 3의 배수라야 조각마다 base64로 바꿔 이어 붙여도 안전하다. 큰 백업 파일도 메모리를 조금씩만 쓴다.
const CHUNK_BYTES = 3 * 512 * 1024;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

/**
 * 앱 캐시 폴더 dir/에 파일을 쓰고 file:// 주소를 돌려준다. 지난번에 그 폴더에 쓴 파일은 지운다
 * (캐시라 iOS가 알아서 비우기도 하지만 쌓이지 않게).
 */
export async function writeBlobToCache(blob: Blob, filename: string, dir: string = SHARE_DIR): Promise<string> {
  await Filesystem.rmdir({ path: dir, directory: Directory.Cache, recursive: true }).catch(() => {});
  const path = `${dir}/${filename}`;
  let uri = '';
  for (let offset = 0; offset === 0 || offset < blob.size; offset += CHUNK_BYTES) {
    const data = toBase64(new Uint8Array(await blob.slice(offset, offset + CHUNK_BYTES).arrayBuffer()));
    if (offset === 0) {
      uri = (await Filesystem.writeFile({ path, data, directory: Directory.Cache, recursive: true })).uri;
    } else {
      await Filesystem.appendFile({ path, data, directory: Directory.Cache });
    }
  }
  return uri;
}

/**
 * iOS 앱이면 공유 시트로 파일을 내보내고 true를 돌려준다. 웹이면 아무것도 하지 않고 false —
 * 부르는 쪽이 기존 웹 방식(navigator.share / 다운로드 링크)을 그대로 쓴다.
 * 사용자가 공유 시트를 닫은 것은 오류로 보지 않는다.
 */
export async function shareFileNative(blob: Blob, filename: string, title?: string): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  const uri = await writeBlobToCache(blob, filename);
  try {
    await Share.share({ title, files: [uri] });
  } catch (error) {
    if (!(error instanceof Error && /cancel/i.test(error.message))) throw error;
  }
  return true;
}
