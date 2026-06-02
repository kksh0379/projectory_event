# projectory_event

이벤트 관리 화면 데모 (이벤트 목록 / 이벤트 수정 + 신청추가 레이어 팝업)
화면 설명·댓글을 서버에 저장해 여러 사용자가 공유합니다.

## 구성
- `event-list.html` : 이벤트 목록 (기존 화면)
- `event-edit.html` : 이벤트 수정 + 신청 명단 + 신청추가 팝업 + 화면 설명/댓글
- `styles.css` : 공통 스타일
- `server.js` : 백엔드 서버 (외부 의존성 없음)
- `data.json` : 파일 저장소 (Upstash 미설정 시 사용)
- `Dockerfile`, `render.yaml`, `package.json` : 배포 설정

## 저장소(영구 보존)
`server.js`는 두 가지 저장 방식을 자동 선택합니다.
- 환경변수 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` 가 있으면 → **Upstash Redis(영구 저장)**
- 없으면 → 로컬 `data.json` 파일(서버 재시작 시 초기화될 수 있음)

## 로컬 실행
```bash
node server.js            # http://localhost:3000
```

## 배포 (Render + Upstash 영구 저장)

### 1) Upstash Redis 무료 DB 생성
1. https://upstash.com 가입 → Redis Database 생성 (Free)
2. 데이터베이스 상세에서 **REST API** 항목의 두 값 복사
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### 2) Render 웹 서비스 배포
1. https://render.com 가입 → **New → Blueprint** → 이 GitHub 저장소 선택
   (또는 New → Web Service, Start Command: `node server.js`)
2. 배포 브랜치 지정 (예: `claude/sleepy-goodall-PwIEK`)
3. **Environment**에 위 두 값 입력
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
4. 배포 완료 후 발급된 `https://<서비스명>.onrender.com` 으로 접속
   - 목록: `/`  · 수정: `/event-edit.html`

> Upstash 값을 넣으면 서비스가 재시작/슬립돼도 화면 설명·댓글이 영구 보존되고 모든 접속자에게 공유됩니다.
> 환경변수를 비워두면 파일 저장(data.json)으로 동작하며, 무료 인스턴스 특성상 재시작 시 초기화될 수 있습니다.

## API
- `GET    /api/state` : 전체 데이터(설명 + 댓글)
- `PUT    /api/descriptions/{key}` : 설명 저장 `{ "value": "..." }`
- `POST   /api/comments/{key}` : 댓글 추가 `{ "author": "...", "text": "..." }`
- `DELETE /api/comments/{key}/{id}` : 댓글 삭제
