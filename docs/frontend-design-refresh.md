# Frontend design refresh

적용일: 2026-07-22

## 기준과 되돌리기

- 리뷰 입력: `docs/frontend-design-review-request_anser.txt`
- 변경 전 커밋: `8f607c55d251c2e9ce4a12bd0b2c5dbe8ed83f30`
- 원격 체크포인트 태그: `checkpoint/pre-frontend-design-refresh-2026-07-22`
- 장애 시 Vercel Dashboard의 이전 Production을 Promote하는 방법이 가장 빠르다.
- 코드 전체를 되돌려야 할 때만 체크포인트에서 새 복구 브랜치를 만든다.

```bash
cd /home/ahn/aloha
git fetch --tags origin
git switch -c rescue/frontend-before-refresh checkpoint/pre-frontend-design-refresh-2026-07-22
```

현재 작업 브랜치에서 일부 변경만 취소할 때는 전체 reset 대신 해당 변경 커밋을 `git revert <commit>` 한다.

## 적용 내용

- 색상·간격·모서리·그림자·글꼴 변수를 하나의 `:root`로 통합했다.
- 외부 웹폰트 요청을 없애고 한국어 시스템 글꼴 스택을 사용해 추가 다운로드와 렌더 지연을 제거했다.
- 헤더 높이와 검색 UI를 줄이고 모바일에서 브랜드 문구를 숨겨 핵심 메뉴 공간을 확보했다.
- 본문 폭을 최대 820px로 제한하고 문단·제목·표·인용·이미지의 읽기 규칙을 정리했다.
- 상점은 데스크톱 3열, 태블릿 2열, 모바일 1열의 카드 목록으로 만들었다. 모바일 카드는 이미지 42%, 정보 58%의 가로형으로 표시한다.
- 관리자 공개 화면 도구막대는 데스크톱에서 상단 고정, 모바일에서 하단 도크로 표시한다.
- 글·상품 편집의 저장 버튼을 화면 아래에 고정하고 모바일에서는 상태 문구를 생략해 본문을 가리지 않게 했다.
- 키보드 초점 표시, 44px 수량 버튼, 오류 알림 역할과 폼 자동완성 속성을 보강했다.
- 결제 화면에 계좌번호 복사와 성공·실패 상태 메시지를 추가했다.
- 워드프레스 크기 접미사(`-1024x...`) 이미지도 기존 Cloudinary 원본으로 정규화해 홈의 깨진 이미지를 복원했다.

## 의도적으로 하지 않은 일

- 기존 CSS의 앞부분을 대량 삭제하지 않았다. 관리자·결제 화면 회귀 위험에 비해 얻는 이점이 작다.
- 610KB인 기존 Gmarket 글꼴을 로컬 번들로 넣지 않았다. 외부 글꼴도 제거해 페이지 로딩 비용을 줄였다.
- 희귀 브라우저용 별도 분기와 대규모 컴포넌트 재작성은 하지 않았다. 운영에 직접 도움이 되는 범위만 반영했다.

## 검증 결과

- `npm run typecheck`: 통과
- `npm run lint`: 통과
- `ALOHA_SKIP_ADMIN_DB=1 npm run build`: 통과, 정적 페이지 32개 생성
- BrowserOS 로컬 Production QA: 데스크톱 상점 3열, 모바일 1열, 가로 넘침 없음
- 홈 이미지 QA: 깨진 이미지 0개, `/wp-content/uploads/` 원본 주소 잔존 0개
- 결제 QA: 계좌번호 복사 성공 메시지 확인
- 모바일 편집기 QA: 저장 바 높이 58px, 브라우저 page error 0개

Production 배포 뒤에는 홈, `/shop`, `/product/210`, `/res`, `/loginpage/posts`, `/checkout`을 한 번씩 확인한다.
