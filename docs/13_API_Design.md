# AI Business Agent Web API Design

## 1. 문서 목적

이 문서는 AI Business Agent Web의 API 구조를 정의한다.

Frontend(Next.js)는

직접 Database를 접근하지 않는다.

모든 데이터는

FastAPI를 통해 조회하고 저장한다.

---

# 2. API 설계 원칙

## 2.1 REST API

초기 MVP는 REST API를 사용한다.

GraphQL은 사용하지 않는다.

---

## 2.2 모든 요청은 로그인 사용자 기준

모든 API는

로그인된 사용자의

business_id

를 기준으로 동작한다.

사용자가

business_id

를 직접 전달하지 않는다.

로그인 정보에서 자동으로 가져온다.

---

## 2.3 계산은 Backend

Frontend는

계산하지 않는다.

예시

×

영업이익 계산

×

수수료 계산

×

예상 정산금 계산

Backend가 계산하여 전달한다.

Frontend는

결과를 표시만 한다.

---

# 3. 인증(Authentication)

회원가입

POST

/api/auth/signup

로그인

POST

/api/auth/login

로그아웃

POST

/api/auth/logout

현재 사용자 조회

GET

/api/auth/me

---

# 4. 사업장

사업장 생성

POST

/api/business

사업장 조회

GET

/api/business

사업장 수정

PUT

/api/business

---

# 5. Home

Home 정보 조회

GET

/api/home

응답

- 오늘 해야 하는 일
- 오늘 입력 상태
- 오늘 매출
- 오늘 비용
- 오늘 예상 정산금
- 이번달 매출
- 이번달 영업이익
- 최근 매출

---

# 6. 매출

매출 저장

POST

/api/sales

특정 날짜 조회

GET

/api/sales/{date}

특정 날짜 수정

PUT

/api/sales/{date}

특정 날짜 삭제

DELETE

/api/sales/{date}

매출 목록 조회

GET

/api/sales

---

# 7. 비용

비용 추가

POST

/api/expenses

오늘 비용 조회

GET

/api/expenses/today

기간 조회

GET

/api/expenses

비용 수정

PUT

/api/expenses/{id}

비용 삭제

DELETE

/api/expenses/{id}

---

# 8. 배달대행사

예수금 조회

GET

/api/delivery

거래 추가

POST

/api/delivery

거래 수정

PUT

/api/delivery/{id}

거래 삭제

DELETE

/api/delivery/{id}

---

# 9. 경영성과

경영성과 조회

GET

/api/performance

파라미터

month

응답

총매출

총비용

예상 수수료

예상 정산금

영업이익

이익률

플랫폼 비중

비용 구조

---

# 10. 설정

사업장 설정

GET

/api/settings

사업장 설정 수정

PUT

/api/settings

매출채널 조회

GET

/api/settings/channels

매출채널 수정

PUT

/api/settings/channels

비용항목 조회

GET

/api/settings/cost-items

비용항목 수정

PUT

/api/settings/cost-items

---

# 11. 피드백

피드백 등록

POST

/api/feedback

내 피드백 조회

GET

/api/feedback

---

# 12. 관리자

베타 사용자 목록

GET

/api/admin/users

사업장 목록

GET

/api/admin/businesses

피드백 목록

GET

/api/admin/feedback

사용 통계

GET

/api/admin/statistics

---

# 13. API 응답 규칙

모든 API는

동일한 응답 구조를 사용한다.

성공

{
    "success": true,
    "data": {}
}

실패

{
    "success": false,
    "message": "오류 내용"
}

---

# 14. Validation

Backend에서

반드시 검증한다.

예시

금액

0 이상

날짜

미래 입력 금지

채널

사용중인 채널인지

비용항목

존재하는 항목인지

---

# 15. Frontend 역할

Frontend는

입력

↓

API 호출

↓

결과 표시

만 담당한다.

계산은 하지 않는다.

---

# 16. Backend 역할

Backend는

입력 검증

↓

DB 저장

↓

손익 계산

↓

수수료 계산

↓

정산 계산

↓

응답

까지 담당한다.

---

# 17. MVP에서 구현할 API

초기 MVP

회원가입

로그인

Home

매출

비용

배달대행사

경영성과

설정

피드백

관리자

여기까지만 구현한다.

AI API는

초기 MVP에서 제외한다.