import { useState, useEffect, useRef } from 'react';
import { useApp } from '../appContext';
import { TYPE_COLORS, MOOD_LIST, guessMood, generateTitle, generateClosing, getDateStrings, getSessionDate } from '../store';
import type { MoodItem } from '../store';
import { ensureDiaryFont, fallbackEmojisFor, splitEmojis } from '../scenes';
import { analyzeDay, hasAIConsent, isAIConfigured, BGM_TRACKS, bgmAssetUrl, pickBgmFile } from '../llmDirector';
import type { DirectorOutput } from '../llmDirector';
import { videoGenerationService } from '../services/video-generation-service';
import { wrapUpService } from '../services/wrap-up-service';
import { useDialogFocus } from '../accessibility/useDialogFocus';

interface WrapUpScreenProps {
  onClose: () => void;
  onSave: (archiveId: string) => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

// BGM 무드 → 슬라이더 초깃값. AI가 고른 곡 분위기를 슬라이더에 비춰준다.
// 예전엔 무조건 72로 시작해서, 슬픈 날에도 슬라이더가 남의 값처럼 걸려 있었다.
const CALMNESS_BY_TRACK: Record<string, number> = {
  calm: 85, piano: 80, nostalgic: 76, sad: 74, emotional: 66, ukulele: 30, bright: 25,
};

export default function WrapUpScreen({ onClose, onSave }: WrapUpScreenProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  const { records, settings } = useApp();
  const sessionDate = getSessionDate(settings.startTime);
  const { dateShort, dateDay, dateWeekday } = getDateStrings(sessionDate);

  const autoMood = guessMood(records);
  const [selectedMood, setSelectedMood] = useState<MoodItem>(autoMood);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  // 사용자가 직접 무드를 고른 뒤에는 AI 분석 결과로 덮어쓰지 않는다
  const userPickedMoodRef = useRef(false);
  // 이모지·정도는 "사용자가 고쳤을 때만" AI 결과를 이긴다. null이면 아직 안 건드린 상태.
  // 예전엔 고정 초깃값(😌, 72)이 들어가 있고 생성할 땐 AI 값이 무조건 이겨서,
  // 무슨 칩을 눌러도 영상이 그대로였다 — 그래서 "에러 나서 기본값에 걸린" 것처럼 보였다.
  const [emojiPick, setEmojiPick] = useState<string | null>(null);
  const [calmnessPick, setCalmnessPick] = useState<number | null>(null);
  // 기본은 접어둔다 — 늘 펼쳐져 있으면서 "더 정확하게 · 선택"이라고만 적혀 있으니
  // 뭘 하는 칸인지, 눌러도 되는 건지 알 수 없었다
  const [tuningOpen, setTuningOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [director, setDirector] = useState<DirectorOutput | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const fallbackTitle = generateTitle(records);
  const fallbackClosing = generateClosing(records, selectedMood.mood);
  const title = titleOverride ?? director?.title ?? fallbackTitle;
  const closing = director?.closing ?? fallbackClosing;

  // 칩 = AI가 오늘 고른 이모지 + 그날 무드 팔레트(슬픔이면 😢🌧️💧🫂), 중복 제거해서 5개까지.
  // AI 것을 목록에 넣지 않으면 선택된 칩이 하나도 없는 상태가 된다 — AI는 팔레트 밖 이모지를
  // 자주 고르기 때문이다 (예: 슬픔인데 😮‍💨). 첫 칸이 곧 기본 선택이라 AI 것이 앞에 온다.
  const emojiChoices = [...new Set([
    ...(director?.emojis ? splitEmojis(director.emojis) : []),
    ...fallbackEmojisFor(selectedMood.mood),
  ])].slice(0, 5);
  const activeEmoji = emojiPick ?? emojiChoices[0];
  const calmness = calmnessPick
    ?? (director ? CALMNESS_BY_TRACK[director.bgmTrack] ?? 72 : 72);

  const TITLE_MAX = 30;

  function startEditingTitle() {
    setTitleDraft(title);
    setEditingTitle(true);
  }

  function commitTitle() {
    const next = titleDraft.trim().slice(0, TITLE_MAX);
    setTitleOverride(next || null);
    setEditingTitle(false);
  }

  // 손글씨 폰트를 미리 데워둬서, 영상 만들기 탭 시점엔 이미 캐시돼 있게
  useEffect(() => { ensureDiaryFont(); }, []);

  useEffect(() => {
    if (!hasAIConsent() || !isAIConfigured() || records.length === 0) return;
    const controller = new AbortController();
    setAnalyzing(true);
    analyzeDay(records, `${dateDay} ${dateWeekday}`, controller.signal)
      .then(out => {
        setDirector(out);
        setAnalyzing(false);
        // AI가 고른 무드로 칩을 자동 선택 — 단, 사용자가 이미 직접 골랐다면 건드리지 않는다
        const chip = MOOD_LIST.find(m => m.mood === out.moodChip);
        if (chip && !userPickedMoodRef.current) setSelectedMood(chip);
        try { localStorage.setItem(`hakku_director_v1_${sessionDate}`, JSON.stringify(out)); } catch { /* ignore */ }
      })
      .catch(e => {
        if (controller.signal.aborted) return;
        setAnalyzeError(e instanceof Error ? e.message : 'AI 분석 실패');
        setAnalyzing(false);
      });
    return () => controller.abort();
  }, [dateDay, dateWeekday, records, sessionDate]);

  useEffect(() => () => generationAbortRef.current?.abort(), []);

  const clipColors = records.length > 0
    ? records.slice(0, 5).map(r => TYPE_COLORS[r.type])
    : ['#F0D9C8', '#D9EAD9', '#E4DBF5', '#F4ECD9', '#F0D9C8'];

  async function handleGenerate() {
    if (records.length === 0 || generating) return;
    setGenerating(true);
    setProgress(0);
    setGenError(null);
    const abortController = new AbortController();
    generationAbortRef.current = abortController;
    try {
      // 슬라이더를 직접 움직였으면 그 선택이 AI가 고른 곡보다 우선한다
      const bgmTrack = calmnessPick !== null
        ? (calmnessPick >= 60 ? 'calm' : 'bright')
        : director?.bgmTrack ?? (calmness >= 60 ? 'calm' : 'bright');
      const bgmFile = pickBgmFile(bgmTrack);
      const bgmUrl = bgmAssetUrl(bgmFile);
      const warnings: string[] = [];
      const blob = await videoGenerationService.generate(records, `${dateDay} ${dateWeekday}`, p => setProgress(p), {
        title, closing, bgmUrl,
        emojis: emojiPick ?? director?.emojis ?? emojiChoices.join(''),
        mood: selectedMood.mood,
        captions: director?.captions,
        recordEmojis: director?.recordEmojis,
      }, msg => warnings.push(msg), abortController.signal);
      if (warnings.length > 0) alert('영상은 생성됐지만 문제가 있었어요:\n\n' + warnings.join('\n'));
      const result = await wrapUpService.complete(sessionDate, records, blob, title);
      onSave(result.archiveId);
    } catch (e) {
      const msg = e instanceof DOMException && e.name === 'AbortError'
        ? '영상 생성을 취소했어요. 원본 기록은 그대로 보존됐어요.'
        : e instanceof Error ? e.message : '영상 생성에 실패했어요';
      setGenError(msg);
      setGenerating(false);
    } finally {
      generationAbortRef.current = null;
    }
  }

  function handleSkipVideo() {
    try {
      const result = wrapUpService.skip(sessionDate, records);
      onSave(result.archiveId);
    } catch {
      setGenError('저장에 실패했어요. 저장 공간이 부족할 수 있어요.');
    }
  }

  return (
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="하루 마감" style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
      <div style={{ flex: 1, padding: '58px 22px 0', display: 'flex', flexDirection: 'column', gap: 13, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>
            Wrap up · {dateShort}
          </div>
          <button onClick={onClose} aria-label="하루 마감 닫기" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(26,26,26,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, border: 'none', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ fontSize: 23, fontWeight: 600, letterSpacing: '-0.5px', lineHeight: 1.25 }}>
          오늘을 영상으로 마무리해요
        </div>

        <div>
          <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)', marginBottom: 9 }}>
            Today's clips · {records.length || 5}
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {clipColors.map((bg, i) => (
              <div key={i} style={{ width: 34, height: 46, borderRadius: 7, background: `repeating-linear-gradient(135deg, rgba(26,26,26,0.06) 0 5px, rgba(26,26,26,0) 5px 10px), ${bg}` }} />
            ))}
            <div style={{ color: 'rgba(26,26,26,0.35)', fontSize: 18, margin: '0 2px' }}>→</div>
            <div style={{ width: 34, height: 46, borderRadius: 7, background: '#1A1A1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 0, height: 0, borderLeft: '8px solid #fff', borderTop: '5px solid transparent', borderBottom: '5px solid transparent', marginLeft: 2 }} />
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 18, padding: 15, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)' }}>오늘의 기록</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 50, background: selectedMood.color, fontSize: 12, fontWeight: 500 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: selectedMood.dot, display: 'inline-block' }} />
                {selectedMood.mood}
              </span>
              <button type="button" onClick={() => setShowMoodPicker(v => !v)} aria-expanded={showMoodPicker} style={{ fontSize: 12, color: '#7C5CC4', textDecoration: 'underline', cursor: 'pointer', border: 0, background: 'transparent' }}>바꾸기</button>
            </div>
          </div>

          {showMoodPicker && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MOOD_LIST.map(m => (
                <button key={m.mood} onClick={() => { userPickedMoodRef.current = true; setSelectedMood(m); setEmojiPick(null); setShowMoodPicker(false); }} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 50, background: m.color,
                  fontSize: 12, fontWeight: selectedMood.mood === m.mood ? 600 : 400,
                  border: selectedMood.mood === m.mood ? `2px solid ${m.dot}` : '2px solid transparent',
                  cursor: 'pointer',
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: m.dot, display: 'inline-block' }} />
                  {m.mood}
                </button>
              ))}
            </div>
          )}

