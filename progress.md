# Progress

현재 milestone: zero-context frontend design review packet

- [x] 공개·관리자 화면 범위와 디자인 관련 코드 의존성 인벤토리 작성
- [x] 제로 컨텍스트 리뷰 목표·제약·평가 질문 작성
- [x] 관련 소스 원문과 데이터 샘플을 단일 문서로 concat
- [x] 문서 생성 재현 스크립트와 누락/비밀값 검사
- [x] memory·commit·push

이전 milestone: unified post/page admin catalog

- [x] 관리자 0건 원인 확인: 정적 WordPress export와 Supabase 관리자 테이블 분리
- [x] `clone_posts`에 글/페이지 유형과 원본 ID 추적 스키마 추가
- [x] 기존 글·페이지·홈을 수정값 비파괴 방식으로 관리자 DB에 자동 편입
- [x] 관리자 목록을 상품 제외 글·페이지 통합 카탈로그로 전환
- [x] 공개 홈·페이지·검색·sitemap 관리자 변경 반영 구현
- [x] TypeScript·lint·Production형 build 검증
- [ ] 배포 후 Supabase 자동 편입·관리자/공개 runtime QA
- [ ] memory·commit·push

- [x] metadata·sitemap·robots·redirect·구조화 데이터 감사
- [x] canonical 운영 도메인 자동 해석과 관리자 상태 표시
- [x] sitemap lastModified·WordPress sitemap redirect·robots 보강
- [x] Organization·Article·Product JSON-LD와 private noindex 적용
- [x] 주문 조회 key 강제·보안 응답 헤더 적용
- [x] SEO 자동 감사 스크립트와 cutover 운영 문서
- [x] RSS feed·Vercel build·Dependabot 운영 안전망
- [x] 의존성 호환 보안 패치와 잔여 공지 위험 기록
- [x] lint/build/local production QA
- [x] memory·commit·push 마감
- [x] 현재 apex·www·CAA·AAAA·MX·TXT·TLS 기준점 점검
- [x] SSH와 TLS 역할 및 Vercel 자동 인증서 조건 문서화
- [x] 환경변수→도메인 등록→DNS→TLS→SEO 순차 실행서
- [x] 메일 DNS 보존·장애 진단·롤백·백업·모니터링 절차
- [x] docs 검증·memory·commit·push
- [x] Production env 중복 처리·비밀값 보존·재배포 스크립트
- [x] Supabase 비공개 URL backup·checksum 스크립트
- [x] baseline·www canary·production·diagnose 자동 판정
- [x] 전체 15단계 Namecheap/Vercel/Search Console 복붙 런북
- [x] lint·shell/docs QA·memory·commit·push
- [x] Vercel 실제 www A-record 권고 대응과 canary A/CNAME 호환
- [x] canary patch QA·memory·commit·push
- [x] verify 전용 CNAME 우선·TLS 미발급 진단 반영
- [x] verify-CNAME patch QA·memory·commit·push
- [x] apex 최신 rank-1 이중 A 권고와 롤백 반영
- [x] apex dual-A patch QA·memory·commit·push
