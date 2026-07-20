# Supabase 인증·사업장 기반 설정

## 이번 단계의 저장 범위

- 인증 세션: Supabase Auth와 SSR Cookie
- 사용자 프로필: Supabase `profiles`
- 사업장과 소속: Supabase `businesses`, `business_memberships`
- 매출·비용·배달대행·마감·재고·수수료·백업 데이터: 기존 브라우저 LocalStorage

로그인 후에도 업무 데이터는 다른 기기로 동기화되지 않는다. 업무 데이터의 DB 이전은 후속 단계에서 진행한다.

## 패키지와 환경변수

`frontend`에서 다음 패키지를 사용한다.

```bash
npm install @supabase/supabase-js @supabase/ssr
```

`frontend/.env.example`을 참고하여 커밋되지 않는 `frontend/.env.local`을 만든다.

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

구형 프로젝트에서는 publishable key 대신 anon key 값을 사용할 수 있다. `service_role` key는 브라우저 환경변수나 저장소에 넣지 않는다.

파일 복사, Dashboard 확인 위치와 개발 서버 재시작 절차는 `docs/26_Supabase_Environment_Setup.md`를 따른다.

## Migration 실행

Supabase Dashboard의 SQL Editor에서 다음 파일 전체를 실행한다.

```text
frontend/supabase/migrations/202607200001_create_auth_business_foundation.sql
```

Supabase CLI를 사용하는 경우 프로젝트 연결 후 다음 방식으로 적용할 수 있다.

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

로컬 Supabase 환경에서는 다음 명령으로 전체 migration을 재검증할 수 있다.

```bash
supabase db reset
```

## Authentication URL 설정

Supabase Dashboard의 Authentication → URL Configuration에서 환경별 URL을 등록한다.

- 로컬 Site URL: `http://localhost:3000`
- 로컬 Redirect URL: `http://localhost:3000/auth/callback`
- 배포 Site URL: 실제 HTTPS 서비스 주소
- 배포 Redirect URL: `https://실제도메인/auth/callback`

회원가입 확인 및 비밀번호 재설정은 `/auth/callback`에서 PKCE code를 Cookie 세션으로 교환한다. 외부 `next` URL은 허용하지 않는다.

## Dashboard 확인 사항

1. Email provider 활성화
2. 이메일 확인 필요 여부 결정
3. 비밀번호 최소 길이를 화면 안내와 맞추기
4. 공개 베타 전 Custom SMTP 구성
5. 로컬·미리보기·production Redirect URL 등록
6. migration 실행 후 세 테이블의 RLS 활성화 확인

## RLS 개요

- `profiles`: 본인 행만 조회·수정
- `businesses`: membership이 있는 사업장만 조회
- `businesses` 수정: owner 또는 manager 정책, 실제 앱 UI는 owner만 사업장명 수정
- `business_memberships`: 같은 사업장 membership만 조회
- profile, business, membership의 클라이언트 임의 생성·삭제 금지
- membership role의 클라이언트 임의 변경 금지

membership 정책의 재귀를 피하기 위해 제한된 `private` schema의 `security definer` 함수를 사용한다. 함수의 `search_path`는 빈 값으로 고정하고 테이블을 schema-qualified 이름으로 참조한다.

## 신규 사용자 생성

보완 migration 적용 후 `auth.users` insert trigger는 `profiles`만 생성한다. 로그인 사용자에게 active membership이 없으면 `/onboarding/business`로 이동한다. `create_initial_business()` RPC가 사용자별 lock 아래 사업장과 owner membership을 한 트랜잭션에서 생성한다.

전체 적용과 수동 검증 절차는 `docs/25_Authentication_Business_Onboarding.md`를 따른다.

## 개발 실행 및 검증

```bash
cd frontend
npm run dev
npm run lint
npx tsc --noEmit
npm run build
```

Database 타입은 현재 `frontend/src/types/database.ts`에 명시돼 있다. Supabase CLI 사용 시 다음 명령으로 실제 프로젝트 타입을 다시 생성할 수 있다.

```bash
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
```

project ref와 key는 문서나 코드에 실제 값으로 커밋하지 않는다.
