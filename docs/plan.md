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
  renderer/   ← 렌더러 프로세스 (브라우저 환경, TypeScript)
```

## 환경 관리

빌드 시 `--mode` 플래그로 환경을 선택하며, electron-vite가 해당 `.env` 파일을 자동으로 로드해 코드에 주입한다.

### 환경 파일

```
.env               ← 공통 기본값
.env.stage         ← 스테이지 환경
.env.production    ← 운영 환경
```

`.env` 파일에는 **도메인(origin)만** 관리하고, 세부 경로(path)는 소스 코드에서 조합한다.

```ini
# .env.stage
VITE_MEMBER_ORIGIN=https://member-stg.osstem.com
VITE_MCS_ORIGIN=https://mcs-stg.osstem.com

# .env.production
VITE_MEMBER_ORIGIN=https://member.osstem.com
VITE_MCS_ORIGIN=https://mcs.osstem.com
```

경로는 소스에서 상수로 관리한다.

```ts
// src/main/config.ts
const MEMBER_ORIGIN = import.meta.env.VITE_MEMBER_ORIGIN;
const MCS_ORIGIN = import.meta.env.VITE_MCS_ORIGIN;

export const URL = {
  LOGIN: `${MEMBER_ORIGIN}/sso-login?channel-id=Mcs`,
  LOGOUT: `${MEMBER_ORIGIN}/sso-logout?channel-id=Mcs`,
  PROFILE: `${MEMBER_ORIGIN}/profile-password-verify?channel-id=Mcs`,
  POST: `${MCS_ORIGIN}/mobile/talk`,
};
```

### 빌드 스크립트

패키징은 **electron-builder**를 사용한다.

```json
{
  "scripts": {
    "dev": "electron-vite dev",
    "dev:stage": "electron-vite dev --mode stage",
    "build:stage": "electron-vite build --mode stage && electron-builder --config electron-builder.stage.yml",
    "build:production": "electron-vite build --mode production && electron-builder --config electron-builder.production.yml"
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

| 사이트                   | URL (운영 기준)                                                    | 용도           |
| ------------------------ | ------------------------------------------------------------------ | -------------- |
| 통합회원 (로그인)        | `https://member.osstem.com/sso-login?channel-id=Mcs`               | 로그인         |
| 통합회원 (로그아웃)      | `https://member.osstem.com/sso-logout?channel-id=Mcs`              | 로그아웃       |
| 통합회원 (계정정보 관리) | `https://member.osstem.com/profile-password-verify?channel-id=Mcs` | 계정정보 관리  |
| 오스템 채팅              | `https://mcs.osstem.com/mobile/talk`                               | 메인 채팅 화면 |

## 앱 실행 흐름

1. 앱 시작
2. 로그인 상태 확인 → `osstem_token` 쿠키 존재 여부로 판별 (domain: `.denall.com` 또는 `.osstem.com`)
   - **로그인 됨** → 오스템 채팅 화면으로 이동
   - **로그인 안 됨** → `URL.LOGIN` 웹뷰 표시 → 로그인 완료 후 오스템 채팅으로 이동
3. 로그인 세션 유지 시간이 길어 대부분 로그인 상태가 유지됨
4. 사용 중 세션 만료 시 → 웹 서비스가 `window.osstemDesktopApp` IPC로 앱에 알림 → 로그인 화면으로 전환

### 로그인 완료 감지

`osstem_token` 쿠키 생성 이벤트를 감지해 로그인 완료로 판단하고 채팅 화면으로 전환한다.

```ts
session.defaultSession.cookies.on("changed", (event, cookie, cause) => {
  if (cookie.name === "osstem_token" && cause === "explicit") {
    // 로그인 완료 → 채팅 화면으로 전환
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
  - **로그인 됨** → 오스템 채팅 창 열기
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

| 메뉴 항목        | 비로그인 | 로그인 |
| ---------------- | :------: | :----: |
| 로그인           |    O     |   X    |
| 오스템 채팅 열기 |    X     |   O    |
| 계정정보 관리    |    X     |   O    |
| 로그아웃         |    X     |   O    |
| 종료             |    O     |   O    |

### 로그아웃 흐름

1. 트레이 메뉴 → 로그아웃 클릭
2. `URL.LOGOUT` 호출 (`https://member.osstem.com/sso-logout?channel-id=Mcs`)
3. 모든 웹뷰 종료
4. 트레이 메뉴를 비로그인 상태로 전환 (로그아웃 메뉴 → 로그인 메뉴)

## 창 관리

`Map<string, BrowserWindow>` 기반 윈도우 레지스트리로 모든 창을 관리한다.

- 로그인, 채팅, 계정정보 관리를 각각 **별도 BrowserWindow**로 생성
- **중복 방지**: 이미 열린 창이 있으면 새로 생성하지 않고 `focus()` 처리
- `closed` 이벤트에서 레지스트리에서 자동 제거
- 로그아웃 시 `closeAllWindows()`로 모든 웹뷰 일괄 종료
- 계정정보 관리는 트레이 메뉴에서 클릭 시 **새 창으로 열기** (채팅 창과 별도)

## 웹뷰 설정

아래 설정은 로그인, 채팅, 계정정보 관리 등 **모든 웹뷰에 동일하게 적용**한다.

- `contextIsolation: true` — preload와 렌더러 전역 스코프 격리
- `nodeIntegration: false` — 렌더러에서 Node.js 접근 차단
- User-Agent에 `osstem-desktop-app:1.0.0` 강제 삽입
- `backgroundThrottling: false` — 창이 숨겨진 상태에서도 WebSocket 메시지 처리 지연 방지
- IPC 입력 검증 — 채널 핸들러에서 타입 체크 + 빈 문자열 방지
- URL은 소스 코드에 정의된 값만 사용 (사용자 입력 URL 로딩 없음)

```ts
const win = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, "../preload/index.js"),
    contextIsolation: true,
    nodeIntegration: false,
    backgroundThrottling: false,
  },
});
```

> **fallback**: `backgroundThrottling: false`로도 WebSocket 메시지 처리가 불안정한 경우, WebSocket 연결을 main 프로세스로 이전하는 방식(방법 3)으로 대체한다. 이 경우 Electron 세션에서 `osstem_token` 쿠키를 추출해 `VITE_MCS_ORIGIN` 기반의 WebSocket URL(`wss://{MCS_ORIGIN}/mcs/ws`)에 직접 연결한다.

## 알림

- **형태**: 커스텀 디자인 토스트 (우측 하단)
- **트리거**: 오스템 채팅에서 새 메시지 수신 시

### 토스트 표시 항목

| 항목          | 설명                  |
| ------------- | --------------------- |
| 프로필 이미지 | 보낸 사람 프로필 사진 |
| 보낸 사람     | 이름                  |
| 보낸 일시     | 메시지 수신 시각      |
| 메시지 내용   | 말줄임 처리 (`...`)   |

### 토스트 클릭 시 동작

해당 채팅방으로 포커스 이동

### 알림 전달 데이터

웹 서비스가 WebSocket 메시지를 수신한 뒤, 필요한 값을 추출해 `window.osstemDesktopApp.notify()`로 전달한다.

**WebSocket 수신 메시지 구조 (참고)**

```json
{
  "msgId": "19c2a238601feHAQ",
  "roomId": "19c2a2376dbNWLa8A",
  "msgTypeCd": "01",
  "msgText": {
    "text": "안녕 ~"
  },
  "readCnt": 0,
  "msgDate": "2026-02-05T04:31:37.089366",
  "senderProfile": {
    "memName": "신현주",
    "intnMemNo": 67706,
    "memDvCd": "INDV",
    "memTlNo": "01057799572",
    "memBirth": "1998-01-15",
    "memSexDvcd": "F"
  }
}
```

**앱으로 전달하는 데이터**

```ts
window.osstemDesktopApp.notify({
  profileImage: string, // 보낸 사람 프로필 이미지 URL
  sender: string, // 보낸 사람 이름 (senderProfile.memName)
  sentAt: string, // 보낸 일시 (msgDate)
  message: string, // 메시지 (msgText.text)
  roomId: string, // 토스트 클릭 시 해당 채팅방 포커스 이동용
});
```

### 알림 흐름

창을 `hide()` 처리해도 `webContents`는 살아있어 WebSocket이 유지된다. 웹 서비스가 메시지를 수신하면 `window.osstemDesktopApp`을 통해 앱으로 알림을 전달한다.

```
채팅 웹 서비스 (웹소켓으로 메시지 수신)
  → User-Agent로 앱 환경 판별
  → 래핑된 인터페이스 호출 (IPC를 직접 모름)
  → Electron IPC 통신
  → 커스텀 토스트 알림 표시
```

```ts
// 창 숨김 시 webContents 유지
win.on("close", (e) => {
  e.preventDefault();
  win.hide(); // webContents 살아있음 → WebSocket 유지
});
```

## 통신 구조 (IPC 래핑)

- Electron ↔ 웹페이지 간 통신은 **IPC** 사용
- 채팅 웹 서비스 코드에서는 IPC를 직접 알지 못하도록 **래핑**
- preload script에서 래핑 인터페이스를 `window` 객체에 노출

```ts
// 채팅 웹 서비스 쪽 (IPC를 모름)
window.osstemDesktopApp.notify({
  profileImage: "...",
  sender: "홍길동",
  sentAt: "2026-02-10",
  message: "안녕하세요",
  roomId: "19c9defe40dguFDg",
});

// 내부적으로
// preload: ipcRenderer.send(...) → main process → 토스트 표시
```

## 사용자 범위

osstem.com 웹 서비스를 이용하는 모든 고객

## 앱 버전 관리

`package.json`의 `version` 필드를 수동으로 관리한다.

```json
{
  "version": "1.0.0"
}
```

## 미결정 사항

- [x] ~~**창 구조**~~ — 별도 BrowserWindow 방식으로 확정 (Map 레지스트리로 관리)
- [ ] **앱 시작 시 창 표시 여부** — 앱 시작 시 바로 창을 표시할지, 트레이에만 상주했다가 더블클릭 시에만 창을 열지
- [x] ~~**계정정보 관리 창 처리 방식**~~ — 새 창으로 열기로 확정
- [ ] **로그아웃 후 쿠키 처리** — 로그아웃 URL 호출 후 서버에서 쿠키가 삭제되는지, 앱에서도 명시적으로 쿠키를 삭제해야 하는지
- [ ] **IPC 이벤트 전체 명세** — `notify()` 외에 세션 만료 등 웹 서비스 ↔ 앱 간 주고받는 전체 이벤트 인터페이스 정의 필요
- [x] ~~**앱 이름 / 번들 ID**~~ — `com.osstem.oss-app` / `OSS App`으로 확정
- [ ] **창 기본 크기 / 최소 크기** — BrowserWindow의 초기 width/height 및 최소 크기
- [x] ~~**앱 아이콘**~~ — 플랫폼별 2종 구조 확정 (`icon.ico`, `icon.icns`)
- [x] ~~**보안 설정**~~ — `contextIsolation: true`, `nodeIntegration: false` 확정
- [ ] **개발 환경 기본 URL** — `npm run dev` 실행 시 `.env` 공통 파일의 기본 origin 값 정의 필요
- [ ] **토스트 표시 시간** — 토스트가 표시되다가 자동으로 사라지기까지의 시간
