import type { CapacitorConfig } from '@capacitor/cli';

// iOS 앱 설정. 웹 빌드(dist)를 앱 안에 넣어 원격 사이트를 불러오지 않는다.
const config: CapacitorConfig = {
  appId: 'com.hakku.app',
  appName: '하꾸',
  webDir: 'dist',
  ios: {
    // 웹뷰를 상태 표시줄 밑까지 그리고, 위·아래 여백은 CSS의 safe-area 값으로 맞춘다
    contentInset: 'never',
    backgroundColor: '#FBF7EC',
    // 영상 재생 중 화면 위아래로 튕기는 스크롤을 막는다
    scrollEnabled: false,
  },
};

export default config;
