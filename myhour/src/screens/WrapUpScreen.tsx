import { useState, useEffect, useRef } from 'react';
import { useApp } from '../appContext';
import { TYPE_COLORS, MOOD_LIST, guessMood, generateTitle, generateClosing, getDateStrings, getSessionDate } from '../store';
import type { MoodItem } from '../store';
import { ensureDiaryFont, fallbackEmojisFor, splitEmojis } from '../scenes';
import {
  analyzeDay, hasAIConsent, isAIConfigured, BGM_TRACKS, bgmAssetUrl, pickBgmFile,
  trackForMood, intensityForTrack, toIntensityLevel, directorKeyFor,
} from '../llmDirector';
import { readDirectorCache } from '../directorCache';
import { hasVideoForDate } from '../videoEntitlement';
import type { DirectorOutput } from '../llmDirector';
import { videoGenerationService } from '../services/video-generation-service';
import { archiveVideoKey, markArchiveGenerated, saveVideoToIDB } from '../store';
import type { ArchiveEntry } from '../store';
import { consumeVideoForDate } from '../videoEntitlement';
import { wrapUpService } from '../services/wrap-up-service';
import { useDialogFocus } from '../accessibility/useDialogFocus';
import {
  BUTTON_DISABLED, BUTTON_PRIMARY, BUTTON_SECONDARY, CARD, COLOR, FONT_BODY, PILL_BUTTON, SCREEN, TAPE_GREEN, highlight,
} from '../design';

/** 별이 박힌 밤하늘 — 영상 생성 버튼 배경 */
const NIGHT: React.CSSProperties = {
  backgroundColor: COLOR.navy,
  backgroundImage: 'radial-gradient(circle at 20% 30%, #FFF6C9 1.4px, transparent 1.8px), radial-gradient(circle at 75% 70%, #FFFFFF 1px, transparent 1.4px), radial-gradient(circle at 50% 50%, #FFE27A 1.6px, transparent 2px)',
  backgroundSize: '40px 40px',
};

