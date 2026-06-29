# 달란트 성경학교 웹앱

교회학교 선생님이 아이별 달란트 지급, 누적 달란트, 관찰 메모를 기록하는 모바일 우선 웹앱입니다.

## 사이트 주소

https://hty9330-sys.github.io/talent-bible-school/

최신 검증 주소:

https://hty9330-sys.github.io/talent-bible-school/?v=20260630-01

## 실행

```powershell
cd C:\Users\lg\OneDrive\Desktop\codex\.codex\2026-06-28
& 'C:\Users\lg\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

브라우저에서 `http://localhost:4173`을 엽니다.

현재 Codex 세션에서는 수정된 버전을 `http://localhost:4176`으로 실행하고 응답을 확인했습니다.

## Supabase 연결

1. Supabase 프로젝트에서 `supabase/schema.sql`을 SQL Editor로 실행합니다.
2. Supabase Auth에서 선생님 계정을 생성합니다.
3. `public.users` 테이블에 Auth user id와 같은 id로 사용자 프로필을 추가합니다.
4. 앱의 설정 화면에서 Project URL과 public anon key를 입력합니다.

초기 관리자 계정은 Supabase SQL Editor에서 직접 `public.users`에 `role = 'admin'`으로 추가하세요.

## 포함된 화면

- 로그인 화면
- 홈 화면
- 아이 목록 화면
- 아이 상세 화면
- 달란트 지급 화면
- 메모 작성 화면
- 관리자 화면

## 현재 실행 방식

첫 화면이 빈 화면으로 뜨지 않도록 React/Babel CDN 의존을 제거하고, `src/2026-06-28-app.js`에서 순수 브라우저 JavaScript로 샘플 모드를 렌더링합니다.

## 2차 개발 후보

- 상품 등록
- 달란트 사용 및 차감
- 교환 내역 기록
- 아이별 사용 내역
- 통계 화면
