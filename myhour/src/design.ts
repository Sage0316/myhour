// 다꾸(다이어리 꾸미기) 디자인의 공통 값. 화면들은 인라인 스타일을 쓰므로 여기서 꺼내 쓴다.
// 손글씨(Gaegu)는 날짜·테이프 라벨 같은 포인트에만 쓰고, 본문은 기기 기본 고딕을 쓴다.
import type React from 'react';

export const COLOR = {
  ink: '#2B2622',
  inkSub: '#5A524A',
  inkMuted: '#6B6257',
  paper: '#FBF7EC',
  white: '#FFFFFF',
  red: '#C9381F',
  redSoft: '#FBE3D6',
  redInk: '#8A3E17',
  navy: '#1F3A6B',
  sky: 'rgba(132,190,236,0.85)',
  skyInk: '#173055',
  green: 'rgba(184,214,120,0.75)',
  greenInk: '#3D5222',
  yellow: '#FFE27A',
  beige: '#E7E1D3',
  dash: 'rgba(43,38,34,0.2)',
  wash: 'rgba(43,38,34,0.07)',
} as const;

export const FONT_BODY = "-apple-system, 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', system-ui, sans-serif";
export const FONT_HAND = "'Gaegu', -apple-system, 'Apple SD Gothic Neo', sans-serif";

/**
 * 화면 맨 위 여백. 홈 화면 앱(PWA)과 iOS 앱은 상태 표시줄 밑까지 그리므로,
 * 노치·다이내믹 아일랜드 높이(safe-area-inset-top)만큼 내려야 위가 잘리지 않는다.
 */
export function topPad(extra: number): string {
  return `max(${extra}px, calc(env(safe-area-inset-top, 0px) + ${extra - 38}px))`;
}

/** 크림색 모눈 종이 배경 */
export const PAPER: React.CSSProperties = {
  backgroundColor: COLOR.paper,
  backgroundImage: 'linear-gradient(rgba(120,150,110,0.13) 1px, transparent 1px), linear-gradient(90deg, rgba(120,150,110,0.13) 1px, transparent 1px)',
  backgroundSize: '18px 18px',
};

/** 화면 바깥 틀: 종이 배경 + 본문 글꼴 */
export const SCREEN: React.CSSProperties = {
  ...PAPER,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  fontFamily: FONT_BODY,
  letterSpacing: '-0.2px',
  color: COLOR.ink,
};

/** 마스킹 테이프에 손글씨로 쓴 라벨 */
export function tape(background: string, color: string, rotate = -2, fontSize = 17): React.CSSProperties {
  return {
    alignSelf: 'flex-start',
    display: 'inline-block',
    background,
    color,
    padding: '1px 10px',
    fontFamily: FONT_HAND,
    fontWeight: 700,
    fontSize,
    lineHeight: 1.35,
    transform: `rotate(${rotate}deg)`,
  };
}

export const TAPE_GREEN = (rotate = -2) => tape(COLOR.green, COLOR.greenInk, rotate);
export const TAPE_SKY = (rotate = -2, fontSize = 17) => tape(COLOR.sky, COLOR.skyInk, rotate, fontSize);

/** 얇은 잉크 테두리 카드 */
export const CARD: React.CSSProperties = {
  background: COLOR.white,
  border: `1.5px solid ${COLOR.ink}`,
  borderRadius: 16,
};

/** 화면 제목 */
export const TITLE: React.CSSProperties = {
  margin: 0,
  fontSize: 28,
  fontWeight: 700,
  letterSpacing: '-0.6px',
  lineHeight: 1.2,
};

/** 형광펜 밑줄 소제목 */
export function highlight(color: string): React.CSSProperties {
  return {
    alignSelf: 'flex-start',
    fontSize: 13,
    fontWeight: 700,
    padding: '0 3px',
    background: `linear-gradient(transparent 55%, ${color} 55%)`,
  };
}

const BUTTON_BASE: React.CSSProperties = {
  minHeight: 52,
  borderRadius: 16,
  border: `1.5px solid ${COLOR.ink}`,
  fontFamily: FONT_BODY,
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
};

export const BUTTON_PRIMARY: React.CSSProperties = { ...BUTTON_BASE, background: COLOR.red, color: COLOR.white };
export const BUTTON_SECONDARY: React.CSSProperties = { ...BUTTON_BASE, background: COLOR.white, color: COLOR.ink };

/** 버튼이 눌리지 않는 상태 — 색을 빼고 테두리를 흐리게 */
export const BUTTON_DISABLED: React.CSSProperties = {
  background: COLOR.wash,
  color: 'rgba(43,38,34,0.4)',
  border: '1.5px solid rgba(43,38,34,0.2)',
  cursor: 'default',
};

/** 작은 알약 버튼 (바꾸기, 제목 수정 등) */
export const PILL_BUTTON: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  minHeight: 32,
  padding: '0 12px',
  border: `1.5px solid ${COLOR.ink}`,
  borderRadius: 16,
  background: COLOR.white,
  color: COLOR.ink,
  fontFamily: FONT_BODY,
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: 'nowrap',
  cursor: 'pointer',
};
