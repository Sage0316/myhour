// BGM 서빙 워커. R2 버킷(myhour-media)의 mp3를 하꾸 앱에 내보낸다.
//
// 버킷을 공개(r2.dev)하지 않고 이 워커를 통해서만 내보내는 이유:
//   1) CORS를 코드로 관리한다 — 영상 생성은 fetch → arrayBuffer → decodeAudioData로
//      오디오 '바이트'를 읽기 때문에 CORS 허용 헤더가 없으면 실패한다.
//      (<audio src>로 듣기만 하는 건 CORS 없이도 되므로, 빠지면 "시청 페이지에선
//       들리는데 영상엔 음악이 없다"는 헷갈리는 증상이 된다)
//   2) r2.dev는 Cloudflare가 프로덕션 비권장으로 안내하고 레이트 리밋이 있다.
//   3) 버킷 전체가 인터넷에 열리지 않는다.

// 파일명 화이트리스트 형태 — 경로 탐색(../)과 버킷 무단 탐색을 막는다
const KEY_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*\.mp3$/;

function allowedOrigin(request, env) {
  const origin = request.headers.get('Origin') ?? '';
  const allowlist = (env.ALLOWED_ORIGINS ?? '')
    .split(',').map(value => value.trim()).filter(Boolean);
  return allowlist.includes(origin) ? origin : '';
}

function corsHeaders(origin) {
  return {
    ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Vary': 'Origin',
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          ...corsHeaders(origin),
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Allow-Headers': 'Range',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('method_not_allowed', { status: 405, headers: corsHeaders(origin) });
    }
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
      });
    }

    const match = url.pathname.match(/^\/bgm\/([^/]+)$/);
    if (!match) return new Response('not_found', { status: 404, headers: corsHeaders(origin) });
    const key = decodeURIComponent(match[1]);
    if (!KEY_PATTERN.test(key)) {
      return new Response('not_found', { status: 404, headers: corsHeaders(origin) });
    }

    // iOS Safari는 <audio>를 재생할 때 Range 요청을 보내고 206 응답을 기대한다.
    // 이걸 지원하지 않으면 시청 페이지에서 재생이 멈추거나 아예 시작되지 않는다.
    const range = request.headers.get('Range');
    const object = await env.MEDIA.get(key, range ? { range: request.headers } : undefined);
    if (!object) return new Response('not_found', { status: 404, headers: corsHeaders(origin) });

    const headers = new Headers(corsHeaders(origin));
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Content-Type', object.httpMetadata?.contentType ?? 'audio/mpeg');
    // 곡 파일은 내용이 바뀌지 않는다 — 오래 캐시해서 R2 요청 수와 재생 지연을 줄인다
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('Accept-Ranges', 'bytes');

    if (object.range && range) {
      const start = object.range.offset ?? 0;
      const length = object.range.length ?? (object.size - start);
      headers.set('Content-Range', `bytes ${start}-${start + length - 1}/${object.size}`);
      return new Response(request.method === 'HEAD' ? null : object.body, { status: 206, headers });
    }
    return new Response(request.method === 'HEAD' ? null : object.body, { status: 200, headers });
  },
};
