// snsogg 렌더러: 카드 정보(JSON) → OG 썸네일 PNG(1200×630)
//   node render.mjs card.json [출력.png]          ← card.json 이 배열이면 여러 장 (각 항목에 out 지정)
//   node render.mjs --layout article --brand 핀다AI --badge 사주 --title "제목" --excerpt "본문 발췌" --out og.png
// 처음 한 번: 이 폴더에서 npm install
import fs from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse, GoogleFont } from '@cf-wasm/og/node';
import { cardTree, cardText } from './og-card.mjs';

export async function renderCard(card) {
  const tree = cardTree(card), text = cardText(tree);
  const font = card.font || 'Noto Sans KR';
  const res = await ImageResponse.async(tree, { width: 1200, height: 630, emoji: 'twemoji',
    fonts: [new GoogleFont(font, { name: 'Noto Sans KR', weight: 400, text }), new GoogleFont(font, { name: 'Noto Sans KR', weight: 700, text })] });
  return Buffer.from(await res.arrayBuffer());
}

const args = process.argv.slice(2);
if (args.length) {
  let cards;
  if (args[0].startsWith('--')) {
    const o = {};
    for (let i = 0; i < args.length; i += 2) o[args[i].replace(/^--/, '')] = args[i + 1];
    cards = [o];
  } else {
    const data = JSON.parse(await fs.readFile(args[0], 'utf8'));
    cards = Array.isArray(data) ? data : [{ ...data, out: data.out || args[1] }];
  }
  for (const [i, c] of cards.entries()) {
    const out = path.resolve(c.out || `og-${i + 1}.png`);
    await fs.writeFile(out, await renderCard(c));
    console.log('생성:', out);
  }
}
