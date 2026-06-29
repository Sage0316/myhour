import { useState } from 'react';
import { useApp } from '../context';
import { type AppSettings, TYPE_LABELS, intervalLabel, notifyLabel, captureModeLabel } from '../store';
import TabBar from '../components/TabBar';

type Tab = 'home' | 'today' | 'archive' | 'settings';

interface SettingsScreenProps {
  onTabChange: (tab: Tab) => void;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace" };

const START_TIMES = ['06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00'];
const END_TIMES   = ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00'];

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
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', minHeight: 50, padding: '0 16px', cursor: 'pointer', borderBottom: last && !open ? 'none' : '1px solid rgba(26,26,26,0.07)' }}
      >
        <div style={{ flex: 1, fontSize: 15 }}>{label}</div>
        <div style={{ fontSize: 13, color: 'rgba(26,26,26,0.5)', marginRight: 10 }}>{value}</div>
        <Chevron open={open} />
      </div>
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
          <SettingRow label="출력 비율" value={settings.outputRatio + ' 세로'} open={openRow === 'ratio'} onToggle={() => toggle('ratio')}>
            <Option label="9:16 세로" selected={settings.outputRatio === '9:16'} onSelect={() => set('outputRatio', '9:16')} />
            <Option label="1:1 정방형" selected={settings.outputRatio === '1:1'} onSelect={() => set('outputRatio', '1:1')} />
          </SettingRow>
          <SettingRow label="저장 방식" value="결과물 먼저 보기" last open={openRow === 'save'} onToggle={() => toggle('save')}>
            <Option label="결과물 먼저 보기" selected={true} onSelect={() => setOpenRow(null)} />
            <Option label="자동 저장" selected={false} onSelect={() => setOpenRow(null)} />
          </SettingRow>
        </SettingGroup>

        <div style={{ height: 20 }} />
      </div>

      <TabBar active="settings" onTabChange={onTabChange} />
    </div>
  );
}
