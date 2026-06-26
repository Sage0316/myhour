import React from 'react';

interface IOSFrameProps {
  children: React.ReactNode;
  dark?: boolean;
}

function StatusBar({ dark = false }: { dark?: boolean }) {
  const c = dark ? '#fff' : '#000';
  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 24px 0',
    }}>
      <span style={{
        fontFamily: '-apple-system, "SF Pro", system-ui',
        fontWeight: 590, fontSize: 15, color: c,
      }}>9:41</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <svg width="17" height="12" viewBox="0 0 17 12">
          <rect x="0" y="6" width="3" height="6" rx="0.6" fill={c} />
          <rect x="4.5" y="4" width="3" height="8" rx="0.6" fill={c} />
          <rect x="9" y="2" width="3" height="10" rx="0.6" fill={c} />
          <rect x="13.5" y="0" width="3" height="12" rx="0.6" fill={c} />
        </svg>
        <svg width="16" height="12" viewBox="0 0 16 12">
          <path d="M8 3.2C10.2 3.2 12.2 4.1 13.6 5.5L14.7 4.4C12.9 2.6 10.6 1.5 8 1.5C5.4 1.5 3.1 2.6 1.3 4.4L2.4 5.5C3.8 4.1 5.8 3.2 8 3.2Z" fill={c} />
          <path d="M8 6.8C9.4 6.8 10.5 7.3 11.4 8.1L12.5 7C11.3 5.9 9.7 5.2 8 5.2C6.3 5.2 4.7 5.9 3.5 7L4.6 8.1C5.5 7.3 6.6 6.8 8 6.8Z" fill={c} />
          <circle cx="8" cy="10.5" r="1.5" fill={c} />
        </svg>
        <svg width="26" height="13" viewBox="0 0 26 13">
          <rect x="0.5" y="0.5" width="22" height="12" rx="3.5" stroke={c} strokeOpacity="0.35" fill="none" />
          <rect x="2" y="2" width="19" height="9" rx="2" fill={c} />
          <path d="M24 4.5V8.5C24.8 8.2 25.5 7.4 25.5 6.5C25.5 5.6 24.8 4.8 24 4.5Z" fill={c} fillOpacity="0.4" />
        </svg>
      </div>
    </div>
  );
}

export default function IOSFrame({ children, dark = false }: IOSFrameProps) {
  return (
    <div style={{
      width: 393,
      height: 852,
      borderRadius: 48,
      overflow: 'hidden',
      position: 'relative',
      background: dark ? '#000' : '#FFFFFF',
      boxShadow: '0 40px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.14)',
      flexShrink: 0,
    }}>
      {/* Dynamic island */}
      <div style={{
        position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
        width: 120, height: 34, borderRadius: 20, background: '#000', zIndex: 60,
      }} />
      <StatusBar dark={dark} />
      {/* Content */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
        {children}
      </div>
      {/* Home indicator */}
      <div style={{
        position: 'absolute', bottom: 8, left: 0, right: 0, zIndex: 60,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <div style={{
          width: 134, height: 5, borderRadius: 100,
          background: dark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.22)',
        }} />
      </div>
    </div>
  );
}
