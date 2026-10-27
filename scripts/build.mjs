// data/source.json + data/links.json → dist/ (정적 사이트)
// usage: node scripts/build.mjs
import { readFile, writeFile, mkdir, rm, cp } from "node:fs/promises";

const SITE = "https://coupon.pinda.kr";
const BRAND = "쿠폰핀다";
const TAGLINE = "할인쿠폰 프로모션코드";
const src = JSON.parse(await readFile("data/source.json", "utf8"));
const links = JSON.parse((await readFile("data/links.json", "utf8")).replace(/^﻿/, "")); // PowerShell이 BOM을 붙일 수 있음

// 스토어 표시 정보 (카테고리·색·아이콘)
const META = {
  agoda: ["아고다", "travel", "#e0263b", "🏨"], tripcom: ["트립닷컴", "travel", "#1a73e8", "✈️"],
  myrealtrip: ["마이리얼트립", "travel", "#5a7bff", "🧳"], hotelscom: ["호텔스닷컴", "travel", "#d32f2f", "🛎️"],
  usimsa: ["유심사", "travel", "#ff7a00", "📶"], kkday: ["KKday", "travel", "#2fb5a0", "🎟️"],
  klook: ["클룩", "travel", "#ff5722", "🎢"], expedia: ["익스피디아", "travel", "#f9c32e", "🌍"],
  yanolja: ["NOL(야놀자)", "travel", "#ff3478", "🏖️"], hotelscombined: ["호텔스컴바인", "travel", "#6b4fe0", "🔍"],
  triple: ["트리플", "travel", "#1b9cfc", "📍"], airalo: ["에어알로", "travel", "#6a5acd", "🌐"],
  skyscanner: ["스카이스캐너", "travel", "#0770e3", "🛫"], nolinterparktour: ["NOL 인터파크투어", "travel", "#e83e8c", "🗺️"],
  rakuten: ["라쿠텐 트래블", "japan", "#bf0000", "🗾"],
  aliexpress: ["알리익스프레스", "shop", "#e62e04", "📦"], coupang: ["쿠팡", "shop", "#e43c2e", "🚚"],
  temu: ["테무", "shop", "#f26c1b", "🛍️"], gmarket: ["G마켓", "shop", "#2ca12c", "🛒"],
  zigzag: ["지그재그", "shop", "#ff2e6a", "👗"], iherb: ["아이허브", "shop", "#4b9c3e", "🌿"],
  shein: ["쉬인", "shop", "#222222", "👚"], farfetch: ["파페치", "shop", "#111111", "👜"],
};
const CATS = { travel: "✈️ 여행", shop: "🛍️ 쇼핑", japan: "🗾 일본여행" };

const esc = (s = "") => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const rebrand = (s = "") => s.replace(/쿠폰의\s?달인|쿠달/g, BRAND);
const monthKR = `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`;

