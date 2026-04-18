import type { Context } from "@netlify/edge-functions";

export default async function handler(req: Request, context: Context) {
  const country = context.geo?.country?.code ?? "XX";
  const response = await context.next();

  // 한국 유저에게 CDN 엣지 캐싱 적용 (도쿄 노드 경유)
  if (country === "KR") {
    response.headers.set("x-region", "KR");
    // 정적 자산이 아닌 페이지에는 stale-while-revalidate 전략
    const isStaticAsset = /\.(js|css|png|jpg|webp|avif|svg|ico|woff2?)(\?|$)/.test(req.url);
    if (!isStaticAsset) {
      response.headers.set(
        "Cache-Control",
        "public, max-age=0, s-maxage=60, stale-while-revalidate=300"
      );
    }
  }

  return response;
}

export const config = { path: "/*" };
