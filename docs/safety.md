# Safety

## Rule

- 시스템 리소스를 많이 사용할 수 있는 작업은 반드시 가드 하에서 실행한다.
- 브라우저 프로필, `node_modules`, 빌드 산출물, 로그, 메모리 기록 디렉터리를 대규모 스캔 대상으로 포함하지 않는다.

## Guard Script

- wrapper: `/home/vboxuser/web_clone/scripts/run-guarded.sh`

기본 동작:

- 자식 프로세스 트리 RSS 합계를 주기적으로 측정
- 가용 메모리가 바닥값 이하로 내려가면 강제 종료
- 프로세스 트리 RSS가 상한값을 넘으면 강제 종료
- 로그를 `/home/vboxuser/web_clone/logs/guard-*.log` 에 남김

## Default Thresholds

- `MAX_TREE_RSS_MB=1400`
- `MIN_AVAILABLE_MB=700`
- `POLL_INTERVAL_SEC=2`

## Usage

```bash
/home/vboxuser/web_clone/scripts/run-guarded.sh npm run build
```

조정 예시:

```bash
MAX_TREE_RSS_MB=1800 MIN_AVAILABLE_MB=800 /home/vboxuser/web_clone/scripts/run-guarded.sh npm install
```

## Recommended Targets

- `npm install`
- `npm run build`
- `npm run lint`
- 대량 크롤링
- 대량 이미지 다운로드/변환/업로드
- DB export/import
