# 인증·사업장 온보딩과 2026년 6월 매출 가져오기

## 식별자 원칙

- 인증 계정의 기준은 `auth.users.id` UUID다.
- 사업장의 기준은 `businesses.id` UUID다.
- 사업자등록번호는 선택 속성이며 숫자 10자리로 정규화한다. user ID나 business ID로 사용하지 않는다.
- 모든 매출은 `business_id`에 귀속하고 입력 사용자는 `created_by`로 기록한다.

## 회원가입과 이메일 인증

1. `/signup`에서 이메일, 비밀번호, 비밀번호 확인을 검증한다.
2. `signUp`의 `emailRedirectTo`는 `/auth/callback?next=/onboarding/business`다.
3. 이메일 인증이 켜져 세션이 없으면 인증 메일 안내를 표시한다.
4. callback은 code 또는 token hash를 검증해 Cookie 세션을 만든다.
5. 세션이 있으면 `/onboarding/business`로 이동한다.

회원가입 trigger는 profile만 idempotent하게 생성한다. 사업장은 trigger에서 만들지 않는다.

## 최초 사업장 등록

`/onboarding/business`는 로그인 사용자에게만 열리고 다음을 받는다.

- 필수: 사업장명, 업종
- 선택: 사업자등록번호, 대표자명, 지역

`create_initial_business` RPC는 사용자별 advisory transaction lock을 잡고 active membership을 다시 조회한다. 이미 있으면 기존 UUID를 반환한다. 없으면 사업장과 owner membership을 같은 트랜잭션에서 만든다. 따라서 부분 성공, callback 재호출, 중복 제출로 고아 사업장이 생기지 않는다.

## 로그인과 현재 사업장

- 미로그인 보호 경로 접근: `/login`
- 로그인 + active membership 없음: `/onboarding/business`
- 로그인 + active membership 있음: 요청 경로 또는 `/`

현재 사업장은 active membership 중 owner를 우선하고, 그 다음 생성 순서가 빠른 membership을 사용한다. 서버 매출 action은 클라이언트의 business ID를 받지 않고 `requireCurrentBusiness()`로 다시 결정한다.

## 테이블과 RLS

`profiles`는 본인만 조회·수정한다. `businesses`는 active membership이 있는 사용자만 조회하며 owner/manager만 허용 컬럼을 수정할 수 있다. `business_memberships`는 같은 사업장 소속만 조회하고 클라이언트 insert/update/delete는 막는다. 최초 owner membership은 security-definer RPC에서만 만든다. service role key는 브라우저에 두지 않는다.

Migration 적용 순서:

1. `202607200001_create_auth_business_foundation.sql`
2. `202607200002_create_sales.sql`
3. `202607200003_complete_business_onboarding.sql`

3번은 기존 계정의 사업장과 membership을 삭제하지 않는다. 이후 신규 사용자의 trigger만 profile 전용으로 교체한다.

## 2026년 6월 매출 가져오기

더보기 → 데이터 관리에서 다음을 확인하고 실행한다.

1. 현재 로그인과 current business 확인
2. 대상 사업장명 표시
3. LocalStorage `business-day-sales` 중 2026-06-01~2026-06-30만 runtime 검증
4. 5월과 7월 데이터 제외
5. 서버 action이 current business UUID와 로그인 user UUID를 강제 적용
6. 동일 날짜·플랫폼·채널은 skipped
7. 실패한 레코드는 개별 표시
8. 원본 LocalStorage 유지

`local-sales:v1:<date>:<platform>:<channel>` 형식의 `import_key`와 DB unique constraint를 함께 사용한다.

## 실제 Supabase 적용 절차

1. `frontend/.env.example`을 복사해 `.env.local`에 project URL과 publishable(또는 anon) key를 입력한다.
2. Supabase Dashboard → SQL Editor → New query에서 migration 001, 002, 003을 파일 순서대로 각각 실행한다.
3. Authentication → URL Configuration에서 Site URL을 `http://localhost:3000`으로 설정한다.
4. Redirect URLs에 `http://localhost:3000/auth/callback`을 추가한다. 배포 주소도 같은 callback 경로로 추가한다.
5. Authentication → Providers → Email에서 provider와 이메일 확인 정책을 점검한다.
6. 개발 서버를 재시작한다.
7. 새 테스트 계정으로 가입하고, 필요한 경우 이메일 인증을 완료한다.
8. 사업장을 등록한다.
9. Table Editor에서 profile, business, owner membership이 각각 하나인지 확인한다.
10. 데이터 관리에서 2026년 6월 매출을 가져온다.
11. sales 테이블에서 해당 business UUID와 6월 행을 확인한다.
12. 같은 가져오기를 재실행해 전부 중복 제외되는지 확인한다.
13. LocalStorage 원본이 남아 있는지 확인한다.
14. 여기까지 성공한 후에만 `.env.local`의 `NEXT_PUBLIC_SALES_STORAGE_MODE=supabase`로 바꾸고 서버를 재시작한다.

## 오류 복구

- migration 실패: 실패한 파일과 Dashboard 오류를 확인하고 다음 migration을 실행하지 않는다.
- 사업장 생성 실패: 재시도한다. RPC는 active membership이 생긴 뒤 재호출돼도 새 사업장을 만들지 않는다.
- import 일부 실패: 원본을 수정하지 않으므로 실패 목록을 확인한 뒤 재실행한다.
- import 검증 전환 실패: 매출 모드를 `local`로 유지한다.
- 잘못된 환경변수 또는 네트워크 오류: key를 화면이나 로그에 출력하지 말고 Dashboard 설정과 `.env.local` 변수명만 확인한다.

## 수동 검증 체크리스트

- 이메일 확인 ON/OFF 회원가입 분기
- 중복 이메일, 발송 제한, 잘못된 비밀번호 정책 메시지
- 비로그인/사업장 없음/사업장 있음 라우팅
- callback 반복 호출과 온보딩 중복 제출
- 로그아웃 후 보호 페이지 차단
- 서로 다른 두 계정의 사업장과 sales 교차 접근 차단
- 6월만 import되고 5월·7월은 제외되는지 확인
- 새로고침·재로그인 후 동일 사업장과 DB 매출 유지
