# 리팩토링 목록

## Critical

- [ ] **`post-websocket.ts:45,53` — `memId: '10523'` 하드코딩 제거**
  테스트용 ID가 그대로 남아있음. JWT 토큰에서 멤버 ID를 추출하거나 별도 API로 조회해야 함.

- [ ] **`index.ts:151` — 로그아웃 요청 에러 무시**
  `request.on('error', () => {})` → 최소한 `console.error` 로깅 추가.

## High

- [x] **`index.ts:158` — `handleSessionExpired`에서 `await` 누락**
  `handleLogout`이 `async`인데 `await` 없이 호출. 에러가 미처리됨.

- [x] **`auth.ts` — 쿠키 조회 로직 3회 중복**
  `isLoggedIn`, `getAuthToken`, `getAuthCookie`가 동일한 `Promise.all` 패턴 반복. `getAllCookies()` 헬퍼로 추출.

## Medium

- [x] **`ToastData` 인터페이스 3곳에 중복 정의**
  `post-websocket.ts`, `toast/renderer.ts`, preload에서는 `unknown`으로 타입 소실. `src/shared/types.ts`로 통합.

- [x] **`toast/renderer.ts:38` — `document.title` 변경을 IPC 대용으로 사용**
  `ipcRenderer.send('toast-clicked')`가 올바른 패턴. preload에 `toastClicked()` 추가.

- [x] **`window-manager.ts` — `webviewTag: true`가 모든 창에 기본 적용**
  메인 창에서만 필요. 보안상 기본값에서 제거.

- [x] **`index.ts:62` — `showPostRoom`에서 `import.meta.env` 직접 접근**
  config.ts 패턴과 불일치. config.ts에 `getPostRoomUrl(roomId)` 추가.

- [x] **`connectWebSocket` 콜백 래퍼 불필요**
  `(data) => showToast(data)` → `showToast` 직접 전달.

## Low

- [x] **`showLogin`에서 미사용 변수 `const win =`**
  반환값을 사용하지 않으므로 제거.

- [x] **`electron.vite.config.ts` — Prettier 스타일 불일치**
  큰따옴표 + 세미콜론 → 프로젝트 표준(싱글 쿼트, 세미콜론 없음)으로 통일.
