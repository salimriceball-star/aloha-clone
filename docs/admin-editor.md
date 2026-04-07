# Admin Editor

- 관리자 편집 화면은 `/loginpage/posts`, `/loginpage/products/common`, `/loginpage/products/edit/[slug]` 기준으로 동일한 공용 에디터를 사용한다.
- 에디터 컴포넌트: `/home/vboxuser/aloha_clone/components/admin-html-editor.tsx`
- 업로드 API: `/home/vboxuser/aloha_clone/app/api/admin/uploads/route.ts`
- Cloudinary 업로드 헬퍼: `/home/vboxuser/aloha_clone/lib/admin-uploads.ts`

## Editing Modes

- `기본 모드`: 서식이 적용된 상태로 직접 편집
- `HTML 모드`: raw HTML 직접 수정
- 툴바 지원: 굵게, 기울임, 밑줄, 문단, H2, H3, 목록, 번호 목록, 인용, 링크, 링크 해제
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
