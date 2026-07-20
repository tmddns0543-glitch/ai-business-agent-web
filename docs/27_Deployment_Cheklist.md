# 27. Deployment Checklist

# 목적

이 문서는

AI Business Agent를 개발 환경에서 실제 서비스 환경으로 배포하기 전

반드시 확인해야 하는 체크리스트이다.

모든 항목이 완료되어야

서비스를 정상적으로 사용할 수 있다.

---

# 1. Supabase 프로젝트

□ Supabase 프로젝트 생성

□ Project URL 확인

□ Publishable Key 확인

□ Authentication 활성화

□ Email Provider 설정 확인

□ Redirect URL 설정

---

# 2. 환경설정

□ frontend/.env.local 생성

□ NEXT_PUBLIC_SUPABASE_URL 입력

□ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 입력

□ NEXT_PUBLIC_SALES_STORAGE_MODE 확인

□ 개발 서버 재시작

---

# 3. Database

□ 인증 Migration 적용

□ Sales Migration 적용

□ profiles 생성 확인

□ businesses 생성 확인

□ business_memberships 생성 확인

□ sales 테이블 생성 확인

---

# 4. 회원가입

□ 회원가입 성공

□ 이메일 인증 성공 (필요 시)

□ 로그인 성공

□ 로그아웃 성공

□ 로그인 유지 확인

---

# 5. 사업장

□ 최초 사업장 생성

□ 사업장명 저장 확인

□ 업종 저장 확인

□ 사업자번호 저장 확인 (선택)

□ 현재 사업장 조회 확인

---

# 6. 기존 데이터 가져오기

□ LocalStorage 데이터 확인

□ 2026년 6월 매출 Import

□ 중복 Import 방지 확인

□ Import 결과 확인

□ LocalStorage 원본 유지 확인

---

# 7. 매출

□ 매출 입력

□ 매출 수정

□ 매출 삭제

□ 월별 조회

□ 경영성과 반영

□ 정산 계산 확인

---

# 8. 권한

□ 다른 계정 생성

□ 다른 계정 로그인

□ 다른 사업장 데이터 조회 불가

□ RLS 정상 동작 확인

---

# 9. Supabase 저장 전환

□ NEXT_PUBLIC_SALES_STORAGE_MODE=supabase 변경

□ 개발 서버 재시작

□ 신규 매출 DB 저장 확인

□ 기존 6월 데이터 조회 확인

---

# 10. 여러 기기 테스트

□ 다른 PC 로그인

□ 같은 사업장 조회

□ 6월 매출 조회

□ 신규 매출 동기화 확인

□ 로그아웃 후 재로그인 확인

---

# 11. 회귀 테스트

□ Home 정상

□ Closing 정상

□ Sales 정상

□ Management 정상

□ Fee History 정상

□ Inventory 정상

□ Build 성공

□ TypeScript 오류 없음

□ Lint 통과

---

# 12. 운영 배포 준비

□ Backup 기능 확인

□ Restore 기능 확인

□ Error Log 확인

□ .env.local Git 제외 확인

□ Secret Key 노출 여부 확인

□ Service Role 미노출 확인

---

# MVP 완료 조건

아래 조건이 모두 충족되면

매출 시스템은

LocalStorage 기반 MVP에서

Supabase 기반 서비스로 전환 완료된 것으로 본다.

- 회원가입 가능
- 로그인 가능
- 사업장 생성 가능
- 현재 사업장 조회 가능
- 2026년 6월 매출 Import 완료
- Supabase 매출 조회 가능
- 다른 PC에서도 동일 데이터 확인
- 다른 사업장 접근 차단
- 신규 매출 DB 저장 가능
- 기존 정산 계산 정상
- Build / Lint / TypeScript 통과

---

# 다음 단계

매출 시스템이 완료되면

다음 순서로 진행한다.

1. 마감(Closing) DB 이전
2. 비용(Expenses) DB 이전
3. 재고(Inventory) DB 이전
4. 배달대행 DB 이전
5. AI Agent
6. Analytics