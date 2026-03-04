# 오스템 데스크톱 앱 기획

## 개요

osstem.com과 denall.com 서비스들을 Electron 기반 데스크톱 앱으로 제공한다.

## 기술 스택

| 항목      | 선택              | 비고                                           |
| --------- | ----------------- | ---------------------------------------------- |
| 런타임    | **Electron**      | 웹사이트를 데스크톱 앱으로 래핑                |
| 빌드 도구 | **electron-vite** | main / preload / renderer 프로세스별 Vite 빌드 |
| 언어      | **TypeScript**    | 전 프로세스 적용                               |

### 프로젝트 구조 (electron-vite 기본)

```
src/
  main/       ← main 프로세스 (Node.js 환경, TypeScript)
  preload/    ← preload 스크립트 (TypeScript)
  shared/     ← main/renderer 공용 모듈 (config 등)
  renderer/   ← 렌더러 프로세스 (브라우저 환경, TypeScript)
    main/         ← 메인 레이아웃 (사이드바 + webview)
      index.html
      style.css
      renderer.ts
    toast/        ← 토스트 알림
      index.html
      style.css
      renderer.ts
```

## 환경 관리

빌드 시 `--mode` 플래그로 환경을 선택하며, electron-vite가 해당 `.env` 파일을 자동으로 로드해 코드에 주입한다.

### 환경 파일

```
.env               ← 공통 기본값
.env.stage         ← 스테이지 환경
.env.production    ← 운영 환경
```

`.env` 파일에는 **도메인(origin)과 개발 옵션**을 관리하고, 세부 경로(path)는 소스 코드에서 조합한다.

```ini
# .env (개발 환경 기본값, .env.stage와 동일)
VITE_MEMBER_ORIGIN=http://stage-new-member.denall.com
VITE_MCS_ORIGIN=https://stage-mcs.denall.com
VITE_JOB_ORIGIN=http://stage-job.denall.com
VITE_OPEN_WEBVIEW_DEVTOOLS=false

# .env.stage
VITE_MEMBER_ORIGIN=http://stage-new-member.denall.com
VITE_MCS_ORIGIN=https://stage-mcs.denall.com
VITE_JOB_ORIGIN=http://stage-job.denall.com

# .env.production
VITE_MEMBER_ORIGIN=https://member.denall.com
VITE_MCS_ORIGIN=https://mcs.denall.com
VITE_JOB_ORIGIN=https://job.denall.com
```

| 변수                         | 설명                                      |
| ---------------------------- | ----------------------------------------- |
| `VITE_MEMBER_ORIGIN`         | 통합회원 서비스 도메인                    |
| `VITE_MCS_ORIGIN`            | MCS 서비스 도메인                         |
| `VITE_JOB_ORIGIN`            | JOB 서비스 도메인                         |
| `VITE_OPEN_WEBVIEW_DEVTOOLS` | `true`이면 webview DevTools 자동 열기     |

경로는 소스에서 상수로 관리한다.

```ts
// src/shared/config.ts
const MEMBER_ORIGIN = import.meta.env.VITE_MEMBER_ORIGIN;
const MCS_ORIGIN = import.meta.env.VITE_MCS_ORIGIN;
const JOB_ORIGIN = import.meta.env.VITE_JOB_ORIGIN;

export const URL = {
  LOGIN: `${MEMBER_ORIGIN}/sso-login?channel-id=Mcs`,
  LOGOUT: `${MEMBER_ORIGIN}/sso-logout?channel-id=Mcs`,
  PROFILE: `${MEMBER_ORIGIN}/profile-password-verify?channel-id=Mcs`,
  BOOK: `${MCS_ORIGIN}/desktop/book`,
  CRM: `${MCS_ORIGIN}/desktop/crm`,
  POST: `${MCS_ORIGIN}/desktop/talk`,
  JOB: `${JOB_ORIGIN}`,
  MY_PAGE: `${MCS_ORIGIN}/desktop/editInfoHost`,
};
```

