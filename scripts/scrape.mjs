// Scrapes every dealstore page of 쿠폰의달인 into data/source.json
// usage: node scripts/scrape.mjs
import { writeFile, mkdir } from "node:fs/promises";

const BASE = "https://xn--bk1b700b1cz40buif.com";
const stores = await (await fetch(`${BASE}/wp-json/wp/v2/dealstore?per_page=100`)).json();

const strip = (h) =>
  h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/&#8211;/g, "–").replace(/\s+/g, " ").trim();
const pick = (html, re) => (html.match(re) || [, ""])[1];

const out = [];
for (const s of stores) {
  const html = await (await fetch(`${BASE}/dealstore/${s.slug}/`)).text();
  const cards = html.split('<div class="rh_offer_list').slice(1);
  const items = cards.map((c) => {
    const notes = [...c.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => strip(m[1])).filter(Boolean);
    return {
      type: strip(pick(c, /deal_string[^>]*>([^<]*)</)) || "Deal",
      badge: strip(pick(c, /verifymeta[^>]*>([\s\S]*?)<\/span>/)),
      title: strip(pick(c, /<h2[^>]*>([\s\S]*?)<\/h2>/)),
      notice: strip(pick(c, /rh_custom_notice[^>]*>([\s\S]*?)<\/div>/)),
      desc: strip(pick(c, /rh_gr_middle_desc[^>]*>([\s\S]*?)<\/div>/)),
      code: pick(c, /data-clipboard-text="([^"]*)"/),
      link: pick(c, /btn_offer_block re_track_btn" target="_blank"[^>]*href="([^"]+)"/) || pick(c, /href="([^"]+)" class="btn_offer_block/),
      expired: /expired|rh_expired/.test(c.slice(0, 400)),
      notes,
    };
  });
  const title = strip(pick(html, /<title>([^<]*)<\/title>/)).replace(/\s*\|.*$/, "");
  const intro = strip(pick(html, /<meta name="description" content="([^"]*)"/));
  out.push({ slug: s.slug, name: s.name, title, intro, count: items.length, items });
  console.log(s.slug, items.length);
}
await mkdir("data", { recursive: true });
await writeFile("data/source.json", JSON.stringify(out, null, 2), "utf8");
if (!out.some((s) => s.items.some((i) => i.code))) throw new Error("no coupon codes parsed");
