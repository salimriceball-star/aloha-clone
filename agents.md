# Aloha Clone Agent Rules

이 프로젝트에서는 아래 규칙을 항상 따른다.

## Canonical Context

- 프로젝트 핵심 문서는 아래 파일을 기준으로 유지한다.
- `/home/vboxuser/aloha_clone/docs/project-brief.md`
- `/home/vboxuser/aloha_clone/docs/clone-plan.md`
- `/home/vboxuser/aloha_clone/docs/site-audit.md`
- `/home/vboxuser/aloha_clone/docs/asset-pipeline.md`
- `/home/vboxuser/aloha_clone/docs/browseros-qa.md`
- `/home/vboxuser/aloha_clone/docs/admin-editor.md`
- `/home/vboxuser/aloha_clone/docs/vercel-deploy.md`
- `/home/vboxuser/aloha_clone/docs/purchase-flow.md`
- `/home/vboxuser/aloha_clone/docs/safety.md`
- 현재 milestone 진행 상태는 `/home/vboxuser/aloha_clone/progress.md` 를 기준으로 유지한다.
- 서비스/로그인/토큰 등 로컬 운영 정보는 아래 파일을 우선 확인한다.
- `/home/vboxuser/aloha_clone/.local/service-access.md`
- `/home/vboxuser/aloha_clone/.local/supabase.env`
- `/home/vboxuser/aloha_clone/.local/cloudinary.env`
- 사용자가 이미 제공한 정보는 위 문서와 로컬 파일에 정리해 두고, 다시 반복 질문하지 않는다.

## System Safety

- 시스템 리소스를 과도하게 사용할 수 있는 작업 전에는 반드시 안전장치를 먼저 건다.
- heavy 후보 예시: `npm install`, `npm run build`, `eslint`, 대량 crawl, 대량 이미지 처리, DB dump, 대량 변환 작업
- heavy 작업은 우선 `/home/vboxuser/aloha_clone/scripts/run-guarded.sh` 로 감싼다.
- 가능하면 대상 디렉터리/파일 범위를 좁혀서 실행한다.
- lint, search, crawl에서 `.browseros-profile`, `.local`, `node_modules`, `.next`, `logs`, `memory` 를 불필요하게 훑지 않는다.
- 메모리 부족 임계치에 걸리면 작업보다 시스템 안정성을 우선하고 프로세스를 종료한다.
- 진행 중인 작업은 `progress.md` 에 체크박스로 쪼개고, 현재 milestone의 체크박스가 모두 완료되기 전에는 중간 멈춤 상태로 두지 않는다.
- 새 단계에 들어가면 `progress.md` 의 milestone과 체크리스트를 즉시 현재 작업 기준으로 갱신하고, 진행에 맞춰 체크 상태를 계속 반영한다.

## BrowserOS

- BrowserOS는 `/home/vboxuser/Downloads/BrowserOS.AppImage`를 사용한다.
- 항상 고정 프로필 경로 `/home/vboxuser/web_clone/.browseros-profile` 를 사용한다.
- 실행 시 항상 `--no-sandbox` 와 `--user-data-dir=/home/vboxuser/web_clone/.browseros-profile` 를 포함한다.
- 기본 실행 URL은 `https://chatgpt.com/` 이다.
- 실행/재실행/문서화 절차는 `/home/vboxuser/aloha_clone/docs/browseros-manual.md` 를 기준으로 유지한다.
- BrowserOS 프로필에는 WordPress admin, Vercel, Cloudinary 로그인 세션이 유지된다고 가정하고 활용한다.

## Product Goal

- 목표는 WordPress 자체 이전이 아니라 `aloha-yt.xyz` 의 Vercel 운용용 클론 구축이다.
- 기존 사이트의 분위기, 정보 구조, 글/상품/구매 맥락, 푸터, 장바구니/결제 흐름을 최대한 보존한다.
- 방문자에게 보이는 UI/카피에는 `clone`, `원본`, `임시`, `로컬 기록`, 내부 구현 설명, QA용 주석 같은 운영자 메모를 넣지 않는다.
- 로그인/권한 기능을 완전히 재구현하지 않은 페이지는 배포 기본 상태를 공개/비로그인 기준으로 맞추고, 관리자 세션 흔적을 노출하지 않는다.
- 이 프로젝트는 정적 미러만이 아니라 운영 가능한 관리자 기능이 필요하다.
- 관리자 로그인 상태에서는 글쓰기, Cloudinary 이미지 업로드/삽입, 상품 가격/할인가/공개범위/품절 상태 변경이 가능해야 한다.
- 상품 공개 범위는 최소 `공개`, `링크로만 접근 가능`, `비공개` 를 지원한다.
- 댓글과 상품 후기는 가능한 한 꼼꼼하게 복제 대상으로 본다.
- 비공개 글/주소로만 접근 가능한 글도 복제 대상에 포함한다.
- 이미지 자산은 내려받아 Cloudinary에 올린 뒤 새 사이트에서 사용한다.
- 장바구니/결제 흐름은 실제 운영 가능한 수준으로 보존한다.
- 디자인은 `/home/vboxuser/web_clone` 에서 확정한 톤을 기본 스켈레톤으로 사용한다.

## Crawl Discipline

- `aloha-yt.xyz` 는 짧은 시간에 많은 글을 열면 IP 차단 경고가 있으므로, 수집은 반드시 느리고 순차적으로 진행한다.
- 글/페이지/상품 수집은 동시 다발 접근을 피하고, 번호형 글은 높은 번호에서 낮은 번호로 하나씩 내려가며 확인한다.
- BrowserOS 탐색도 한 번에 탭을 과도하게 열지 않는다.

## GitHub

- GitHub 원격 저장소는 새로 생성하는 aloha 전용 저장소를 사용한다.
- PAT token 로컬 파일 경로: `/home/vboxuser/aloha_clone/.local/github_pat.txt`
- PAT는 내부적 인트라넷 용도로 계속 재사용한다.
- PAT 값 자체를 문서에 다시 적지 말고, 로컬 파일에서 읽어 사용한다.
- PAT 보관 파일과 기타 로컬 비밀 파일은 반드시 gitignore 대상이어야 한다.

## Memory

- memory 루트는 `/home/vboxuser/aloha_clone/memory` 로 고정한다.
- Serena memory 저장 경로는 `/home/vboxuser/aloha_clone/memory/serena` 로 고정한다.
- 항상 작업 마지막에 Serena memory를 업데이트한다.
- Serena memory 파일명은 `키워드__YYYY-MM-DD-HHmm__상태.md` 형식을 따른다.
- 키워드는 소문자, 숫자, 하이픈만 사용하고 여러 키워드는 `+` 로 연결한다.
- 상태는 `plan`, `wip`, `passed`, `failed`, `blocked`, `rolledback`, `mixed`, `skipped` 중 하나만 사용한다.
- Serena memory는 300토큰 이내 초압축 형식으로만 기록한다.
- Serena memory에는 아래만 기록한다.
- 작업 일시
- 작업 배경 및 목표
- 수정된 파일 목록(절대경로)
- 주요 변경 사항 상세 설명
- 검증 결과(로그, 테스트 결과)
- 참조 문서/memory
- 다음 단계 또는 known issues