### 빌드 스크립트

패키징은 **electron-builder**를 사용한다.

```json
{
  "scripts": {
    "dev": "electron-vite dev -- --inspect",
    "dev:stage": "electron-vite dev --mode stage",
    "build": "electron-vite build",
    "build:stage": "electron-vite build --mode stage && electron-builder --config electron-builder.stage.yml",
    "build:production": "electron-vite build --mode production && electron-builder --config electron-builder.production.yml",
    "format": "prettier --write \"src/**/*.{ts,html,css,json}\"",
    "format:check": "prettier --check \"src/**/*.{ts,html,css,json}\""
  }
}
```

```
electron-vite build   ← TypeScript 컴파일 + 번들링
       ↓
electron-builder      ← 실행 파일로 패키징
  - Windows: .exe (NSIS 인스톨러)
  - macOS:   .dmg
```

### electron-builder 패키징 설정

```yaml
appId: com.osstem.oss-app
productName: OSS App
directories:
  output: release
win:
  target: nsis
  icon: assets/icon.ico
mac:
  target: dmg
  icon: assets/icon.icns
nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
```

배포는 빌드된 실행 파일을 직접 전달하는 방식(파일 공유, 사내 배포 등)으로 한다.

> **향후 확장**: 배포 규모가 커지면 **electron-updater**를 추가해 앱 시작 시 자동으로 새 버전을 확인하고 업데이트하는 방식으로 전환할 수 있다.

## 대상 사이트

아래 URL은 운영 환경 기준이며, 환경(stage/production)에 따라 도메인이 달라진다.

| 사이트                   | URL (운영 기준)                                                    | 용도               |
| ------------------------ | ------------------------------------------------------------------ | ------------------ |
| 통합회원 (로그인)        | `https://member.denall.com/sso-login?channel-id=Mcs`               | 로그인             |
| 통합회원 (로그아웃)      | `https://member.denall.com/sso-logout?channel-id=Mcs`              | 로그아웃           |
| 통합회원 (계정정보 관리) | `https://member.denall.com/profile-password-verify?channel-id=Mcs` | 계정정보 관리      |
| BOOK                     | `https://mcs.denall.com/desktop/book`                              | 사이드바 > BOOK    |
| CRM                      | `https://mcs.denall.com/desktop/crm`                               | 사이드바 > CRM     |
| POST                     | `https://mcs.denall.com/desktop/talk`                              | 사이드바 > POST    |
| JOB                      | `https://job.denall.com`                                           | 사이드바 > JOB     |
| MY PAGE                  | `https://mcs.denall.com/desktop/editInfoHost`                      | 사이드바 > MY PAGE |

## 메인 화면 레이아웃

로그인 완료 후 표시되는 메인 화면은 Slack 스타일의 좌측 사이드바 + 우측 컨텐츠 영역으로 구성한다.

```
+--------------------------------------------------+
|  [📅]  |                                          |
|  [👥]  |        <webview> 컨텐츠 영역              |
|  [💬]  |        (선택된 메뉴의 URL 로드)            |
|  [💼]  |                                          |
|  [👤]  |                                          |
+--------------------------------------------------+
```

### 사이드바 메뉴 아이콘

