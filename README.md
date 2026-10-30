# 2026 삼성한우리합창단 총회 with ‘메리고잉 운영진’ (Modular Web App v2)

## 폴더 및 파일 구조
- `index.html`: 메인 레이아웃, 탭 화면(정기총회 메인 허브·공식 식순 및 안건 바로가기, 회계 결산, 단칙 개정안 투표, 단장 선거, 단칙 전문, 당선 공고, 운영진 제어) 및 모달 마크업
- `css/styles.css`: 커스텀 스크롤바, 프로젝터 확대 모드, 검색 하이라이트 및 프린트 스타일
- `js/data-members.js`: 2026 메리고잉 운영진(18명) 및 전체 단원 명부(134명) 데이터 + 개인별 4자리 인증 코드
- `js/data-config.js`: 현행 단칙(제1조~제32조 전문), 정기총회 공식 식순(5건), 단칙 개정안(12건), 단장 선거 후보자 및 연간 일정 초기 데이터
- `js/utils.js`: 로컬 스토리지 동기화, 2/3 정족수 및 득표 집계, 조항 검색 헬퍼, DOCX/TXT 단칙 파서
- `js/render.js`: 전 화면(헤더, 식순, 명부, 단칙, 검색, 투표, 선거, 결산, 로그인 모달) 렌더링 함수 모듈
- `js/handlers.js`: 전 단원 공통 4자리 코드 인증(`selectVoter`, `confirmExecPasswordLogin`), 식순 추가/수정/삭제, 투표·선거·모달·파일 내보내기 이벤트 핸들러 모듈
- `js/app.js`: 앱 상태(`appState`) 초기화, 통합 렌더링(`renderAll`), 토스트 알림(`showToast`) 및 `DOMContentLoaded` 부트스트랩
- `assets/`: 단장 선거 후보자 프로필 이미지 (`cand_1.jpg`, `cand_2.jpg`, `cand_3.jpg`)

## 실행 방법
별도 빌드 없이 `index.html`을 브라우저에서 열거나 정적 웹 서버(GitHub Pages, Netlify, Vercel, Firebase Hosting 등)에 폴더 전체를 업로드하여 바로 실행할 수 있습니다.
