// api/cookie-leaderboard-browser.js
// Vercel Serverless Function + Puppeteer (헤드리스 크롬) 방식

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

export default async function handler(req, res) {
  // CORS 헤더 (프론트에서 직접 호출할 수 있게)
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  let browser;

  try {
    // 1) Cookie.fun leaderboard API용 payload
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

    // 2) 헤드리스 크롬 실행
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // 일반 브라우저처럼 보이도록 UA 설정
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
      "AppleWebKit/537.36 (KHTML, like Gecko) " +
      "Chrome/120.0.0.0 Safari/537.36"
    );

    // 3) 페이지 내부에서 fetch 로 Cookie.fun API 호출
    const rawText = await page.evaluate(async (url) => {
      const resp = await fetch(url, {
        method: "GET",
        headers: {
          "accept": "application/json, text/plain, */*"
        },
        credentials: "include"
      });
      return await resp.text();
    }, cookieUrl);

    // 4) JSON 파싱 시도
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (e) {
      // Cloudflare HTML 같은 게 오면 그대로 반환
      return res.status(200).send(rawText);
    }

    // ✨ 최종 응답
    return res.status(200).json({
      ok: true,
      raw: parsed
    });
  } catch (err) {
    console.error("cookie-leaderboard-browser error:", err);
    return res.status(500).json({
      error: "Internal Server Error",
      message: err?.message || "unknown error"
    });
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {
        // ignore
      }
    }
  }
}
