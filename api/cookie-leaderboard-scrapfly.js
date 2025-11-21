// api/cookie-leaderboard.js
// Vercel Serverless Function - Cookie.fun 프록시 (Scrapfly 사용 버전)

export default async function handler(req, res) {
  // CORS (프론트에서 직접 호출 가능하게)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const scrapflyKey = process.env.SCRAPFLY_KEY;
  if (!scrapflyKey) {
    return res.status(500).json({
      error: "SCRAPFLY_KEY env not set",
    });
  }

  try {
    const { handle } = req.query; // ?handle=bud_dha__ 대비

    // Cookie.fun leaderboard TRPC input payload
    const inputPayload = {
      json: {
        projectsFilter: {
          searchFilter: ""
        },
        orderColumn: "TwitterMindshare", // 정렬 기준
        orderDataPoint: "_24Hours"       // 24시간 기준
      }
    };

    const cookieUrl =
      "https://www.cookie.fun/api/trpc/cookieFun.leaderboard?input=" +
      encodeURIComponent(JSON.stringify(inputPayload));

    // 🔥 Scrapfly 웹스크래핑 API를 이용해서 Cloudflare 우회
    // - url: 우리가 진짜로 긁고 싶은 Cookie.fun API
    // - key: Scrapfly API 키 (SCRAPFLY_KEY 환경변수)
    // - proxified_response=true: 결과를 그대로 body 로 반환 (우리가 다시 JSON 파싱 가능)
    const scrapflyUrl =
      "https://api.scrapfly.io/scrape" +
      "?key=" + encodeURIComponent(scrapflyKey) +
      "&url=" + encodeURIComponent(cookieUrl) +
      "&proxified_response=true";

    const upstreamRes = await fetch(scrapflyUrl);

    const text = await upstreamRes.text();

    if (!upstreamRes.ok) {
      // Scrapfly 쪽 에러를 그대로 보여줌
      return res.status(upstreamRes.status).json({
        error: "Scrapfly error",
        status: upstreamRes.status,
        body: text,
      });
    }

    // Cookie.fun 쪽 응답은 JSON 문자열이므로, 한번 파싱해서 감싸서 리턴
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // 혹시 JSON이 아니면 raw로 반환
      return res.status(200).send(text);
    }

    return res.status(200).json({
      ok: true,
      requestedHandle: handle || null,
      raw: parsed,
    });
  } catch (err) {
    console.error("cookie-leaderboard error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err?.message || "unknown error"
    });
  }
}
