# 매출 Repository와 Supabase 이전

## 기존 매출 구조

기존 매출은 개별 주문 목록이 아니라 `영업일 × 플랫폼` 단위의 입력 snapshot이다.

```text
business-day-sales
└─ days
   └─ 2026-07-20
      ├─ baemin: { prepaid, card, cash, baeminOne, baeminOneOrders }
      ├─ coupang-eats: { sales, orders }
      ├─ yogiyo: { prepaid, card, cash, yogiDelivery, yogiDeliveryOrders }
      ├─ ddangyo: { prepaid }
      └─ general: { card, cash, bankTransfer }
```

같은 날짜와 플랫폼을 다시 저장하면 플랫폼 객체 전체를 교체한다. 기존 데이터에는 별도 ID가 없다.

## DB 구조

`sales`는 플랫폼 snapshot을 정산 채널 단위 행으로 저장한다.

- 금액: 원 단위 `bigint`
- 주문 수: 해당 채널 행의 `order_count`
- 고유 기준: `business_id + business_date + platform + channel`
- 사용자 입력 저장: 같은 고유 기준 행을 upsert
- import 출처: `source`, `source_record_id`, `import_key`

Migration:

```text
frontend/supabase/migrations/202607200002_create_sales.sql
```

## Repository 구조

```text
Sales UI / Closing / Management
            ↓
getSalesRepository()
            ↓
SalesRepository
     ├─ LocalStorageSalesRepository
     └─ SupabaseSalesRepository
               ↓
         Server Actions
               ↓
   requireCurrentBusiness() + RLS
```

화면은 Supabase Row나 LocalStorage 저장 함수를 직접 사용하지 않는다. 기존 정산 계산 함수는 Repository가 반환한 `StoredSalesByPlatform`과 날짜별 fee settings snapshot을 입력받는다.

## 저장소 선택

```dotenv
NEXT_PUBLIC_SALES_STORAGE_MODE=local
```

- `local`: 기존 `business-day-sales` Key와 version 1 구조 유지
- `supabase`: 현재 로그인 사용자의 현재 사업장 DB 사용
- 미설정: 안전한 기존 동작을 위해 `local`
- 그 외 값: 조용한 fallback 없이 configuration 오류

Supabase 전환 테스트 전 migration과 인증 환경변수가 먼저 적용돼야 한다.

## RLS

모든 CRUD는 다음 조건을 사용한다.

- 현재 사용자에게 해당 사업장 membership이 있음
- 사업장 status가 `active`
- 역할이 `owner`, `manager`, `staff` 중 하나
- INSERT/UPDATE의 `created_by`가 `auth.uid()`와 일치

Server Action은 클라이언트 business ID를 받지 않고 `requireCurrentBusiness()`로 사업장을 결정한다. RLS가 이를 다시 검증한다.

## 기존 매출 가져오기

더보기 → 데이터 관리 → `이 기기의 기존 매출 가져오기`에서 실행한다.

1. LocalStorage 원본을 읽기 전용으로 검사
2. 유효한 날짜·플랫폼 snapshot을 채널 행으로 변환
3. 현재 사업장의 기존 DB 행 조회
4. 같은 `날짜 + 플랫폼 + 채널`은 중복으로 건너뜀
5. 신규 행에 `local-sales:v1:<날짜>:<플랫폼>:<채널>` import key 저장
6. 성공·중복·실패와 레코드 오류 반환

일부 플랫폼 데이터가 손상돼도 나머지 정상 데이터는 계속 가져온다. LocalStorage 원본은 성공 후에도 삭제하거나 수정하지 않는다.

## 오류 처리

- Repository 조회 오류를 빈 배열이나 0원으로 변환하지 않음
- LocalStorage JSON/version/날짜/금액 손상을 명시적 오류로 반환
- DB Row의 날짜·플랫폼·채널·금액을 runtime 검증
- 사용자에게 저장·조회·권한·설정 오류를 한국어로 표시
- 화면에서 loading, success, empty, error를 구분

## 테스트

```bash
cd frontend
npm run test:sales
npm run lint
npx tsc --noEmit
npm run build
```

자동 테스트는 LocalStorage CRUD와 날짜·월 분리, JSON 손상, snapshot/DB mapping, nullable 값, 중복 import, 부분 실패를 검증한다. 실제 RLS 교차 사용자 테스트는 migration을 적용한 Supabase 환경에서 별도로 수행한다.

## 다음 도메인에 재사용할 패턴

1. DB Row와 도메인 타입 분리
2. 현재 사업장에 묶인 Repository interface
3. LocalStorage adapter 보존
4. Supabase 호출을 서버 경계에 배치
5. 저장소 mode를 명시적으로 선택
6. 원본을 삭제하지 않는 재실행 안전 import
7. RLS와 Server Action의 이중 사업장 검증
