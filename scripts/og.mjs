// 스토어별 SNS 공유 썸네일(OG 1200×630) → dist/og/*.png  (snsogg 스킬 렌더러 사용)
// usage: node scripts/og.mjs   (build.mjs 이후)
import { readFile, writeFile, mkdir } from "node:fs/promises";
const { renderCard } = await import("../og/render.mjs");
const stores = JSON.parse(await readFile("dist/stores.json", "utf8"));
const month = `${new Date().getMonth() + 1}월`;
await mkdir("dist/og", { recursive: true });
const cards = [{ out: "home", badge: `${month} 총정리`, hook: `아고다·트립닷컴·쿠팡·알리 ${stores.length}개 스토어 할인코드, 복사 한 번에 바로 적용`, excerpt: "지금 쓸 수 있는 쿠폰코드와 카드 프로모션만 모았어요. 앱 전용·신규회원·USD 결제 조건까지 정리." , cta: "쿠폰 전부 보기 →" },
  ...stores.map((s) => ({ out: s.slug, badge: `${s.name} ${month} 쿠폰`, hook: `${s.name} 할인코드 ${s.count}개${s.best ? `, 최대 ${s.best}% 할인` : ""}`, excerpt: `쿠폰코드 ${s.codes}개와 카드·간편결제 프로모션. 코드 복사 후 바로 ${s.name}로 이동해 적용하세요.`, cta: `${s.name} 코드 복사하기 →` }))];
for (const c of cards) {
  const png = await renderCard({ layout: "article", brand: "쿠폰핀다", footerText: "coupon.pinda.kr", ...c });
  await writeFile(`dist/og/${c.out}.png`, png);
  console.log("og:", c.out, png.length);
}
