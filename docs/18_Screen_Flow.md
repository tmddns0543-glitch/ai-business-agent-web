# AI Business Agent Web Screen Flow

## 1. 문서 목적

이 문서는 AI Business Agent Web의 전체 화면 이동 구조(Screen Flow)를 정의한다.

Frontend 개발은 이 문서를 기준으로 진행한다.

모든 화면은 모바일 중심으로 설계하며, 사용자가 다음 행동을 자연스럽게 이어갈 수 있도록 구성한다.

---

# 2. 비회원

서비스 소개
↓
회원가입
↓
로그인
↓
사업장 생성
↓
Home

---

# 3. Home

Home
↓
오늘 마감 시작 (/closing)

또는

Home
↓
경영성과

또는

Home
↓
더보기

---

# 4. 마감

Home
↓
/closing
↓
매출 확인
↓
/closing/sales
↓
플랫폼별 매출 입력
↓
매출 확인 완료
↓
/closing
↓
비용 확인
↓
배달대행사 확인
↓
마감 완료
↓
Home

---

# 5. 플랫폼별 매출 입력

/closing/sales
↓
배달의민족
↓
저장
↓
/closing/sales

/closing/sales
↓
쿠팡이츠
↓
저장
↓
/closing/sales

/closing/sales
↓
요기요
↓
저장
↓
/closing/sales

/closing/sales
↓
땡겨요
↓
저장
↓
/closing/sales

/closing/sales
↓
일반결제
↓
저장
↓
/closing/sales

---

# 6. 매출 정산 흐름

플랫폼별 매출 입력
↓
sales-* 저장
↓
business-fee-settings 조회
↓
공통 정산 계산
↓
플랫폼별 예상 공제액
↓
플랫폼별 예상 정산금액
↓
전체 예상 공제액
↓
전체 예상 정산금액
↓
매출 확인 완료

---

# 7. 비용

Home
↓
비용
↓
거래 추가
↓
저장
↓
오늘 비용
↓
Home

---

# 8. 배달대행사

Home
↓
배달대행사
↓
거래 추가
↓
저장
↓
예수금 확인
↓
Home

---

# 9. 경영성과

Home
↓
경영성과
↓
월 선택
↓
매출 분석
↓
비용 분석
↓
플랫폼 분석
↓
Home

---

# 10. 더보기

Home
↓
더보기
↓
내 가게 설정
↓
매출채널 설정
↓
플랫폼 선택

---

# 11. 플랫폼 설정

매출채널 설정
↓
배달의민족 설정
↓
저장
↓
정산 화면 확인

또는

매출채널 설정
↓
쿠팡이츠 설정
↓
저장
↓
정산 화면 확인

또는

매출채널 설정
↓
요기요 설정
↓
저장
↓
정산 화면 확인

또는

매출채널 설정
↓
땡겨요 설정
↓
저장
↓
정산 화면 확인

또는

매출채널 설정
↓
일반결제 설정
↓
저장
↓
정산 화면 확인

---

# 12. 뒤로가기 규칙

플랫폼 설정
→ 매출채널 설정

매출채널 설정
→ 내 가게 설정

내 가게 설정
→ 더보기

마감 완료 후에는 항상 Home으로 이동한다.

---

# 13. Primary Flow

Home
↓
오늘 마감
↓
매출 입력
↓
예상 공제액 확인
↓
예상 정산금액 확인
↓
매출 확인 완료
↓
비용 확인
↓
배달대행사 확인
↓
마감 완료
↓
Home

이 Flow가 현재 MVP의 핵심 사용자 흐름이다.