[Bootstrap Icons](https://icons.getbootstrap.com/) CDN을 사용한다.

```html
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css"
/>
```

| 메뉴    | 용도      | Bootstrap Icon | 클래스                 | 툴팁    |
| ------- | --------- | -------------- | ---------------------- | ------- |
| BOOK    | 예약      | calendar-check | `bi bi-calendar-check` | BOOK    |
| CRM     | 고객관리  | people-fill    | `bi bi-people-fill`    | CRM     |
| POST    | 채팅      | chat-dots-fill | `bi bi-chat-dots-fill` | POST    |
| JOB     | 구인/구직 | briefcase-fill | `bi bi-briefcase-fill` | JOB     |
| MY PAGE | 내 정보   | person-circle  | `bi bi-person-circle`  | MY PAGE |

- renderer에서 로컬 HTML(`src/renderer/main/index.html`)을 로드
- 좌측 사이드바: Vanilla HTML/CSS + Bootstrap Icons, 아이콘 버튼 세로 배치
- 우측 컨텐츠: `<webview>` 태그로 선택된 메뉴의 URL을 동적 로드
- 메뉴 클릭 시 `webview.src` 변경으로 페이지 전환
- webPreferences에 `webviewTag: true` 추가

## 앱 실행 흐름

1. 앱 시작 → 창 표시 + 트레이 상주
2. 로그인 상태 확인 → `osstem_token` 쿠키 존재 여부로 판별 (domain: `.denall.com` 또는 `.osstem.com`)
   - **로그인 됨** → 메인 레이아웃(로컬 HTML) 표시 → POST webview 로드 (기본 메뉴)
   - **로그인 안 됨** → `URL.LOGIN` 웹뷰 표시 → 로그인 완료 후 메인 레이아웃 표시 → POST webview 로드 (기본 메뉴)
3. 로그인 세션 유지 시간이 길어 대부분 로그인 상태가 유지됨
4. 사용 중 세션 만료 시 → 웹 서비스가 `window.osstemDesktopApp` IPC로 앱에 알림 → 로그인 화면으로 전환

### 로그인 완료 감지

`osstem_token` 쿠키 생성 이벤트를 감지해 로그인 완료로 판단하고 메인 레이아웃으로 전환한다.

```ts
session.defaultSession.cookies.on("changed", (event, cookie, cause) => {
  if (cookie.name === "osstem_token" && cause === "explicit") {
    // 로그인 완료 → 메인 레이아웃으로 전환
  }
});
```

> **향후 갱신**: 모바일 앱 개발 부서의 로그인 완료 감지 방식을 참고해 업데이트한다.

```ts
// 앱 시작 시 로그인 확인
const [denallCookies, osstemCookies] = await Promise.all([
  session.defaultSession.cookies.get({ domain: ".denall.com" }),
  session.defaultSession.cookies.get({ domain: ".osstem.com" }),
]);
const isLoggedIn = [...denallCookies, ...osstemCookies].some(
  (c) => c.name === "osstem_token",
);
```

## 시스템 트레이

- 앱은 시스템 트레이에 **상주**
- **더블클릭** → 로그인 상태 확인
  - **로그인 됨** → 앱 열기 (메인 레이아웃)
  - **로그인 안 됨** → 로그인 화면 열기
- **우클릭** → 컨텍스트 메뉴 표시
- **X 버튼** → 창만 숨기고 트레이에 계속 상주 (종료하지 않음)
- macOS: `app.dock?.hide()`로 독 아이콘 숨김 (트레이 전용 앱)
- `window-all-closed` 이벤트에서 `app.quit()` 호출하지 않음 — 모든 창이 닫혀도 트레이에 상주

### 트레이 아이콘

플랫폼별 아이콘 파일을 `assets/` 디렉토리에 준비하고, `process.platform`으로 분기 선택한다.

| 플랫폼  | 파일               |
| ------- | ------------------ |
| Windows | `assets/icon.ico`  |
| macOS   | `assets/icon.icns` |

### 트레이 컨텍스트 메뉴 (로그인 상태별)

| 메뉴 항목     | 비로그인 | 로그인 |
| ------------- | :------: | :----: |
| 로그인        |    O     |   X    |
| 앱 열기       |    X     |   O    |
| 계정정보 관리 |    X     |   O    |
| 로그아웃      |    X     |   O    |
| 종료          |    O     |   O    |

### 로그아웃 흐름

1. 트레이 메뉴 → 로그아웃 클릭
2. `URL.LOGOUT` 호출 (`https://member.denall.com/sso-logout?channel-id=Mcs`)
3. 모든 웹뷰 종료
4. 트레이 메뉴를 비로그인 상태로 전환 (로그아웃 메뉴 → 로그인 메뉴)

## 창 관리

`Map<string, BrowserWindow>` 기반 윈도우 레지스트리로 모든 창을 관리한다.

- 로그인, 메인(사이드바+webview), 계정정보 관리, 채팅방을 각각 **별도 BrowserWindow**로 생성
- **중복 방지**: 이미 열린 창이 있으면 새로 생성하지 않고 `focus()` 처리
- `closed` 이벤트에서 레지스트리에서 자동 제거
- 로그아웃 시 `closeAllWindows()`로 모든 웹뷰 일괄 종료
- 계정정보 관리는 트레이 메뉴에서 클릭 시 **새 창으로 열기** (메인 창과 별도)
- **채팅방 전용 창**: 웹에서 `openPostRoom(roomId)` 호출 시 전용 BrowserWindow를 열고 `${MCS_ORIGIN}/talk/?roomId={roomId}` 로드 (roomId는 main 프로세스에서 문자열 타입 및 형식 검증)

## 웹뷰 설정

아래 설정은 로그인, 채팅, 계정정보 관리 등 **모든 웹뷰에 동일하게 적용**한다.

- `title: 'OSSTEM'` — 모든 창의 타이틀을 "OSSTEM"으로 통일 (트레이 툴팁, electron-builder productName 포함)
- `menuBarVisible: false` — 모든 창에서 기본 메뉴바(File, Edit, View...) 숨김
- `contextIsolation: true` — preload와 렌더러 전역 스코프 격리
- `nodeIntegration: false` — 렌더러에서 Node.js 접근 차단
- User-Agent에 `osstem-desktop-app:1.0.0` 강제 삽입
- `backgroundThrottling: false` — 창이 숨겨진 상태에서도 WebSocket 메시지 처리 지연 방지
- IPC 입력 검증 — 채널 핸들러에서 타입 체크 + 빈 문자열 방지
- URL은 소스 코드에 정의된 값만 사용 (사용자 입력 URL 로딩 없음)

```ts
const win = new BrowserWindow({
  icon: path.join(__dirname, "../../assets/icon.ico"),
  webPreferences: {
    preload: path.join(__dirname, "../preload/index.js"),
    contextIsolation: true,
    nodeIntegration: false,
    backgroundThrottling: false,
    webviewTag: true,
  },
});
```

> **참고**: WebSocket 연결은 main 프로세스에서 직접 관리한다. `backgroundThrottling: false`는 webview 내부의 UI 갱신 지연을 방지하기 위한 설정이며, 알림용 WebSocket과는 별개이다.

## 알림

- **형태**: 커스텀 디자인 토스트 (우측 하단)
- **트리거**: main 프로세스가 WebSocket으로 새 메시지 수신 시
- **표시 시간**: 5초 후 자동으로 사라짐

### 토스트 표시 항목

| 항목          | 설명                  |
| ------------- | --------------------- |
| 프로필 이미지 | 보낸 사람 프로필 사진 |
| 보낸 사람     | 이름                  |
| 보낸 일시     | 메시지 수신 시각      |
| 메시지 내용   | 말줄임 처리 (`...`)   |

### 토스트 클릭 시 동작

해당 채팅방으로 포커스 이동

### WebSocket 연결 (main 프로세스)

main 프로세스에서 직접 WebSocket에 연결해 메시지를 수신한다. 웹 서비스(webview)를 경유하지 않으므로 창이 닫혀 있어도 알림이 동작한다.

- **연결 URL**: `wss://{MCS_ORIGIN}/mcs/ws`
- **인증**: Electron 세션에서 해당 도메인의 모든 쿠키를 추출해 WebSocket 핸드셰이크 헤더로 전달하고, STOMP CONNECT 프레임에 `memId`를 포함
- **구독**: 연결 완료 후 `/topic/all-message/{memId}` 토픽을 구독하여 메시지 수신
- **연결 시점**: 로그인 완료 후 WebSocket 연결, 로그아웃 시 연결 해제

**WebSocket 수신 메시지 구조 (참고)**

```json
{
  "msgId": "19cb69b15959mks6Q",
  "roomId": "19c4b333fc1oB2IEg",
  "roomName": "샘플",
  "msgTypeCd": "01",
  "msgText": {
    "text": "123123"
  },
  "msgDate": "2026-03-04T11:09:02.835812412",
  "senderProfile": {
    "memName": "홍길동",
    "intnMemNo": 0,
    "custId": "10523",
    "memDvCd": "BIZMN"
  },
  "roomTypeCd": "02"
}
```

**토스트에 사용하는 데이터**

```ts
// main 프로세스에서 WebSocket 메시지 수신 후 토스트에 표시할 데이터
interface NotificationData {
  sender: string; // 보낸 사람 이름 (senderProfile.memName)
  sentAt: string; // 보낸 일시 (msgDate)
  message: string; // 메시지 (msgText.text)
  roomId: string; // 토스트 클릭 시 해당 채팅방 포커스 이동용
}
```

### 알림 흐름

```
main 프로세스 (WebSocket 직접 연결)
  → 메시지 수신
  → 토스트 데이터 추출
  → 커스텀 토스트 알림 표시
  → 토스트 클릭 시 해당 채팅방으로 포커스 이동
```

## 통신 구조 (IPC 래핑)

- Electron ↔ 웹페이지 간 통신은 **IPC** 사용
- 웹 서비스 코드에서는 IPC를 직접 알지 못하도록 **래핑**
- preload script에서 래핑 인터페이스를 `window` 객체에 노출

```ts
// 웹 서비스 쪽 (IPC를 모름)
window.osstemDesktopApp.sessionExpired(); // 세션 만료 → 로그인 화면 전환
window.osstemDesktopApp.openPostRoom(roomId); // 채팅방 전용 창 열기

// 내부적으로
// preload: ipcRenderer.send(...) → main process → 해당 동작 수행
```

> **알림(토스트)**: WebSocket 메시지 수신은 main 프로세스에서 직접 처리하므로 IPC를 거치지 않는다.

## 사용자 범위

denall.com 웹 서비스를 이용하는 모든 고객

## 앱 버전 관리

`package.json`의 `version` 필드를 수동으로 관리한다.

```json
{
  "version": "1.0.0"
}
```

## 디버깅

### Main 프로세스 디버깅

`npm run dev` 실행 시 `--inspect` 플래그가 포함되어 있어 Node.js 디버거가 자동으로 활성화된다.

1. `npm run dev`로 앱 실행
2. Chrome 브라우저에서 `chrome://inspect` 접속
3. **Remote Target** 목록에 Electron 프로세스가 표시되면 **inspect** 클릭
4. DevTools에서 소스 코드 확인, 브레이크포인트 설정, `debugger` 문 사용 가능

> **참고**: `console.log()`는 별도 도구 없이 터미널에 바로 출력되므로 간단한 값 확인에 유용하다.

### Renderer 프로세스 디버깅

renderer 프로세스는 브라우저 환경이므로 일반 웹 개발과 동일하게 디버깅한다.

1. 앱 실행 후 `F12` 또는 `Ctrl+Shift+I`로 DevTools 열기
2. `debugger` 문, 브레이크포인트, `console.log()` 모두 사용 가능

## 미결정 사항

- [ ] **로그아웃 후 쿠키 처리** — 로그아웃 URL 호출 후 서버에서 쿠키가 삭제되는지, 앱에서도 명시적으로 쿠키를 삭제해야 하는지
- [ ] **IPC 이벤트 전체 명세** — 세션 만료 등 웹 서비스 ↔ 앱 간 주고받는 전체 이벤트 인터페이스 정의 필요
- [ ] **창 기본 크기 / 최소 크기** — BrowserWindow의 초기 width/height 및 최소 크기
- [ ] **크로스 도메인 토큰 문제** — .osstem.com으로 로그인 후 .denall.com 사이트에 접속하면 토큰이 생기지 않아 추후 확인 필요
