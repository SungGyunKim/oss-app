# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev              # 개발 서버 실행 (--inspect 포함, chrome://inspect로 디버깅)
npm run dev:stage        # 스테이지 환경으로 개발 서버 실행
npm run build            # TypeScript 컴파일 + 번들링
npm run build:stage      # 스테이지 빌드 + electron-builder 패키징
npm run build:production # 운영 빌드 + electron-builder 패키징
npm run format           # Prettier 포맷팅 적용
npm run format:check     # Prettier 위반 검사 (CI용)
```

## Architecture

Electron + electron-vite + TypeScript 기반 데스크톱 앱. denall.com/osstem.com 웹 서비스를 래핑하며, 시스템 트레이에 상주한다.

### 프로세스 구조 (electron-vite 기본)

```
src/
  main/           ← main 프로세스 (Node.js) — 앱 라이프사이클, 창 관리, WebSocket, 트레이
  preload/        ← contextBridge로 renderer에 IPC API 노출 (window.osstemDesktopApp)
  shared/         ← main/renderer 공용 모듈 (URL 상수, 창 크기, config)
  renderer/
    main/         ← 사이드바(Bootstrap Icons) + webview 레이아웃
    toast/        ← 커스텀 토스트 알림 UI
```

- `tsconfig.node.json`: main + preload + shared (Node.js 환경)
- `tsconfig.web.json`: renderer + shared (브라우저 환경)
- 두 빌드 타겟 모두 `src/shared/`를 include

### 핵심 모듈

- **`src/shared/config.ts`** — 모든 URL, WebSocket URL, User-Agent, 토스트 시간, 창 크기 상수. main과 renderer 양쪽에서 import
- **`src/main/window-manager.ts`** — `Map<string, BrowserWindow>` 기반 윈도우 레지스트리. 중복 방지, 기본 webPreferences 적용
- **`src/main/auth.ts`** — `osstem_token` 쿠키로 로그인 상태 판별. `.denall.com`과 `.osstem.com` 두 도메인 모두 확인
- **`src/main/websocket.ts`** — STOMP over WebSocket (`@stomp/stompjs` + `ws`). `/topic/all-message/{memId}` 구독하여 채팅 알림 수신
- **`src/main/tray.ts`** — 시스템 트레이. 로그인/비로그인 상태별 컨텍스트 메뉴
- **`src/preload/index.ts`** — `osstemDesktopApp` API 노출: `sessionExpired()`, `openPostRoom(roomId)`, `onToastData(callback)`

### 데이터 흐름

```
로그인: osstem_token 쿠키 감지 → handleLogin → showMain + connectWebSocket
알림:   WebSocket 메시지 수신 → showToast → postMessage('toast-data') → preload → renderer
IPC:    웹 서비스 → window.osstemDesktopApp.* → preload ipcRenderer → main 프로세스
```

## 환경 관리

`.env` 파일에 도메인(origin)만 관리하고, 세부 경로는 `src/shared/config.ts`에서 조합. `--mode` 플래그로 환경 선택.

- `.env` / `.env.stage` — 스테이지 환경 (stage-*.denall.com)
- `.env.production` — 운영 환경 (*.denall.com)

## 코드 스타일

- Prettier: 세미콜론 없음, 싱글 쿼트, 2칸 들여쓰기, trailing comma 없음, 100자 줄폭
- TypeScript strict 모드
- 한국어 커밋 메시지

## 보안 규칙

- `contextIsolation: true`, `nodeIntegration: false` 필수
- IPC 입력은 preload/handler에서 타입 + 형식 검증
- URL은 config에 정의된 값만 사용 (사용자 입력 URL 로딩 없음)
- 모든 BrowserWindow에 preload 스크립트 포함

## 기획 문서

상세 기획은 `docs/plan.md` 참조 (앱 실행 흐름, 트레이 동작, WebSocket 메시지 구조, 미결정 사항 등).