interface WrapUpScreenProps {
  onClose: () => void;
  onSave: (archiveId: string) => void;
  /**
   * 지난 날짜의 아카이브 항목으로 영상을 만드는 모드.
   * 없으면 "오늘 하루 마감" 모드로, 오늘 기록을 새 아카이브 항목으로 만든다.
   */
  entry?: ArchiveEntry;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

export default function WrapUpScreen({ onClose, onSave, entry }: WrapUpScreenProps) {
  const dialogRef = useDialogFocus<HTMLDivElement>(true, onClose);
  const { records: todayRecords, settings } = useApp();
  // 아카이브 모드면 그 항목의 기록과 날짜를 쓴다. 아니면 오늘 것.
  const records = entry ? entry.records : todayRecords;
  const sessionDate = entry ? entry.date : getSessionDate(settings.startTime);
  const { dateShort, dateDay, dateWeekday } = getDateStrings(sessionDate);

  const autoMood = guessMood(records);
  const [selectedMood, setSelectedMood] = useState<MoodItem>(autoMood);
  const [showMoodPicker, setShowMoodPicker] = useState(false);
  // 사용자가 직접 무드를 고른 뒤에는 AI 분석 결과로 덮어쓰지 않는다
  const userPickedMoodRef = useRef(false);
  // 첫 AI 결과를 이미 화면에 붙였는가. 두 번째부터는 무드를 덮어쓰지 않는다.
  const firstDirectorAppliedRef = useRef(false);
  // 이모지·정도는 "사용자가 고쳤을 때만" AI 결과를 이긴다. null이면 아직 안 건드린 상태.
  // 예전엔 고정 초깃값(😌, 72)이 들어가 있고 생성할 땐 AI 값이 무조건 이겨서,
  // 무슨 칩을 눌러도 영상이 그대로였다 — 그래서 "에러 나서 기본값에 걸린" 것처럼 보였다.
  const [emojiPick, setEmojiPick] = useState<string | null>(null);
  const [intensityPick, setIntensityPick] = useState<number | null>(null);
  // 기본은 접어둔다 — 늘 펼쳐져 있으면서 "더 정확하게 · 선택"이라고만 적혀 있으니
  // 뭘 하는 칸인지, 눌러도 되는 건지 알 수 없었다
  const [tuningOpen, setTuningOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [genError, setGenError] = useState<string | null>(null);
  const generationAbortRef = useRef<AbortController | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [director, setDirector] = useState<DirectorOutput | null>(null);
  // 지금 화면에 적용된 director가 "어떤 키"에서 나왔는지. 강도를 바꾸면 이 값이
  // 현재 키와 어긋나고, 그때 확정 버튼이 다시 활성화된다.
  const [directorKey, setDirectorKey] = useState<string | null>(null);
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
  // 오늘 마감할 때는 날짜당 한 번이라는 이용권 규칙을 그대로 쓴다.
  // 아카이브 항목을 열었을 때는 "그 항목에 영상이 있는가"로 본다 — 같은 날짜에 항목이 두 개
  // 남아 있던 사용자는 날짜 기준으로 막으면 두 번째 항목의 영상을 영영 만들 수 없다.
  const alreadyGenerated = entry ? entry.isWrapped : hasVideoForDate(sessionDate);
  // 감정 강도. 안 건드리면 AI가 고른 곡이 그 무드에서 몇 단계인지 되짚어 보여준다.
  const intensity = intensityPick
    ?? (director ? intensityForTrack(selectedMood.mood, director.bgmTrack) : 60);
  // 캐시 키·AI 재호출은 슬라이더 원값이 아니라 "단계"로 판단한다.
  // 원값으로 하면 드래그 한 번에 키가 수십 번 바뀌어 API가 그만큼 호출된다.
  const intensityLevel = toIntensityLevel(intensity);
  // 첫 호출은 무드를 비워 보내 AI가 기록만 보고 정하게 한다.
  // 그 뒤 강도를 바꿔 다시 부를 때는 화면에 보이는 무드를 고정해서 보낸다 —
  // 그러지 않으면 강도만 올렸는데 '잔잔함'이 '분노'로 바뀐다.
  const moodLock = firstDirectorAppliedRef.current || userPickedMoodRef.current
    ? selectedMood.mood
    : undefined;

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

  // AI는 **사용자가 확정 버튼을 누를 때만** 부른다.
  // 화면을 열었다는 이유로 부르면, "영상 없이 마감"만 눌러도 비용이 나간다.
  const aiAvailable = hasAIConsent() && isAIConfigured() && records.length > 0 && !alreadyGenerated;
  const aiKey = aiAvailable ? directorKeyFor(records, sessionDate, intensityLevel, moodLock) : null;
  // 이 강도의 결과가 이미 화면에 적용돼 있는가
  const directorIsCurrent = aiKey !== null && directorKey === aiKey;

  function applyDirector(out: DirectorOutput, key: string) {
    setDirector(out);
    setDirectorKey(key);
    // AI가 고른 무드로 칩을 자동 선택하는 건 **첫 결과일 때뿐**이다.
    // 강도만 바꿔 다시 부른 결과로 무드를 덮어쓰면, 사용자가 보고 있던 '잔잔함'이
    // 말없이 '분노'로 바뀐다. 강도는 감정의 세기지 감정의 종류가 아니다.
    const chip = MOOD_LIST.find(m => m.mood === out.moodChip);
    if (chip && !userPickedMoodRef.current && !firstDirectorAppliedRef.current) setSelectedMood(chip);
    firstDirectorAppliedRef.current = true;
  }

  // 처음 열었을 때 자동 호출을 이미 시도했는가.
  // 그 뒤 강도를 바꾸면 자동으로 부르지 않고 확정 버튼을 누르게 한다.
  const autoTriedRef = useRef(false);

  // 저장된 결과가 있으면 호출 없이 그대로 붙인다.
  // 강도를 2 → 4 → 2로 되돌린 경우도 여기서 걸려서 버튼을 누를 필요가 없다.
  useEffect(() => {
    if (!aiKey || directorKey === aiKey) return;
    const cached = readDirectorCache(sessionDate, aiKey);
    if (cached) {
      applyDirector(cached, aiKey);
      autoTriedRef.current = true;
      return;
    }
    // 화면을 처음 열었고 저장된 결과도 없을 때만 자동으로 부른다.
    // 한 번 받아두면 다시 열어도 캐시에서 나오므로 호출은 하루 한 번으로 끝난다.
    // 강도를 바꾼 뒤에는 여기서 부르지 않는다 — 그건 확정 버튼의 몫이다.
    if (!autoTriedRef.current) {
      autoTriedRef.current = true;
      void confirmDirector();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiKey, sessionDate, directorKey]);

  const analyzeAbortRef = useRef<AbortController | null>(null);
  useEffect(() => () => analyzeAbortRef.current?.abort(), []);

  async function confirmDirector() {
    if (!aiKey || analyzing || directorIsCurrent) return;
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    setAnalyzing(true);
    setAnalyzeError(null);
    try {
      // analyzeDay가 캐시 확인과 동시요청 합치기를 모두 처리한다
      const out = await analyzeDay(records, `${dateDay} ${dateWeekday}`, sessionDate, intensityLevel, moodLock, controller.signal);
      applyDirector(out, aiKey);
    } catch (e) {
      if (!controller.signal.aborted) {
        setAnalyzeError(e instanceof Error ? e.message : 'AI 분석 실패');
      }
    } finally {
      if (!controller.signal.aborted) setAnalyzing(false);
    }
  }

  useEffect(() => () => generationAbortRef.current?.abort(), []);

  const clipColors = records.length > 0
    ? records.slice(0, 5).map(r => TYPE_COLORS[r.type])
    : ['#F0D9C8', '#D9EAD9', '#E4DBF5', '#F4ECD9', '#F0D9C8'];

  async function handleGenerate() {
    if (records.length === 0 || generating) return;
    if (alreadyGenerated) {
      setGenError('이 날짜는 이미 영상을 만들었어요. 아카이브에서 확인할 수 있어요.');
      return;
    }
    setGenerating(true);
    setProgress(0);
    setGenError(null);
    const abortController = new AbortController();
    generationAbortRef.current = abortController;
    try {
      // 슬라이더를 직접 움직였으면 그 강도로 무드에 맞는 곡을 고른다.
      // AI가 고른 곡을 calm/bright 둘로 접어버리던 예전 방식은 분위기를 뭉갰다.
      const bgmTrack = intensityPick !== null
        ? trackForMood(selectedMood.mood, intensityPick)
        : director?.bgmTrack ?? trackForMood(selectedMood.mood, intensity);
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
      if (entry) {
        // 아카이브 모드: 새 항목을 만들지 않고 기존 항목에 영상을 붙인다
        await saveVideoToIDB(archiveVideoKey(entry), blob);
        markArchiveGenerated(entry);
        consumeVideoForDate(entry.date);
        onSave(entry.id);
      } else {
        const result = await wrapUpService.complete(sessionDate, records, blob, title);
        onSave(result.archiveId);
      }
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
    <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={entry ? '지난 날짜 영상 만들기' : '하루 마감'} style={SCREEN}>
      <div style={{ flex: 1, padding: '52px 22px 0', display: 'flex', flexDirection: 'column', gap: 16, overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ ...TAPE_GREEN(), alignSelf: 'center' }}>{entry ? '영상 만들기' : '하루 마감'} · {dateShort}</span>
          <button onClick={onClose} aria-label={entry ? '영상 만들기 닫기' : '하루 마감 닫기'} style={{ width: 44, height: 44, marginRight: -10, background: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>

        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.6px', lineHeight: 1.2 }}>
          {entry ? '이 날을 영상으로' : '오늘을 영상으로'}<br />
          <span style={{ color: COLOR.red }}>{entry ? '만들어요' : '마무리해요'}</span>
        </h1>

        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: COLOR.inkSub, marginBottom: 9 }}>
            {entry ? '이 날 남긴 기록' : '오늘 남긴 기록'} · {records.length}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {clipColors.map((bg, i) => (
              <div key={i} style={{ background: COLOR.white, padding: '3px 3px 10px', boxShadow: '0 1px 4px rgba(43,38,34,0.2)', transform: `rotate(${[-4, 3, -2, 4, -3][i % 5]}deg)` }}>
                <div style={{ width: 38, height: 46, background: bg }} />
              </div>
            ))}
            <svg aria-hidden="true" width="22" height="16" viewBox="0 0 26 16" style={{ margin: '0 2px' }}><path d="M2 8h20M15 2l7 6-7 6" fill="none" stroke={COLOR.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            <div style={{ ...NIGHT, width: 44, height: 60, borderRadius: 8, border: `1.5px solid ${COLOR.ink}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M7 4.5v15l12.5-7.5z" /></svg>
            </div>
          </div>
        </div>

        <div style={{ ...CARD, position: 'relative', borderRadius: 18, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: -10, right: 34, width: 58, height: 18, background: 'rgba(240,170,170,0.8)', transform: 'rotate(5deg)' }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={highlight('rgba(255,214,90,0.85)')}>{entry ? '이 날의 기록' : '오늘의 기록'}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 50, border: `1px solid ${COLOR.ink}`, background: selectedMood.color, fontSize: 12, fontWeight: 600 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: selectedMood.dot, display: 'inline-block' }} />
                {selectedMood.mood}
              </span>
              <button type="button" onClick={() => setShowMoodPicker(v => !v)} aria-expanded={showMoodPicker} style={PILL_BUTTON}>바꾸기</button>
            </div>
          </div>

          {showMoodPicker && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MOOD_LIST.map(m => (
                <button key={m.mood} onClick={() => { userPickedMoodRef.current = true; setSelectedMood(m); setEmojiPick(null); setShowMoodPicker(false); }} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '6px 12px', borderRadius: 50, background: m.color,
                  fontSize: 12, fontWeight: selectedMood.mood === m.mood ? 600 : 400,
                  border: selectedMood.mood === m.mood ? `2px solid ${COLOR.ink}` : '2px solid transparent',
                  cursor: 'pointer', fontFamily: FONT_BODY, color: COLOR.ink, minHeight: 36,
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
                <div style={{ fontSize: 13, color: COLOR.inkSub }}>AI가 연출 중이에요…</div>
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
                      style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 10, border: `1.5px solid ${COLOR.ink}`, padding: '0 10px', fontSize: 16, fontWeight: 600, fontFamily: FONT_BODY, color: COLOR.ink, background: COLOR.white }}
                    />
                    <button type="button" onClick={commitTitle} style={{ ...PILL_BUTTON, minHeight: 40, background: COLOR.ink, color: COLOR.white }}>확인</button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                    <div style={{ flex: 1, fontSize: 19, fontWeight: 700, letterSpacing: '-0.3px', lineHeight: 1.35 }}>{title}</div>
                    <button type="button" onClick={startEditingTitle} style={{ ...PILL_BUTTON, flexShrink: 0, background: '#FFF6C9' }}>제목 수정</button>
                  </div>
                )}
                <div style={{ fontSize: 14, color: COLOR.inkSub, marginTop: 7, lineHeight: 1.5 }}>“{closing}”</div>
              </>
            )}
          </div>

          {director && (
            <>
              <div style={{ border: `1.5px solid ${COLOR.ink}`, borderRadius: 12, overflow: 'hidden', background: '#FFFDF6' }}>
                <div aria-hidden="true" style={{ height: 12, borderBottom: `1.5px solid ${COLOR.ink}`, backgroundImage: `repeating-linear-gradient(135deg, ${COLOR.ink} 0 10px, #FFFFFF 10px 20px)` }} />
                <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={COLOR.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8z" /><path d="M4 11 3.2 7.6a1 1 0 0 1 .7-1.2L17 3l.9 3.4z" /><path d="M8 5.6l2.4 3.3M12.5 4.4l2.4 3.3" /></svg>
                    <span style={{ fontSize: 15, fontWeight: 700 }}>AI 촬영감독의 연출 노트</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span style={{ fontSize: 22, flexShrink: 0 }}>{director.emojis}</span>
                    <span style={{ fontSize: 14, color: COLOR.inkSub, lineHeight: 1.45 }}>{director.mood}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(132,190,236,0.28)', borderRadius: 10, padding: '8px 10px' }}>
                    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={COLOR.navy} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>
                    <span style={{ fontSize: 13, color: COLOR.skyInk, lineHeight: 1.4 }}><b>BGM</b> {BGM_TRACKS[director.bgmTrack]} · {director.bgMusic}</span>
                  </div>
                </div>
              </div>
            </>
          )}

          {aiAvailable && (
            <button
              type="button"
              onClick={confirmDirector}
              disabled={analyzing || directorIsCurrent}
              style={{
                ...BUTTON_SECONDARY, width: '100%', minHeight: 46, borderRadius: 12, fontSize: 15,
                background: COLOR.yellow,
                ...(analyzing || directorIsCurrent ? BUTTON_DISABLED : {}),
              }}
            >
              {analyzing
                ? 'AI가 연출 중...'
                : directorIsCurrent
                  ? '이 강도로 연출 적용됨'
                  : director
                    ? '바뀐 강도로 다시 연출하기'
                    : 'AI에게 연출 맡기기'}
            </button>
          )}

          {analyzeError && (
            <div style={{ fontSize: 12, color: COLOR.red }}>{analyzeError}</div>
          )}

          <div style={{ height: 0, borderTop: `1.5px dashed ${COLOR.dash}` }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            <button
              type="button"
              onClick={() => setTuningOpen(open => !open)}
              aria-expanded={tuningOpen}
              aria-controls="wrapup-tuning"
              style={{
                display: 'flex', alignItems: 'center', gap: 8, width: '100%', minHeight: 40,
                background: 'transparent', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: FONT_BODY, color: COLOR.ink,
              }}
            >
              <span style={{ flex: 1, fontSize: 14, fontWeight: 700 }}>AI가 정한 거 바꾸기</span>
              {/* 접힌 채로도 지금 값이 보이게 — 펼쳐야만 알 수 있으면 접은 의미가 없다 */}
              <span style={{ fontSize: 12, color: COLOR.inkMuted, whiteSpace: 'nowrap' }}>
                {activeEmoji} · {selectedMood.mood} {intensity}
              </span>
              <span aria-hidden="true" style={{
                fontSize: 11, color: COLOR.inkSub,
                transform: tuningOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s',
              }}>▾</span>
            </button>

            <div
              id="wrapup-tuning"
              hidden={!tuningOpen}
              style={{ display: tuningOpen ? 'flex' : 'none', flexDirection: 'column', gap: 9 }}
            >
            <div style={{ fontSize: 12, color: COLOR.inkMuted, lineHeight: 1.5 }}>
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
                    background: emoji === activeEmoji ? COLOR.yellow : COLOR.white,
                    border: emoji === activeEmoji ? `1.5px solid ${COLOR.ink}` : `1.5px solid ${COLOR.dash}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 18, cursor: 'pointer',
                    opacity: emoji === activeEmoji ? 1 : 0.45,
                  }}
                >{emoji}</button>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLOR.inkSub }}>
                <span>{selectedMood.mood}</span><span style={MONO}>{intensity}</span>
              </div>
              <input type="range" min={0} max={100} value={intensity} onChange={e => setIntensityPick(Number(e.target.value))} aria-label={`${selectedMood.mood} 정도`} style={{ width: '100%', marginTop: 8, accentColor: COLOR.red }} />
            </div>
            </div>
          </div>
        </div>

        {generating ? (
          <div style={{ ...NIGHT, minHeight: 110, borderRadius: 20, border: `1.5px solid ${COLOR.ink}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '24px 28px' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF6C9' }}>
              영상 만드는 중 · {Math.round(progress * 100)}%
            </div>
            <div style={{ width: '100%', height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 3, background: COLOR.yellow, width: `${progress * 100}%`, transition: 'width 0.3s ease' }} />
            </div>
            <button
              type="button"
              onClick={() => generationAbortRef.current?.abort()}
              style={{ ...PILL_BUTTON, minHeight: 40 }}
            >
              생성 취소
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={records.length === 0 || alreadyGenerated}
              aria-label="오늘 기록으로 영상 생성하기"
              style={{ ...NIGHT, width: '100%', minHeight: 110, position: 'relative', borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: records.length === 0 || alreadyGenerated ? 'default' : 'pointer', opacity: records.length === 0 || alreadyGenerated ? 0.5 : 1, border: `1.5px solid ${COLOR.ink}`, fontFamily: FONT_BODY }}
            >
              <svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" style={{ position: 'absolute', left: 18, top: 14, transform: 'rotate(-12deg)' }}><path d="M12 2.5l2.6 6 6.4.6-4.9 4.2 1.5 6.3L12 16.3 6.4 19.6l1.5-6.3L3 9.1l6.4-.6z" fill="#FFD25A" stroke={COLOR.ink} strokeWidth="1.4" strokeLinejoin="round" /></svg>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: COLOR.white, border: `1.5px solid ${COLOR.ink}`, boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill={COLOR.navy}><path d="M7 4.5v15l12.5-7.5z" /></svg>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF6C9' }}>{entry ? '탭하면 이 날이 영상이 돼요' : '탭하면 오늘이 영상이 돼요'}</div>
            </button>
            {genError && (
              <div style={{ fontSize: 13, color: COLOR.red, lineHeight: 1.5, padding: '8px 4px', whiteSpace: 'pre-line' }}>{genError}</div>
            )}
          </div>
        )}
      </div>

      <div style={{ padding: '12px 22px 30px', display: 'flex', gap: 10 }}>
        <button
          onClick={handleGenerate}
          disabled={generating || records.length === 0 || alreadyGenerated}
          style={{
            ...BUTTON_PRIMARY, flex: 1.5,
            ...(generating || records.length === 0 || alreadyGenerated ? BUTTON_DISABLED : {}),
          }}
        >
          {generating ? '생성 중...' : alreadyGenerated ? '이미 만든 하루' : '영상 만들기'}
        </button>
        {/* 아카이브 항목은 이미 저장돼 있으므로 "영상 없이 마감"이 할 일이 없다 */}
        {!entry && (
          <button
            onClick={handleSkipVideo}
            disabled={generating}
            style={{
              ...BUTTON_SECONDARY, flex: 1, fontSize: 15, fontWeight: 500,
              ...(generating ? BUTTON_DISABLED : {}),
            }}
          >
            영상 없이 마감
          </button>
        )}
      </div>
    </div>
  );
}
