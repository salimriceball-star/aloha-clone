# Admin Editor and Post Publishing

- 글 목록은 `/loginpage/posts`, 새 글은 `/loginpage/posts/new`, 한 글 편집은 `/loginpage/posts/edit/[id]`를 사용한다.
- 상품 편집 화면은 `/loginpage/products/common`, `/loginpage/products/edit/[slug]` 기준으로 동일한 공용 에디터를 사용한다.
- 에디터 컴포넌트: `/home/vboxuser/aloha_clone/components/admin-html-editor.tsx`
- 업로드 API: `/home/vboxuser/aloha_clone/app/api/admin/uploads/route.ts`
- Cloudinary 업로드 헬퍼: `/home/vboxuser/aloha_clone/lib/admin-uploads.ts`

## Editing Modes

- `기본 모드`: 서식이 적용된 상태로 직접 편집
- `HTML 모드`: raw HTML 직접 수정
- 툴바 지원: 굵게, 기울임, 밑줄, 문단, H2, H3, 목록, 번호 목록, 인용, 링크, 링크 해제
- 실행 취소, 다시 실행, 구분선, 서식 지우기, 글자 수, 브라우저 로컬 임시 저장과 복구 지원
- `/loginpage/products` 는 상품 목록, 페이지네이션, 일괄 상태 수정만 담당한다
- 상품 공통 도입부는 `/loginpage/products/common` 에서만 편집한다
- 개별 상품 본문/가격/공개상태 편집은 `/loginpage/products/edit/[slug]` 에서만 렌더링한다

## Upload Behavior

- 이미지/파일은 에디터 내부 `이미지 추가` 버튼 또는 드래그앤드롭으로 업로드 가능
- 여러 파일을 한 번에 처리한다
- 업로드 성공 시 현재 커서 위치에 자동 삽입된다
- 이미지: `<img>` 삽입
- 비이미지 파일: 링크 `<a>` 삽입

## Notes

- 로컬 DB가 일시적으로 불가해도 Cloudinary 업로드와 본문 삽입은 계속 동작한다
- 자산 이력 저장은 best-effort이며, DB unavailable 시 `clone_assets` 기록만 건너뛴다
- 상품 목록 페이지는 한 번에 24개씩만 렌더링한다
- 목록 페이지에서는 체크박스로 여러 상품을 선택해 공개범위와 판매 상태를 일괄 변경할 수 있다

## Post Workflow

- `초안`: 관리자에서만 존재하며 URL을 알아도 공개 요청은 404
- `발행`: 발행일시가 현재 이전일 때 공개 가능
- `예약`: 발행 상태지만 발행일시가 미래인 글. 해당 시각 전까지 404
- 목록에서 수정, 복사, 초안/발행 전환 가능
- 복사본은 사고 방지를 위해 `완전 비공개 + 초안 + 목록/검색/색인 끔`으로 생성
- 글 목록에는 에디터를 렌더링하지 않고 한 글 편집 화면에만 에디터 2개를 로드해 관리자 페이지 부담을 제한

## Visibility Matrix

| 설정 | 정확한 URL | 홈/글 목록 | 사이트 검색 | 검색엔진 |
|---|---|---|---|---|
| 공개 | 허용 | 선택 | 선택 | 선택 |
| 링크 전용 | 허용 | 기본 비노출 | 선택 가능 | 강제 noindex |
| 비밀번호 | 서버 암호 확인 후 허용 | 선택 가능 | 강제 비노출 | 강제 noindex |
| 완전 비공개 | 404 | 비노출 | 비노출 | 비노출 |

- 검색 결과에만 표시: `링크 전용 + 홈·글 목록 끔 + 사이트 검색 켬`
- URL을 알아도 완전 차단: `완전 비공개` 또는 `초안`
- `allow_indexing`은 공개 글에서만 효력이 있으며 sitemap과 페이지 robots metadata에 함께 반영

## WordPress Comparison

- 현재 구현이 더 단순한 부분: 한 화면에서 접근/목록/검색/색인 정책을 명시적으로 분리하고, 복사본을 안전한 초안으로 만드는 흐름
- WordPress가 아직 우세한 부분: 서버측 자동 저장, 변경 이력/리비전 비교, 휴지통, 블록 변환, 분류/태그, 대표 이미지 전용 UI, 다중 사용자 승인 흐름
- 다음 우선순위: `clone_post_revisions` 스냅샷과 복원 UI, 휴지통/복구, 서버 자동저장. 이 셋은 운영 실수 복구 가치가 높고 공개 페이지 로딩에는 영향을 주지 않도록 관리자 요청에서만 동작시킨다.
