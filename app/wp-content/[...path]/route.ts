// 워드프레스 취약점 스캐너가 즐겨 찌르는 경로. 캐치올 페이지(app/[...slug])보다
// 이 정적 세그먼트가 라우팅 우선순위가 높으므로, 데이터 레이어를 전혀 타지 않고
// 즉시 410을 반환한다. Cache-Control로 엣지에 캐시시켜 반복 봇 히트가 함수를
// 다시 부르지 않도록 한다.
function goneResponse(): Response {
  return new Response("Gone", {
    status: 410,
    headers: {
      "Cache-Control": "public, s-maxage=86400, max-age=3600"
    }
  });
}

export async function GET(): Promise<Response> {
  return goneResponse();
}

export async function HEAD(): Promise<Response> {
  return goneResponse();
}