// "예약 기간: ~ 2026년 10월 31일" → 2026-10-31
function expiry(notes) {
  for (const n of notes) {
    if (!/기간|유효|까지/.test(n) || /숙박|투숙/.test(n)) continue;
    // "2026년 10월 1일 ~ 10월 31일"처럼 뒤 날짜에 연도가 없으면 앞 날짜의 연도를 씀
    const ms = [...n.matchAll(/(?:(\d{4})[년.]\s*)?(\d{1,2})[월.]\s*(\d{1,2})일?/g)];
    const m = ms.pop();
    const y = m && (m[1] || ms.map((x) => x[1]).filter(Boolean).pop());
    if (m && y) return `${y}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  }
  return "";
}
const pct = (t) => (t.match(/(\d+)\s*%/) || [, ""])[1];

const extra = JSON.parse((await readFile("data/extra.json", "utf8")).replace(/^﻿/, ""));
// 원본 사이트의 자기 제휴링크 경유 전용 코드 — 우리 링크로는 적용 안 됨
const EXCLUDE = new Set(["COUDAL", "LPAGDKR10", "LINKPR26087K", "즐거운대만호텔"]);

const stores = src.filter((s) => META[s.slug]).map((s) => {
  const [name, cat, color, icon] = META[s.slug];
  const l = links[s.slug] || {};
  const go = l.url || l.official;
  const items = [...(extra[s.slug] || []).map((i) => ({ expired: false, ...i, link: i.link || go })), ...s.items.filter((i) => !EXCLUDE.has(i.code))].map((i) => ({ ...i, title: rebrand(i.title), badge: rebrand(i.badge), notice: rebrand(i.notice), desc: rebrand(i.desc), notes: i.notes.map(rebrand), link: go, expiry: expiry(i.notes), pct: pct(i.title) }));
  const best = Math.max(0, ...items.map((i) => +i.pct || 0));
  return { slug: s.slug, name, cat, color, icon, go, affiliate: !!l.url, items, best, codes: items.filter((i) => i.code).length, title: rebrand(s.title), intro: rebrand(s.intro) };
});
const order = ["travel", "shop", "japan"];
stores.sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat) || b.items.length - a.items.length);

const css = await readFile("src/style.css", "utf8");
const js = await readFile("src/app.js", "utf8");

const layout = ({ title, desc, path, og, body, jsonld }) => `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title><meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${SITE}${path}"><meta name="theme-color" content="#ff6b35">
<meta property="og:type" content="website"><meta property="og:site_name" content="${BRAND}"><meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/og/${og}.png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${css}</style>${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld)}</script>` : ""}</head>
<body>
<header class="top"><a class="logo" href="/"><span class="logo-mark">🎫</span><b>${BRAND}</b><small>${TAGLINE}</small></a><button class="theme" id="theme" aria-label="다크모드 전환">🌓</button></header>
<main>${body}</main>
<footer><p><b>${BRAND}</b> · 매월 1일 할인코드 업데이트 · 최종 확인 ${monthKR}</p><p>이 사이트의 일부 링크는 제휴 링크이며, 구매·예약 시 운영자에게 수수료가 지급될 수 있습니다. 쿠폰 조건은 각 스토어 정책에 따라 예고 없이 변경될 수 있습니다.</p><p><a href="/">홈</a> · <a href="https://pinda.kr">핀다AI</a></p></footer>
<div class="toast" id="toast" role="status"></div>
<script>${js}</script></body></html>`;

const storeCard = (s) => `<a class="store" href="/${s.slug}/" style="--c:${s.color}"><span class="ic">${s.icon}</span><span class="nm">${esc(s.name)}</span><span class="cnt">${s.items.length}개 혜택${s.best ? ` · 최대 ${s.best}%` : ""}</span></a>`;

const coupon = (s, i, idx) => `<article class="cp${i.expired ? " expired" : ""}" data-type="${i.code ? "code" : "deal"}" data-q="${esc((i.title + " " + i.notice + " " + i.code).toLowerCase())}">
<div class="cp-head"><span class="pill ${i.code ? "pill-code" : "pill-deal"}">${i.code ? "쿠폰코드" : "프로모션"}</span>${i.badge ? `<span class="badge">${esc(i.badge)}</span>` : ""}${i.expiry ? `<time class="exp" datetime="${i.expiry}">~${i.expiry.slice(5).replace("-", ".")}</time>` : ""}</div>
<h3>${esc(i.title)}</h3>${i.notice ? `<p class="notice">${esc(i.notice)}</p>` : ""}
<div class="act">${i.code ? `<button class="code" data-code="${esc(i.code)}" data-go="${esc(i.link)}" aria-label="할인코드 ${esc(i.code)} 복사"><span class="code-txt">${esc(i.code)}</span><span class="code-cta">복사 후 이동</span></button>` : ""}<a class="go" href="${esc(i.link)}" target="_blank" rel="nofollow sponsored noopener">${i.code ? "스토어 바로가기" : "프로모션 확인"} →</a></div>
${i.desc ? `<p class="how">💡 ${esc(i.desc)}</p>` : ""}
${i.notes.length ? `<details><summary>상세 조건 보기</summary><ul>${i.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></details>` : ""}
</article>`;

await rm("dist", { recursive: true, force: true });
await mkdir("dist/og", { recursive: true });
await cp("public", "dist", { recursive: true });

// 홈
const hot = stores.flatMap((s) => s.items.filter((i) => i.code && !i.expired).slice(0, 1).map((i) => ({ s, i }))).slice(0, 8);
const homeBody = `<section class="hero"><h1>${monthKR} 할인쿠폰 · 프로모션코드<br><span>한 곳에서 복사하고 바로 쓰세요</span></h1>
<p>아고다·트립닷컴·클룩부터 쿠팡·알리까지, 지금 쓸 수 있는 코드만 모았어요. 코드를 누르면 복사되고 스토어가 열립니다.</p>
<label class="search"><span>🔍</span><input id="q" type="search" placeholder="스토어나 쿠폰 검색 (예: 아고다, 신규)" autocomplete="off"></label></section>
<nav class="cats" aria-label="카테고리">${Object.entries(CATS).map(([k, v]) => `<a href="#${k}">${v}</a>`).join("")}</nav>
${order.map((c) => `<section id="${c}" class="cat"><h2>${CATS[c]} <small>${stores.filter((s) => s.cat === c).reduce((n, s) => n + s.items.length, 0)}개 혜택</small></h2><div class="grid">${stores.filter((s) => s.cat === c).map(storeCard).join("")}</div></section>`).join("")}
<section class="cat"><h2>🔥 지금 바로 쓰는 코드</h2><div class="list">${hot.map(({ s, i }) => coupon(s, i)).join("")}</div></section>
<section class="faq"><h2>자주 묻는 질문</h2><details><summary>쿠폰코드는 어떻게 쓰나요?</summary><p>코드 버튼을 누르면 자동 복사되고 스토어가 새 창으로 열립니다. 결제 단계의 '쿠폰/프로모션 코드' 칸에 붙여넣으세요.</p></details><details><summary>코드가 적용되지 않아요.</summary><p>앱에서는 안 되고 웹에서만 되는 코드, 신규회원 전용 코드, 결제통화(USD) 조건이 있는 코드가 많습니다. 각 쿠폰의 '상세 조건 보기'를 확인하세요.</p></details><details><summary>얼마나 자주 업데이트되나요?</summary><p>매월 1일 전체 코드를 재확인하고, 종료된 코드는 '만료' 표시로 바꿉니다.</p></details></section>`;
await writeFile("dist/index.html", layout({ title: `${BRAND}: ${TAGLINE} ${monthKR} 총정리`, desc: `아고다, 트립닷컴, 클룩, 쿠팡, 알리익스프레스 등 ${stores.length}개 스토어의 ${monthKR} 할인쿠폰·프로모션코드를 한 곳에서. 복사 한 번으로 바로 적용하세요.`, path: "/", og: "home", body: homeBody, jsonld: { "@context": "https://schema.org", "@type": "WebSite", name: BRAND, url: SITE } }));

// 스토어 페이지
for (const s of stores) {
  const others = stores.filter((o) => o.cat === s.cat && o.slug !== s.slug);
  const body = `<nav class="crumb"><a href="/">홈</a> › <a href="/#${s.cat}">${CATS[s.cat]}</a> › ${esc(s.name)}</nav>
<section class="shead" style="--c:${s.color}"><span class="ic">${s.icon}</span><div><h1>${esc(s.name)} ${monthKR} 할인코드 · 쿠폰</h1><p>${esc(s.intro)}</p><p class="stat">${s.items.length}개 혜택 · 쿠폰코드 ${s.codes}개${s.best ? ` · 최대 ${s.best}% 할인` : ""}</p></div><a class="go big" href="${esc(s.go)}" target="_blank" rel="nofollow sponsored noopener">${esc(s.name)} 바로가기 →</a></section>
<div class="filters" role="tablist"><button class="on" data-f="all">전체</button><button data-f="code">쿠폰코드</button><button data-f="deal">프로모션</button></div>
<div class="list" id="list">${s.items.map((i, k) => coupon(s, i, k)).join("")}</div>
${others.length ? `<section class="cat"><h2>같은 카테고리 다른 스토어</h2><div class="grid">${others.map(storeCard).join("")}</div></section>` : ""}`;
  await mkdir(`dist/${s.slug}`, { recursive: true });
  await writeFile(`dist/${s.slug}/index.html`, layout({ title: `${esc(s.name)} ${monthKR} 할인코드·쿠폰 ${s.items.length}개 | ${BRAND}`, desc: s.intro || `${s.name} ${monthKR} 할인쿠폰, 프로모션코드 총정리`, path: `/${s.slug}/`, og: s.slug, body, jsonld: { "@context": "https://schema.org", "@type": "ItemList", name: `${s.name} 할인코드`, numberOfItems: s.items.length, itemListElement: s.items.map((i, k) => ({ "@type": "ListItem", position: k + 1, name: i.title })) } }));
}
await writeFile("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/</loc></url>${stores.map((s) => `<url><loc>${SITE}/${s.slug}/</loc></url>`).join("")}</urlset>`);
await writeFile("dist/robots.txt", `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
await writeFile("dist/stores.json", JSON.stringify(stores.map(({ items, ...s }) => ({ ...s, count: items.length }))));

const missing = stores.filter((s) => !s.affiliate).map((s) => s.slug);
console.log(`built ${stores.length} stores, ${stores.reduce((n, s) => n + s.items.length, 0)} coupons`);
if (missing.length) console.log("제휴링크 미등록(공식 사이트로 연결):", missing.join(", "));
