# Supabase 빠른 연결

1. Supabase Dashboard에서 사용할 프로젝트를 연다.
2. `Connect` 또는 `Project Settings → API Keys`로 이동한다.
3. Project URL을 복사한다.
4. Publishable Key를 복사한다.
5. `frontend/.env.local`을 연다.
6. `PASTE_SUPABASE_PROJECT_URL_HERE`와 `PASTE_SUPABASE_PUBLISHABLE_KEY_HERE`를 복사한 실제 값으로 교체한다.
7. `NEXT_PUBLIC_SALES_STORAGE_MODE=local`은 변경하지 않는다.
8. 실행 중인 개발 서버를 종료한다.
9. `frontend` 폴더에서 `npm run check:supabase-env`를 실행하고, 이어서 `npm run dev`를 실행한다.
10. `/signup`에서 설정 안내가 사라지고 회원가입 버튼이 활성화됐는지 확인한다.

## 보안 경고

- Secret key를 사용하지 않는다.
- `service_role` key를 사용하지 않는다.
- 실제 URL이나 key를 소스코드, 문서, Git 또는 채팅에 공유하지 않는다.
- `.env.local` 변경 후에는 브라우저 새로고침만 하지 말고 개발 서버를 재시작한다.
