import { useEffect, useState } from 'react';
import { useApp } from '../appContext';
import { type AppSettings, TYPE_LABELS, intervalLabel, notifyLabel, captureModeLabel } from '../store';
import { hasAIConsent, isAIConfigured, setAIConsent } from '../llmDirector';
import { PUSH_SERVER_URL, isPushSupported, getPushEnabled, enablePush, disablePush, syncPushSchedule } from '../push';
import TabBar from '../components/TabBar';
import { exportCompleteBackup, restoreCompleteBackup, type BackupProgress } from '../backup/backupService';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface SettingsScreenProps {
  onTabChange: (tab: Tab) => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

// 하꾸 브랜드 하늘색 — 아이콘 마크의 포인트 컬러와 같은 값 ("하꾸=하늘")
const BRAND_BLUE = '#3FA0E0';

const START_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'];
const END_TIMES   = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

// 좌우로 미끄러지는 on/off 스위치. 켜지면 브랜드 하늘색(#3FA0E0), 꺼지면 회색.
// 실제 <input type="checkbox">를 숨겨서 얹는 대신 button + role="switch"를 쓴다 —
// 스크린리더가 상태를 읽고, 키보드 스페이스/엔터가 그대로 동작한다.
function ToggleSwitch({ checked, onChange, disabled, label }: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  const W = 50, H = 30, PAD = 3;
  const knob = H - PAD * 2;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: W, height: H, flexShrink: 0, padding: 0,
        borderRadius: H / 2, border: 'none',
        background: checked ? BRAND_BLUE : 'rgba(26,26,26,0.18)',
        transition: 'background 0.2s ease',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        position: 'relative',
        // 스위치를 길게 눌러도 텍스트 선택으로 넘어가지 않게
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          position: 'absolute', top: PAD, left: PAD,
          width: knob, height: knob, borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 3px rgba(0,0,0,0.28)',
          transform: checked ? `translateX(${W - knob - PAD * 2}px)` : 'translateX(0)',
          transition: 'transform 0.2s ease',
        }}
      />
    </button>
  );
}

// 기록 시간 푸시 알림 — 서버(push-server/) 배포 전에는 준비 중 상태로 표시
function PushSection() {
  const { settings } = useApp();
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { getPushEnabled().then(setEnabled); }, []);
  useEffect(() => {
    if (enabled) syncPushSchedule(settings).catch(() => undefined);
  }, [enabled, settings]);

  const ready = PUSH_SERVER_URL !== '' && isPushSupported();

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      if (enabled) {
        await disablePush();
        setEnabled(false);
      } else {
        await enablePush(settings);
        setEnabled(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '알림 설정에 실패했어요');
    }
    setBusy(false);
  }

  return (
    <div>
      <SectionHeader label="알림" />
      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15 }}>기록 시간 알림</div>
            <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', marginTop: 2 }}>
              {ready
                ? `${settings.startTime}부터 ${intervalLabel(settings.interval)} 간격으로 알려드려요`
                : PUSH_SERVER_URL === ''
                  ? '알림 서버 배포 후 사용할 수 있어요 (준비 완료)'
                  : 'iOS 16.4 이상 + 홈 화면 설치가 필요해요'}
            </div>
          </div>
          <ToggleSwitch
            label="기록 시간 알림"
            checked={enabled}
            onChange={toggle}
            disabled={!ready || busy}
          />
        </div>
        {error && <div style={{ fontSize: 11, color: '#E5533C', whiteSpace: 'pre-line' }}>{error}</div>}
        {enabled && (
          <div style={{ fontSize: 11, color: 'rgba(26,26,26,0.4)' }}>
            시간과 간격을 바꾸면 알림 일정도 자동으로 갱신돼요
          </div>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ ...MONO, fontSize: 10, letterSpacing: '1.4px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.45)', padding: '0 4px 8px' }}>
      {label}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <div style={{
      width: 7, height: 7,
      borderRight: '1.5px solid rgba(26,26,26,0.35)',
      borderBottom: '1.5px solid rgba(26,26,26,0.35)',
      transform: open ? 'rotate(-135deg)' : 'rotate(45deg)',
      transition: 'transform 0.18s',
      marginTop: open ? 3 : 0,
      flexShrink: 0,
    }} />
  );
}

