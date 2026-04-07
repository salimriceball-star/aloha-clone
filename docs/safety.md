# Safety

## Rule

- 시스템 리소스를 많이 사용할 수 있는 작업은 반드시 가드 하에서 실행한다.
- 브라우저 프로필, `node_modules`, 빌드 산출물, 로그, 메모리 기록 디렉터리를 대규모 스캔 대상으로 포함하지 않는다.

## Guard Script

- wrapper: `/home/vboxuser/aloha_clone/scripts/run-guarded.sh`

기본 동작:

- 자식 프로세스 트리 RSS 합계를 주기적으로 측정
- 가용 메모리가 바닥값 이하로 내려가면 강제 종료
- 프로세스 트리 RSS가 상한값을 넘으면 강제 종료
- 로그를 `/home/vboxuser/aloha_clone/logs/guard-*.log` 에 남김

## Default Thresholds

- `MAX_TREE_RSS_MB=1400`
- `MIN_AVAILABLE_MB=700`
- `POLL_INTERVAL_SEC=2`

## Usage

```bash
/home/vboxuser/aloha_clone/scripts/run-guarded.sh npm run build
```

조정 예시:

```bash
MAX_TREE_RSS_MB=1800 MIN_AVAILABLE_MB=800 /home/vboxuser/aloha_clone/scripts/run-guarded.sh npm install
```

## Aloha Build Calibration

- `next build` 는 큰 동적 라우트의 `generateStaticParams` 제거 후에도 피크 RSS가 약 `1.41~1.50GB` 까지 올라갈 수 있다.
- BrowserOS와 오래된 preview 서버가 떠 있으면 시스템 여유 메모리가 크게 줄어든다.
- build 검증 전에는 가능하면 기존 `next-server` 와 BrowserOS를 잠시 내려 메모리를 회수한 뒤 진행한다.
- 현재 검증 통과 기준: `MAX_TREE_RSS_MB=1500 MIN_AVAILABLE_MB=700 ./scripts/run-guarded.sh npm run build`

## Recommended Targets

- `npm install`
- `npm run build`
- `npm run lint`
- 대량 크롤링
- 대량 이미지 다운로드/변환/업로드
- DB export/import
