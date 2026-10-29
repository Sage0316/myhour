import type React from 'react';
import { COLOR } from '../design';

const STAR_PATH = 'M12 2.5l2.6 6 6.4.6-4.9 4.2 1.5 6.3L12 16.3 6.4 19.6l1.5-6.3L3 9.1l6.4-.6z';

/** 손으로 그린 듯한 별·하트·물결 스티커 (홈·글 기록 화면 장식) */
export default function Doodle({ kind, size, style }: { kind: 'star' | 'pinkStar' | 'heart' | 'wave'; size: number; style: React.CSSProperties }) {
  if (kind === 'wave') {
    return (
      <svg aria-hidden="true" width={size} height={size / 3} viewBox="0 0 60 20" style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
        <path d="M2 10c6-8 10 8 16 0s10 8 16 0 10 8 16 0 6 4 8 2" fill="none" stroke="#5E7D2E" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    );
  }
  const d = kind === 'heart' ? 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' : STAR_PATH;
  const fill = kind === 'star' ? '#FFD25A' : '#F4A6A6';
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" style={{ position: 'absolute', pointerEvents: 'none', ...style }}>
      <path d={d} fill={fill} stroke={COLOR.ink} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
