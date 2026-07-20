# 신규 Supabase 프로젝트 초기화

현재 애플리케이션은 `business_memberships.status`를 포함한 사업장 구조와 `has_current_business`, `create_initial_business` RPC를 요구한다. 테이블이 없거나 후속 migration/RPC가 누락되면 로그인 인증은 성공해도 current business 조회가 실패한다.

## SQL Editor 실행 순서

Supabase Dashboard → SQL Editor → New query에서 다음 파일을 순서대로 하나씩 실행한다. 앞 단계가 성공하기 전에 다음 파일을 실행하지 않는다.

1. `frontend/supabase/migrations/202607200001_create_auth_business_foundation.sql`
2. `frontend/supabase/migrations/202607200002_create_sales.sql`
3. `frontend/supabase/migrations/202607200003_complete_business_onboarding.sql`
4. `frontend/supabase/migrations/202607200004_backfill_existing_auth_profiles.sql`

001은 기본 profile/business/membership 테이블, trigger와 재귀 방지 security-definer RLS helper를 만든다. 002는 001의 테이블과 updated-at 함수를 참조해 sales와 RLS를 만든다. 003은 membership status, 사업장 상세 컬럼, 최종 onboarding RPC와 active membership 정책을 적용한다. 004는 migration 전에 이미 가입한 Auth 사용자의 profile을 보충하고 authenticated 읽기 권한을 명시한 뒤 PostgREST schema cache reload를 요청한다.

기존 migration 파일은 SQL Editor에서 실행 가능한 SQL이다. 네 파일을 분리 실행하면 어느 단계에서 실패했는지 확인할 수 있으므로 통합 SQL보다 안전하다. `DROP TABLE`, service role key 또는 운영 데이터 삭제는 사용하지 않는다.

## 적용 검증

네 파일 실행 후 다음 파일을 SQL Editor에서 실행한다.

```text
frontend/supabase/manual/001_verify_auth_business_sales.sql
```

첫 결과의 여섯 boolean이 모두 `true`인지 확인한다. 그다음 Table Editor에서 RLS가 활성화됐는지 확인한다. 애플리케이션에서는 다음 명령으로 공개 schema 접근 상태를 확인한다.

```bash
cd frontend
npm run check:supabase-schema
```

## 정상 로그인 흐름

1. Auth 로그인 성공
2. 현재 사용자의 active membership 조회
3. 0건이면 오류 없이 `null`
4. `/onboarding/business` 이동
5. `create_initial_business`가 business와 owner membership을 한 트랜잭션으로 생성
6. 이후 로그인에서는 같은 current business 조회

개발 환경에서 DB 오류가 발생하면 화면과 서버 로그에 원문 데이터 대신 DB code와 `relation missing`, `permission denied`, `RLS recursion` 중 안전한 분류가 표시된다.
