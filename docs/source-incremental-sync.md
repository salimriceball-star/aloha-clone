# Source Incremental Sync

## 2026-07-14 Scope

- 변경 대상: `caution`, `appeal`, `terms`
- 숫자 상품: `209`부터 `227`까지 1씩 증가하며 순차 확인
- 존재 상품 18건 병합, `222`는 원본 WordPress API에도 없음
- 공개 상품 178 → 196, 원본 상점 노출 38 → 39
- 원본 상점에서 새 범위 중 목록 노출 상품은 `210`; 나머지는 direct-only로 유지

## Command

```bash
PRODUCT_FROM_SLUG=209 PRODUCT_TO_SLUG=227 npm run sync:incremental:guarded
```

- 기본 요청 간격 1200ms, `REQUEST_DELAY_MS`로 조정
- 고정 대상, 숫자 범위, 상품 상세 schema/가격/리뷰, 상점 가시성, 보호된 caution 본문을 순차 수집
- 결과와 누락 번호는 `data/public-wp-export/manifest.json`의 `incrementalSync`에 기록
- caution 비밀번호는 기존 보호글 export에서 읽으며 필요할 때만 `CAUTION_PASSWORD`로 명시적 재정의

## Assets

- 새/변경 상품에서 발견된 미등록 정규화 이미지 `81`개를 2026-07-14 Cloudinary에 증분 업로드 완료
- manifest 총계 `1107` → `1188`, 기존 외부 404 skip `2`건 유지, 신규 실패 없음
- 런타임은 갱신된 manifest의 Cloudinary URL을 우선 사용하며 미등록 자산만 원본 HTTPS로 폴백
- `npm run sync:assets:guarded` 재실행 결과 추가 업로드 없이 총계 `1188` 유지

### Import Cloudinary Markdown

```bash
npm run import:cloudinary-env -- --source '/path/to/cloudinary-keys.md'
```

- Windows `C:\...` 인수는 `/mnt/c/...`로 변환한다. 해당 드라이브가 실제 마운트돼 있어야 한다.
- `CLOUDINARY_URL` 또는 cloud name/API key/API secret 레이블을 Markdown·표·코드 형식에서 추출한다.
- 값은 로그에 출력하지 않고 `/home/ahn/aloha/.local/cloudinary.env`에 원자 저장하며 권한을 `600`으로 고정한다.
