# 현재 시스템 상태

## 저장소 경계

- 인증, 프로필, 사업장, membership: Supabase
- 매출: `SalesRepository`를 통해 LocalStorage 또는 Supabase 선택
- 비용, 재고, 배달대행, 수수료 설정, 마감 상태: LocalStorage 유지
- 기본 매출 모드: `local`

## 인증과 사업장

회원가입은 이메일 계정만 만든다. 이메일 인증이 필요하면 callback에서 Cookie 세션을 만든 뒤 `/onboarding/business`로 이동한다. 인증이 필요하지 않으면 회원가입 응답의 세션을 확인하고 같은 온보딩 화면으로 이동한다.

신규 `auth.users` trigger는 `profiles`만 생성한다. 사업장명과 업종을 입력하면 `create_initial_business` RPC가 `businesses`와 owner `business_memberships`를 한 트랜잭션에서 생성한다. active membership이 이미 있으면 기존 사업장 UUID를 반환하므로 재요청으로 사업장이 늘어나지 않는다.

## 매출 이전 상태

`NEXT_PUBLIC_SALES_STORAGE_MODE`가 `local`이면 기존 `business-day-sales`를 사용한다. 데이터 관리 화면에서 2026-06-01~2026-06-30 데이터만 현재 로그인 사용자의 현재 사업장으로 가져올 수 있다. 원본은 삭제하지 않으며 날짜·플랫폼·채널과 `import_key`로 중복을 막는다.

실제 Supabase migration, 회원가입, 사업장 생성, import와 DB 조회가 모두 확인되기 전에는 `supabase`로 전환하지 않는다.
