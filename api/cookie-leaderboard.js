// api/cookie-leaderboard.js
// Vercel Serverless Function

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

    const upstreamRes = await fetch(cookieUrl, {
      headers: {
        accept: "application/json"
      }
    });

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      return res.status(502).json({
        error: "Upstream Cookie API error",
        status: upstreamRes.status,
        body: text
      });
    }

    const data = await upstreamRes.json();

    // 지금은 그냥 프록시: raw 통째로 넘기고,
    // 나중에 여기에 "특정 handle의 프로젝트별 순위만 추출" 로직 붙일 수 있음.
    return res.status(200).json({
      ok: true,
      requestedHandle: handle || null,
      raw: data
    });
  } catch (err) {
    console.error("cookie-leaderboard error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err?.message || "unknown error"
    });
  }
}
