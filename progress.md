# Progress

현재 milestone: cloudinary env import + incremental backup

- [x] Markdown 키를 `.local/cloudinary.env`로 변환하는 보안 스크립트 구현
- [x] Windows 경로 변환, 값 비출력, 원자 저장, mode 600 검증
- [ ] 원본 Markdown 접근 (blocked: 이 호스트에 `/mnt/c` 미마운트, 보조 디스크에도 파일 없음)
- [ ] Cloudinary 신규 자산 증분 백업 및 manifest 검증
- [x] 문서·memory·commit·push 마감
