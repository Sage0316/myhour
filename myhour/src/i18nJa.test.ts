import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { JA } from './i18nJa';

// 화면 문구 L('한국어', 'English')의 한국어가 일본어 사전에 다 있는지 본다.
// 새 문장을 추가하고 사전에 안 넣으면 일본어 폰에서 그 문장만 영어로 보인다.
const LITERAL = /\bL\(\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\$]|\\.)*`)\s*,\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)\s*\)/g;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !name.includes('.test.') ? [path] : [];
  });
}

describe('일본어 사전', () => {
  it('covers every fixed Korean UI string', () => {
    const missing: string[] = [];
    for (const file of sourceFiles(join(__dirname))) {
      for (const match of readFileSync(file, 'utf8').matchAll(LITERAL)) {
        const ko = new Function(`return ${match[1]}`)() as string;
        if (!(ko in JA)) missing.push(`${file}: ${ko}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('never leaves Korean in a Japanese translation', () => {
    const leaked = Object.entries(JA).filter(([ko, ja]) => ko !== '한국어' && /[가-힣]/.test(ja));
    expect(leaked).toEqual([]);
  });
});
