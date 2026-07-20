# Supabase 공개 환경변수 설정

## 파일 위치

Next.js 애플리케이션 루트는 `frontend`다. 공개 Supabase 설정은 다음 파일에 둔다.

```text
frontend/.env.local
```

상위 프로젝트 폴더의 `.env`나 `.env.local`은 `frontend`에서 실행하는 Next.js의 기준 파일로 사용하지 않는다.

## 필요한 값

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_SALES_STORAGE_MODE=local
```

Supabase Dashboard의 프로젝트 `Connect` 화면 또는 `Settings → API Keys`에서 Project URL과 publishable key를 확인한다. 구형 프로젝트의 anon public key도 코드상 fallback으로 지원하지만 새 설정은 publishable key를 기준으로 한다.

`service_role` 또는 secret key는 브라우저용 `NEXT_PUBLIC_` 변수에 넣지 않는다. 실제 URL이나 키를 Git, 문서, 채팅 또는 화면 캡처에 공유하지 않는다.

## Windows PowerShell 설정

`frontend` 폴더에서 다음을 실행한다.

```powershell
Copy-Item .env.example .env.local
```

생성된 `.env.local`을 열고 placeholder 두 값을 실제 프로젝트 값으로 교체한다.

## 개발 서버 재시작

환경변수는 브라우저 새로고침만으로 반영되지 않을 수 있다.

1. 실행 중인 개발 서버를 종료한다.
2. `frontend/.env.local`을 저장한다.
3. `frontend`에서 `npm run dev`를 실행한다.
4. `/signup`을 새로 연다.
5. 설정 안내가 사라지고 회원가입 버튼이 활성화되는지 확인한다.

## 설정 오류 판정

애플리케이션은 다음을 설정 미완료로 처리한다.

- URL 또는 key 누락
- 빈 값
- `.env.example` placeholder를 그대로 사용
- HTTPS가 아닌 외부 URL
- URL 형식 오류

로컬 Supabase의 `http://localhost`와 `http://127.0.0.1`은 허용한다. 설정 오류 메시지는 실제 키 값을 포함하지 않는다.