          <div>
            {analyzing ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: 0.5 }}>
                <div style={{ ...MONO, fontSize: 11, color: 'rgba(26,26,26,0.6)' }}>AI 분석 중...</div>
              </div>
            ) : (
              <>
                {editingTitle ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      value={titleDraft}
                      onChange={e => setTitleDraft(e.target.value.slice(0, TITLE_MAX))}
                      onKeyDown={e => { if (e.key === 'Enter') commitTitle(); }}
                      autoFocus
                      maxLength={TITLE_MAX}
                      aria-label="영상 제목"
                      style={{ flex: 1, minWidth: 0, height: 36, borderRadius: 10, border: '1px solid rgba(26,26,26,0.18)', padding: '0 10px', fontSize: 16, fontWeight: 600, fontFamily: 'Inter, sans-serif', color: '#1A1A1A' }}
                    />
                    <button type="button" onClick={commitTitle} style={{ height: 36, padding: '0 12px', borderRadius: 10, border: 'none', background: '#1A1A1A', color: '#fff', fontSize: 13, cursor: 'pointer' }}>확인</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <div style={{ flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: '-0.3px', lineHeight: 1.35 }}>{title}</div>
                    <button type="button" onClick={startEditingTitle} style={{ flexShrink: 0, fontSize: 12, color: '#7C5CC4', textDecoration: 'underline', cursor: 'pointer', border: 0, background: 'transparent' }}>제목 수정</button>
                  </div>
                )}
                <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.6)', marginTop: 7, lineHeight: 1.5 }}>"{closing}"</div>
              </>
            )}
          </div>

          {director && (
            <>
              <div style={{ height: 1, background: 'rgba(26,26,26,0.08)' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.4)' }}>AI 촬영감독 · 분석</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 22 }}>{director.emojis}</span>
                  <span style={{ fontSize: 13, color: 'rgba(26,26,26,0.7)', lineHeight: 1.4 }}>{director.mood}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ ...MONO, fontSize: 10, color: 'rgba(26,26,26,0.4)', whiteSpace: 'nowrap' }}>BGM</div>
                  <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.6)', background: 'rgba(26,26,26,0.05)', borderRadius: 8, padding: '4px 10px' }}>{BGM_TRACKS[director.bgmTrack]} · {director.bgMusic}</div>
                </div>
              </div>
            </>
          )}

          {analyzeError && (
            <div style={{ fontSize: 11, color: '#E5533C', opacity: 0.8 }}>{analyzeError}</div>
          )}

          <div style={{ height: 1, background: 'rgba(26,26,26,0.08)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button
              type="button"
              onClick={() => setTuningOpen(open => !open)}
              aria-expanded={tuningOpen}
              aria-controls="wrapup-tuning"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: '#1A1A1A' }}>AI가 정한 거 바꾸기</span>
              {/* 접힌 채로도 지금 값이 보이게 — 펼쳐야만 알 수 있으면 접은 의미가 없다 */}
              <span style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', whiteSpace: 'nowrap' }}>
                {activeEmoji} · {selectedMood.mood} {calmness}
              </span>
              <span aria-hidden="true" style={{
                fontSize: 11, color: 'rgba(26,26,26,0.4)',
                transform: tuningOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
              }}>▾</span>
            </button>

            <div
              id="wrapup-tuning"
              hidden={!tuningOpen}
              style={{ display: tuningOpen ? 'flex' : 'none', flexDirection: 'column', gap: 9 }}
            >
            <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.5)', lineHeight: 1.5 }}>
              그냥 두면 AI가 정한 대로 만들어져요. 바꾸고 싶을 때만 고르세요.
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {emojiChoices.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => setEmojiPick(emoji)}
                  aria-pressed={emoji === activeEmoji}
                  aria-label={`무드 이모지 ${emoji}`}
                  style={{
                    flex: 1, height: 38, borderRadius: 11,
                    background: emoji === activeEmoji ? '#F0F0EE' : '#FFFFFF',
                    border: emoji === activeEmoji ? '1.5px solid #1A1A1A' : '1px solid rgba(26,26,26,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, cursor: 'pointer',
                    opacity: emoji === activeEmoji ? 1 : 0.45,
                  }}
                >{emoji}</button>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(26,26,26,0.55)' }}>
                <span>{selectedMood.mood}</span><span style={MONO}>{calmness}</span>
              </div>
              <input type="range" min={0} max={100} value={calmness} onChange={e => setCalmnessPick(Number(e.target.value))} aria-label={`${selectedMood.mood} 정도`} style={{ width: '100%', marginTop: 8, accentColor: '#1A1A1A' }} />
            </div>
            </div>
          </div>
        </div>

        {generating ? (
          <div style={{ minHeight: 100, borderRadius: 20, background: '#1E2240', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '24px 28px' }}>
            <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.2px', color: 'rgba(255,255,255,0.6)' }}>
              영상 생성 중 · {Math.round(progress * 100)}%
            </div>
            <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: '#7C5CC4', width: `${progress * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
            <button
              type="button"
              onClick={() => generationAbortRef.current?.abort()}
              style={{ border: '1px solid rgba(255,255,255,0.45)', borderRadius: 50, background: 'transparent', color: '#fff', padding: '7px 16px', cursor: 'pointer' }}
            >
              생성 취소
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={records.length === 0}
              aria-label="오늘 기록으로 영상 생성하기"
              style={{ width: '100%', minHeight: 100, position: 'relative', borderRadius: 20, overflow: 'hidden', background: '#1E2240', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: records.length === 0 ? 'default' : 'pointer', opacity: records.length === 0 ? 0.5 : 1, border: 0 }}
            >
              <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(255,255,255,0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderLeft: '13px solid #1E2240', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 3 }} />
              </div>
              <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.2px', color: 'rgba(255,255,255,0.6)' }}>탭하여 영상 생성</div>
            </button>
            {genError && (
              <div style={{ fontSize: 12, color: '#E5533C', lineHeight: 1.5, padding: '8px 4px', whiteSpace: 'pre-line' }}>{genError}</div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 22px 30px', display: 'flex', gap: 9 }}>
        <button
          onClick={handleGenerate}
          disabled={generating || records.length === 0}
          style={{
            flex: 1.5, height: 52, borderRadius: 50,
            background: generating ? 'rgba(26,26,26,0.3)' : '#1A1A1A',
            color: '#FFFFFF', fontSize: 16, fontWeight: 500, border: 'none',
            cursor: generating || records.length === 0 ? 'default' : 'pointer',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          {generating ? '생성 중...' : '영상 만들기'}
        </button>
        <button
          onClick={handleSkipVideo}
          disabled={generating}
          style={{
            flex: 1, height: 52, borderRadius: 50,
            background: '#FFFFFF', border: '1px solid rgba(26,26,26,0.18)',
            fontSize: 14, fontWeight: 500,
            cursor: generating ? 'default' : 'pointer',
            color: 'rgba(26,26,26,0.5)',
            fontFamily: 'Inter, sans-serif',
          }}
        >
          영상 없이 마감
        </button>
      </div>
    </div>
  );
}
