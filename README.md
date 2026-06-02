# projectory_event

이벤트 관리 화면 데모 (이벤트 목록 / 이벤트 수정 + 신청추가 레이어 팝업)

## 구성
- `event-list.html` : 이벤트 목록 (기존 화면)
- `event-edit.html` : 이벤트 수정 + 신청 명단 + 신청추가 팝업 + 화면 설명/댓글
- `styles.css` : 공통 스타일
- `server.js` : 화면 설명/댓글을 저장하는 간단 백엔드 (외부 의존성 없음)
- `data.json` : 화면 설명/댓글 저장 파일 (서버 실행 중 자동 갱신)

## 실행 방법 (서버 저장 = 여러 사용자 공유)
화면 설명과 댓글을 **여러 사람이 공유**하려면 서버를 띄워서 접속해야 합니다.

```bash
node server.js          # 기본 포트 3000 (PORT 환경변수로 변경 가능)
```

브라우저에서 접속:
- 목록: http://localhost:3000/
- 수정: http://localhost:3000/event-edit.html

이렇게 접속하면 화면 설명/댓글이 `data.json`(서버)에 저장되어 모든 접속자에게 공유됩니다.
타인의 변경 사항은 약 5초 간격 폴링으로 자동 반영됩니다.

## 참고
- 서버 없이 HTML 파일을 직접 열면(`file://`) 서버에 연결되지 않아 **해당 브라우저 localStorage에만 저장**됩니다.
  (이 경우 화면 설명 저장 표시가 "로컬 저장(서버 미연결)"로 표시됩니다.)
- 실제 운영 연동 시 `server.js`의 파일 저장부를 DB/API로 교체하면 됩니다.

## API (server.js)
- `GET    /api/state` : 전체 데이터(설명 + 댓글)
- `PUT    /api/descriptions/{key}` : 설명 저장 `{ "value": "..." }`
- `POST   /api/comments/{key}` : 댓글 추가 `{ "author": "...", "text": "..." }`
- `DELETE /api/comments/{key}/{id}` : 댓글 삭제
