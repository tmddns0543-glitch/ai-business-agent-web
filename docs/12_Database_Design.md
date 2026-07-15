# AI Business Agent Web Database Design

## 1. 문서 목적

이 문서는 Web MVP의 데이터 저장 구조를 정의한다.

현재 Local MVP(CSV)의 데이터를
향후 PostgreSQL로 이전할 수 있도록 설계한다.

모든 데이터는

business_id

기준으로 분리한다.

---

# 2. 설계 원칙

## 2.1 모든 데이터는 거래 단위로 저장한다.

매출

↓

하루 단위

비용

↓

거래 단위

배달대행

↓

거래 단위

---

## 2.2 데이터는 절대 중복 저장하지 않는다.

예를 들어

현금주문 캐시입금은

배달대행 거래

에는 저장되지만

매출

에는 다시 저장하지 않는다.

같은 거래를

두 번 저장하지 않는다.

---

## 2.3 계산값은 저장하지 않는다.

예시

영업이익

×

DB 저장 안함

총매출

×

DB 저장 안함

필요할 때 계산한다.

DB에는

원본 데이터만 저장한다.

---

# 3. 핵심 테이블

초기 MVP에서는

다음 테이블만 사용한다.

users

businesses

business_members

sales_days

sales_entries

expense_transactions

delivery_transactions

sales_channels

cost_items

business_settings

feedback

---

# 4. users

사용자 정보

필드

id

email

password_hash

name

status

created_at

updated_at

---

# 5. businesses

사업장 정보

id

business_name

owner_user_id

industry

created_at

---

# 6. business_members

사업장 사용자

id

business_id

user_id

role

role

owner

manager

staff

viewer

---

# 7. sales_days

하루 매출

id

business_id

sales_date

created_at

updated_at

하루에

한 건만 존재한다.

---

# 8. sales_entries

플랫폼별 매출

id

sales_day_id

channel_id

payment_type

gross_sales

order_count

expected_fee

expected_settlement

memo

created_at

---

# 9. expense_transactions

비용 거래

id

business_id

expense_date

cost_item_id

vendor

amount

memo

created_at

---

# 10. delivery_transactions

배달대행 거래

id

business_id

agency

transaction_date

transaction_type

amount

memo

related_sales_day_id

created_at

---

거래유형

top_up

delivery_usage

cash_order_credit

refund

adjustment

---

# 11. sales_channels

매출채널

id

business_id

name

brokerage_fee

payment_fee

card_fee

vat

active

---

# 12. cost_items

비용항목

id

business_id

category

name

cost_type

fixed_variable

active

---

# 13. business_settings

사업장 설정

id

business_id

setting_key

setting_value

---

# 14. feedback

피드백

id

business_id

user_id

category

message

page

app_version

created_at

---

# 15. 데이터 관계

Business

↓

Sales Day

↓

Sales Entry

Business

↓

Expense Transaction

Business

↓

Delivery Transaction

Business

↓

Settings

Business

↓

Channels

Business

↓

Cost Items

---

# 16. Local 데이터 이전

현재 CSV는

향후

Migration Tool을 이용하여

DB로 이전한다.

예시

sales.csv

↓

sales_days

↓

sales_entries

expenses.csv

↓

expense_transactions

delivery

↓

delivery_transactions

---

# 17. 성공 기준

모든 Local 데이터를

손실 없이

DB로 이전할 수 있어야 한다.

모든 계산은

현재 Local MVP와

동일한 결과를 가져야 한다.