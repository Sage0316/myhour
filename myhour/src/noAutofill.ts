// 기록 칸에 아이폰 사파리가 연락처·주소 자동완성을 띄우지 않게 하는 속성 모음.
// 사파리는 autoComplete="off"를 무시하고 키보드 위 추천 줄에 주소를 넣는다(2026-10-28 펌킨 폰).
// 추천 줄 자체(autoCorrect)를 끄고, 칸 이름을 주소·연락처와 무관한 값으로 둔다.
// 비밀번호 관리 앱(1Password·LastPass)이 끼어드는 것도 함께 막는다.
export function noAutofill(name: string) {
  return {
    name: `hakku-${name}`,
    autoComplete: 'off',
    autoCorrect: 'off',
    autoCapitalize: 'off',
    spellCheck: false,
    'data-form-type': 'other',
    'data-lpignore': 'true',
    'data-1p-ignore': 'true',
  } as const;
}
