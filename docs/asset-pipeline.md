# Asset Pipeline

## Goal

- `aloha-yt.xyz` 의 공개 글/페이지/상품 및 보호글 이미지 자산을 Cloudinary로 재호스팅한다.
- WordPress가 생성한 `-300x...`, `-768x...` 썸네일 변형은 원본 단위로 정규화해 업로드 수를 줄인다.
- 런타임 HTML은 Cloudinary manifest를 우선 사용해 source 이미지 의존을 줄인다.

## Data Paths

- raw 다운로드 경로: `/home/vboxuser/aloha_clone/data/assets/raw`
- Cloudinary manifest: `/home/vboxuser/aloha_clone/data/assets/manifest.json`
- 실행 스크립트: `/home/vboxuser/aloha_clone/scripts/sync-assets.ts`

## Current Scope

- public posts/pages/products HTML
- product schema image
- admin export protected/admin-only posts HTML

## Current State

- 2026-07-14 증분 동기화 완료: Cloudinary 자산 `1107` → `1188` (`81`개 추가)
- 기존 외부 404 skip `2`건 유지, 신규 실패 `0`건
- 신규 자산은 모두 `res.cloudinary.com` 응답 200, 로컬 원본/public ID/바이트 기록 검증 완료
- 동일 명령 재실행 시 추가 업로드 없이 총계 `1188` 유지

## Runtime Wiring

- `/home/vboxuser/aloha_clone/lib/asset-utils.ts`
- `/home/vboxuser/aloha_clone/lib/asset-map.ts`
- `/home/vboxuser/aloha_clone/lib/site-data.ts`

## Notes

- 업로드 호스트 alias는 모두 `https://aloha-yt.xyz/wp-content/uploads/...` 로 정규화한다.
- srcset variant URL도 동일 Cloudinary 원본으로 매핑 가능하도록 manifest variant alias를 함께 저장한다.
- raw 다운로드 파일은 로컬 검증용이므로 gitignore 대상이다.
