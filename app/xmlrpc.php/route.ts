// 워드프레스 XML-RPC 엔드포인트를 찾는 봇 프로브를 데이터 레이어 진입 전에
// 410으로 조기 차단하고 엣지 캐시를 태운다.
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