interface RowProps {
  label: string;
  value: string;
  last?: boolean;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function SettingRow({ label, value, last, open, onToggle, children }: RowProps) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 50, padding: '0 16px', cursor: 'pointer', background: 'none', border: 'none', borderBottom: last && !open ? 'none' : '1px solid rgba(26,26,26,0.07)', fontFamily: 'Inter, sans-serif' }}
      >
        <div style={{ flex: 1, fontSize: 15, textAlign: 'left' }}>{label}</div>
        <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)', marginRight: 10 }}>{value}</div>
        <Chevron open={open} />
      </button>
      {open && (
        <div style={{ padding: '6px 16px 14px', borderBottom: last ? 'none' : '1px solid rgba(26,26,26,0.07)', background: 'rgba(26,26,26,0.02)' }}>
          {children}
        </div>
      )}
    </div>
  );
}

function Option({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      style={{ display: 'flex', alignItems: 'center', width: '100%', padding: '10px 0', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif', borderBottom: '1px solid rgba(26,26,26,0.05)' }}
    >
      <div style={{ flex: 1, fontSize: 15, textAlign: 'left', color: selected ? '#1A1A1A' : 'rgba(26,26,26,0.6)', fontWeight: selected ? 500 : 400 }}>{label}</div>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected ? '#1A1A1A' : 'rgba(26,26,26,0.2)'}`, background: selected ? '#1A1A1A' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {selected && <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff' }} />}
      </div>
    </button>
  );
}

function SettingGroup({ header, children }: { header: string; children: React.ReactNode }) {
  return (
    <div>
      <SectionHeader label={header} />
      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 18, overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  );
}

function AISection() {
  const [consented, setConsented] = useState(hasAIConsent);
  const configured = isAIConfigured();

  function toggleConsent() {
    const next = !consented;
    setAIConsent(next);
    setConsented(next);
  }

  return (
    <div>
      <SectionHeader label="AI · 촬영감독" />
      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 18, overflow: 'hidden', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 15 }}>AI 분석 사용</div>
            <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', marginTop: 2 }}>
              {configured ? (consented ? '제목·무드·BGM을 AI가 추천해요' : '켜면 하루 마감에서 AI가 연출해요') : '서버 연결 전이에요'}
            </div>
          </div>
          <ToggleSwitch
            label="AI 분석 사용"
            checked={consented}
            onChange={toggleConsent}
            disabled={!configured}
          />
        </div>
        <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.5)', lineHeight: 1.6 }}>
          켜면 텍스트 기록과 캡션만 하꾸 AI 서버로 보내 제목·무드·BGM을 추천해요. 사진·영상·음성 원본은 전송하지 않아요.
        </div>
      </div>
    </div>
  );
}

function DataSection() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function progressText(progress: BackupProgress): string {
    const label = progress.phase === 'collecting' ? '데이터 수집'
      : progress.phase === 'hashing' ? '무결성 계산'
      : progress.phase === 'compressing' ? '백업 생성'
      : progress.phase === 'validating' ? '백업 검증'
      : progress.phase === 'restoring' ? '복원'
      : '완료';
    return `${label} · ${progress.completed}/${progress.total}`;
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleExport() {
    setBusy(true);
    setError(null);
    setStatus('백업 준비 중');
    try {
      const result = await exportCompleteBackup(progress => setStatus(progressText(progress)));
      const file = new File([result.blob], result.filename, { type: 'application/zip' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: '하꾸 전체 백업' });
      } else {
        triggerDownload(result.blob, result.filename);
      }
      setStatus(`완료 · 미디어 ${result.mediaCount}개 포함`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : '백업을 만들지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (!confirm('현재 데이터를 검증된 백업 내용으로 교체할까요? 검증이나 복원에 실패하면 기존 데이터는 유지됩니다.')) return;
    setBusy(true);
    setError(null);
    setStatus('백업 검증 중');
    try {
      const result = await restoreCompleteBackup(file, progress => setStatus(progressText(progress)));
      setStatus(`복원 완료 · 미디어 ${result.mediaCount}개`);
      setTimeout(() => window.location.reload(), 800);
    } catch (restoreError) {
      setError(restoreError instanceof Error ? restoreError.message : '백업을 복원하지 못했어요.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SectionHeader label="Data · 데이터" />
      <div style={{ background: '#fff', border: '1px solid rgba(26,26,26,0.07)', borderRadius: 18, overflow: 'hidden' }}>
        <button
          onClick={handleExport}
          disabled={busy}
          style={{ display: 'flex', alignItems: 'center', width: '100%', minHeight: 50, padding: '0 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(26,26,26,0.07)', cursor: 'pointer', fontFamily: 'Inter, sans-serif', textAlign: 'left' }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15 }}>데이터 내보내기</div>
            <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', marginTop: 2 }}>설정·기록·아카이브·모든 미디어를 해시와 함께 저장</div>
          </div>
          <div style={{ fontSize: 18, color: 'rgba(26,26,26,0.35)' }}>↑</div>
        </button>

        <label style={{ display: 'flex', alignItems: 'center', minHeight: 50, padding: '0 16px', cursor: 'pointer', borderBottom: 'none' }}>
          <input type="file" accept=".zip,.hakku.zip,application/zip" onChange={handleImport} disabled={busy} style={{ display: 'none' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15 }}>데이터 가져오기</div>
            <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.45)', marginTop: 2 }}>경로·크기·해시 검증 후 원자적으로 복원</div>
          </div>
          <div style={{ fontSize: 18, color: 'rgba(26,26,26,0.35)' }}>↓</div>
        </label>
      </div>

      {error && (
        <div role="alert" style={{ fontSize: 12, color: '#E5533C', padding: '8px 4px', lineHeight: 1.5 }}>{error}</div>
      )}
      {status && (
        <div role="status" aria-live="polite" style={{ fontSize: 12, color: '#3FA37B', padding: '8px 4px' }}>{status}</div>
      )}
    </div>
  );
}

export default function SettingsScreen({ onTabChange }: SettingsScreenProps) {
  const { settings, updateSettings } = useApp();
  const [openRow, setOpenRow] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenRow(prev => prev === id ? null : id);
  }

  function set<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    updateSettings({ [key]: value });
    setOpenRow(null);
  }

  const endModeLabel = settings.endMode === 'open' ? '종료 시간 미정' : settings.endTime;
  const defaultTypeLabel = TYPE_LABELS[settings.defaultType];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#F7F7F5' }}>
      <div style={{ padding: '60px 22px 8px', background: '#F7F7F5' }}>
        <div style={{ ...MONO, fontSize: 11, letterSpacing: '1.8px', textTransform: 'uppercase', color: 'rgba(26,26,26,0.5)' }}>Settings</div>
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.7px', marginTop: 7 }}>설정</div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '12px 22px 0', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Schedule */}
        <SettingGroup header="Schedule · 기록 시간">
          <SettingRow label="시작 시간" value={settings.startTime} open={openRow === 'startTime'} onToggle={() => toggle('startTime')}>
            {START_TIMES.map(t => (
              <Option key={t} label={t} selected={settings.startTime === t} onSelect={() => set('startTime', t)} />
            ))}
          </SettingRow>

          <SettingRow label="종료 방식" value={endModeLabel} open={openRow === 'endMode'} onToggle={() => toggle('endMode')}>
            <Option label="종료 시간 미정" selected={settings.endMode === 'open'} onSelect={() => set('endMode', 'open')} />
            <Option label="종료 시간 지정" selected={settings.endMode === 'fixed'} onSelect={() => updateSettings({ endMode: 'fixed' })} />
            {settings.endMode === 'fixed' && (
              <div style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(26,26,26,0.5)', marginBottom: 6 }}>종료 시간 선택</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {END_TIMES.map(t => (
                    <button key={t} onClick={() => set('endTime', t)} style={{
                      padding: '7px 14px', borderRadius: 50, fontSize: 13,
                      background: settings.endTime === t ? '#1A1A1A' : '#fff',
                      color: settings.endTime === t ? '#fff' : '#1A1A1A',
                      border: settings.endTime === t ? 'none' : '1px solid rgba(26,26,26,0.15)',
                      cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    }}>{t}</button>
                  ))}
                </div>
              </div>
            )}
          </SettingRow>

          <SettingRow label="기록 간격" value={intervalLabel(settings.interval)} last open={openRow === 'interval'} onToggle={() => toggle('interval')}>
            {([30, 60, 120] as const).map(v => (
              <Option key={v} label={intervalLabel(v)} selected={settings.interval === v} onSelect={() => set('interval', v)} />
            ))}
          </SettingRow>
        </SettingGroup>

        {/* Capture */}
        <SettingGroup header="Capture · 알림 · 기록 방식">
          <SettingRow label="알림 시점" value={notifyLabel(settings.notifyTiming)} open={openRow === 'notify'} onToggle={() => toggle('notify')}>
            <Option label="1분 전" selected={settings.notifyTiming === 'before'} onSelect={() => set('notifyTiming', 'before')} />
            <Option label="기록 시각" selected={settings.notifyTiming === 'exact'} onSelect={() => set('notifyTiming', 'exact')} />
            <Option label="둘 다" selected={settings.notifyTiming === 'both'} onSelect={() => set('notifyTiming', 'both')} />
          </SettingRow>

          <SettingRow
            label="기록 방식"
            value={captureModeLabel(settings.captureMode)}
            last={settings.captureMode === 'choose'}
            open={openRow === 'captureMode'}
            onToggle={() => toggle('captureMode')}
          >
            <Option label="매번 선택" selected={settings.captureMode === 'choose'} onSelect={() => set('captureMode', 'choose')} />
            <Option label="하나로 고정" selected={settings.captureMode === 'fixed'} onSelect={() => updateSettings({ captureMode: 'fixed' })} />
          </SettingRow>

          {settings.captureMode === 'fixed' && (
            <SettingRow label="기본 기록 방식" value={defaultTypeLabel} last open={openRow === 'defaultType'} onToggle={() => toggle('defaultType')}>
              {(['photo', 'video', 'audio', 'text'] as const).map(t => (
                <Option key={t} label={TYPE_LABELS[t]} selected={settings.defaultType === t} onSelect={() => set('defaultType', t)} />
              ))}
            </SettingRow>
          )}
        </SettingGroup>

        {/* Output */}
        <SettingGroup header="Output · 결과물">
          <div style={{ minHeight: 50, padding: '10px 16px', display: 'flex', alignItems: 'center', borderBottom: '1px solid rgba(26,26,26,0.07)' }}>
            <div style={{ flex: 1, fontSize: 15 }}>영상 크기</div>
            <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)' }}>720×1280 · 9:16</div>
          </div>
          <div style={{ minHeight: 50, padding: '10px 16px', display: 'flex', alignItems: 'center' }}>
            <div style={{ flex: 1, fontSize: 15 }}>저장 방식</div>
            <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)' }}>아카이브 저장 후 열기</div>
          </div>
        </SettingGroup>

        <PushSection />

        <DataSection />

        <AISection />

        <div style={{ textAlign: 'center', fontSize: 11, color: 'rgba(26,26,26,0.3)', fontFamily: "'JetBrains Mono', monospace", padding: '8px 0' }}>
          하꾸 · HAKKU {__BUILD_VERSION__}
        </div>

        <div style={{ height: 20 }} />
      </div>

      <TabBar active="settings" onTabChange={onTabChange} />
    </div>
  );
}
