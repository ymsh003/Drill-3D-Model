import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts } from "@napi-rs/canvas";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const dataPath = path.join(projectRoot, "outputs", "layout-interaction-experiment-data.json");
const outputPath = path.join(projectRoot, "outputs", "drill-layout-three-factor-guide-a4.png");
const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

for (const [fontPath, family] of [
  ["C:/Windows/Fonts/meiryo.ttc", "Meiryo"],
  ["C:/Windows/Fonts/meiryob.ttc", "Meiryo Bold"],
  ["C:/Windows/Fonts/YuGothM.ttc", "Yu Gothic"]
]) {
  if (fs.existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, family);
}

const W = 2480;
const H = 3508;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext("2d");

const C = {
  paper: "#F4F7F5",
  ink: "#14252A",
  muted: "#51666C",
  teal: "#087F76",
  tealSoft: "#D9EFEB",
  orange: "#D96B2B",
  orangeSoft: "#F9E5D8",
  blue: "#2F6FA3",
  blueSoft: "#DDEAF5",
  purple: "#76518C",
  purpleSoft: "#E9E0EE",
  line: "#B9C9C7",
  white: "#FFFFFF",
  caution: "#FFF4CD"
};

ctx.fillStyle = C.paper;
ctx.fillRect(0, 0, W, H);

function font(size, bold = false) {
  ctx.font = `${bold ? "700" : "400"} ${size}px "${bold ? "Meiryo Bold" : "Meiryo"}", sans-serif`;
}

function text(value, x, y, size, color = C.ink, bold = false, align = "left") {
  font(size, bold);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(value, x, y);
}

function roundRect(x, y, w, h, radius, fill, stroke = null, lineWidth = 2) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function wrapLines(value, maxWidth, size, bold = false) {
  font(size, bold);
  const lines = [];
  let current = "";
  for (const character of [...value]) {
    const candidate = current + character;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function paragraph(value, x, y, maxWidth, size, color = C.ink, bold = false, lineGap = 1.45) {
  const lines = wrapLines(value, maxWidth, size, bold);
  lines.forEach((line, index) => text(line, x, y + index * size * lineGap, size, color, bold));
  return lines.length * size * lineGap;
}

function label(value, x, y, fill, color = C.ink) {
  font(30, true);
  const width = ctx.measureText(value).width + 34;
  roundRect(x, y, width, 56, 16, fill);
  text(value, x + 17, y + 9, 30, color, true);
  return width;
}

function sectionTitle(number, titleValue, y) {
  roundRect(112, y, 58, 58, 29, C.ink);
  text(String(number), 141, y + 7, 31, C.white, true, "center");
  text(titleValue, 194, y - 2, 50, C.ink, true);
}

function arrow(x1, y1, x2, y2, color = C.line, width = 8) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 24 * Math.cos(angle - Math.PI / 6), y2 - 24 * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - 24 * Math.cos(angle + Math.PI / 6), y2 - 24 * Math.sin(angle + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

// Header
ctx.fillStyle = C.ink;
ctx.fillRect(0, 0, W, 398);
label("初心者向け・静的レイアウト実験", 112, 72, C.teal, C.white);
text("3つの数字は、組み合わせて読む", 112, 150, 82, C.white, true);
text("ドリル角 × PIN–PAP × VAL角｜594条件を一次資料と照合", 112, 276, 35, "#C8D9D7", false);

sectionTitle(1, "まず覚えること", 455);

const cards = [
  { x: 112, color: C.orange, soft: C.orangeSoft, title: "ドリル角", big: "動き始める位置", body: "小さいほど手前寄り、大きいほど奥寄りになりやすい。" },
  { x: 906, color: C.teal, soft: C.tealSoft, title: "PIN–PAP", big: "フレア量の大枠", body: "3～4インチ付近で大きく、短すぎても長すぎても小さくなりやすい。" },
  { x: 1700, color: C.blue, soft: C.blueSoft, title: "VAL角", big: "切り替わりの長さ", body: "小さいほど速く鋭く、大きいほどゆっくり滑らかになりやすい。" }
];
for (const card of cards) {
  roundRect(card.x, 552, 668, 326, 30, C.white, C.line, 3);
  roundRect(card.x, 552, 18, 326, 9, card.color);
  text(card.title, card.x + 48, 588, 38, card.color, true);
  text(card.big, card.x + 48, 650, 45, C.ink, true);
  paragraph(card.body, card.x + 48, 728, 574, 31, C.muted, false, 1.55);
}

sectionTitle(2, "今回の計算で確認できたこと", 955);

// Chart: effective flare by PIN-PAP
roundRect(112, 1050, 1300, 885, 30, C.white, C.line, 3);
text("PIN–PAPと「配置で使えるフレア」", 164, 1096, 40, C.ink, true);
text("2つの角度条件を平均した比較値", 164, 1157, 29, C.muted, false);

const pinGroups = new Map();
for (const row of data.rows) {
  const group = pinGroups.get(row.pin_pap_in) || [];
  group.push(row.effective_flare_diff_in);
  pinGroups.set(row.pin_pap_in, group);
}
const pinSeries = [...pinGroups].sort((a, b) => a[0] - b[0]).map(([pin, values]) => ({
  pin: Number(pin),
  mean: values.reduce((a, b) => a + b, 0) / values.length
}));

const plot = { x: 244, y: 1260, w: 1080, h: 420 };
ctx.strokeStyle = C.line;
ctx.lineWidth = 3;
for (let tick = 0; tick <= 4; tick++) {
  const y = plot.y + plot.h - tick / 4 * plot.h;
  ctx.beginPath();
  ctx.moveTo(plot.x, y);
  ctx.lineTo(plot.x + plot.w, y);
  ctx.stroke();
  text((tick * 0.01).toFixed(2), plot.x - 28, y - 18, 25, C.muted, false, "right");
}
const xScale = (x) => plot.x + (x - 1) / 5 * plot.w;
const yScale = (y) => plot.y + plot.h - y / 0.04 * plot.h;
ctx.strokeStyle = C.teal;
ctx.lineWidth = 12;
ctx.lineJoin = "round";
ctx.beginPath();
pinSeries.forEach((point, index) => {
  const x = xScale(point.pin);
  const y = yScale(point.mean);
  if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
});
ctx.stroke();
for (const point of pinSeries) {
  const x = xScale(point.pin);
  const y = yScale(point.mean);
  ctx.beginPath();
  ctx.arc(x, y, point.pin === 3.5 ? 18 : 10, 0, Math.PI * 2);
  ctx.fillStyle = point.pin === 3.5 ? C.orange : C.teal;
  ctx.fill();
}
for (const tick of [1, 2, 3, 4, 5, 6]) {
  text(String(tick), xScale(tick), plot.y + plot.h + 20, 27, C.muted, false, "center");
}
text("PIN–PAP（インチ）", plot.x + plot.w / 2, plot.y + plot.h + 72, 29, C.ink, true, "center");
const peak = pinSeries.reduce((best, point) => point.mean > best.mean ? point : best, pinSeries[0]);
roundRect(xScale(peak.pin) - 166, yScale(peak.mean) - 112, 332, 76, 18, C.orangeSoft);
text(`平均最大 ${peak.pin.toFixed(1)}インチ`, xScale(peak.pin), yScale(peak.mean) - 96, 29, C.orange, true, "center");
paragraph("短い側と長い側でフレアが下がり、3～4インチ付近で山になる。メーカー資料の傾向と一致。", 164, 1820, 1150, 29, C.muted, false, 1.42);

// Importance bars
roundRect(1470, 1050, 898, 885, 30, C.white, C.line, 3);
text("何がフレアを左右したか", 1522, 1096, 40, C.ink, true);
text("今回の固定球・固定PAPでの割合", 1522, 1157, 29, C.muted, false);
const shares = data.analysis.effective_flare_diff_in.variance_share_pct;
const interactionShare = shares["drill_angle_deg*pin_pap_in"] + shares["drill_angle_deg*val_angle_deg"] + shares["pin_pap_in*val_angle_deg"] + shares.three_way;
const bars = [
  ["PIN–PAP", shares.pin_pap_in, C.teal],
  ["ドリル角", shares.drill_angle_deg, C.orange],
  ["VAL角", shares.val_angle_deg, C.blue],
  ["組み合わせ", interactionShare, C.purple]
];
bars.forEach(([name, value, color], index) => {
  const y = 1278 + index * 128;
  text(name, 1522, y, 31, C.ink, true);
  text(`${value.toFixed(1)}%`, 2306, y, 31, color, true, "right");
  roundRect(1522, y + 52, 784, 24, 12, "#E2EAE8");
  roundRect(1522, y + 52, Math.max(12, 784 * value / 100), 24, 12, color);
});
roundRect(1522, 1800, 794, 92, 22, C.caution);
paragraph("注意：完成球のフレア上限では、組み合わせの影響が19.7%。見る指標によって相互作用の大きさは変わる。", 1550, 1816, 738, 27, C.ink, true, 1.36);

sectionTitle(3, "3つを一緒に読む順番", 2020);

const flowY = 2126;
const flowCards = [
  { x: 112, w: 520, no: "1", title: "量の大枠", main: "PIN–PAPを見る", sub: "3～4インチで大きくなりやすい", color: C.teal, soft: C.tealSoft },
  { x: 724, w: 520, no: "2", title: "切り替わりの速さ", main: "2つの角度を足す", sub: "小さい合計＝速い／大きい＝遅い", color: C.orange, soft: C.orangeSoft },
  { x: 1336, w: 520, no: "3", title: "動きの形", main: "角度の大小を比べる", sub: "同じ合計でも形は変わる", color: C.blue, soft: C.blueSoft },
  { x: 1948, w: 420, no: "4", title: "完成球で確認", main: "3値を同時計算", sub: "穴の位置で重さが変わる", color: C.purple, soft: C.purpleSoft }
];
for (let index = 0; index < flowCards.length; index++) {
  const item = flowCards[index];
  roundRect(item.x, flowY, item.w, 316, 28, C.white, C.line, 3);
  roundRect(item.x + 30, flowY + 30, 66, 66, 33, item.color);
  text(item.no, item.x + 63, flowY + 40, 32, C.white, true, "center");
  text(item.title, item.x + 116, flowY + 34, 29, item.color, true);
  paragraph(item.main, item.x + 34, flowY + 126, item.w - 68, 37, C.ink, true, 1.25);
  paragraph(item.sub, item.x + 34, flowY + 208, item.w - 68, 27, C.muted, false, 1.42);
  if (index < flowCards.length - 1) arrow(item.x + item.w + 14, flowY + 158, flowCards[index + 1].x - 14, flowY + 158, C.line, 7);
}

// Angle relationship examples
roundRect(112, 2494, 2256, 456, 30, C.ink);
text("同じ合計100°でも、形は同じではない", 164, 2540, 42, C.white, true);
roundRect(164, 2628, 1004, 244, 24, "#243A3F");
label("30° + 70°", 204, 2662, C.orange, C.white);
text("ドリル角が小さい", 204, 2742, 32, C.white, true);
text("→ 手前寄りで、厚い動きになりやすい", 204, 2796, 30, "#DDE9E7", false);
roundRect(1212, 2628, 1104, 244, 24, "#243A3F");
label("70° + 30°", 1252, 2662, C.blue, C.white);
text("ドリル角が大きい", 1252, 2742, 32, C.white, true);
text("→ 奥寄りで、鋭い動きになりやすい", 1252, 2796, 30, "#DDE9E7", false);

sectionTitle(4, "この資料で言えること／まだ言えないこと", 3015);

roundRect(112, 3110, 1084, 252, 28, C.tealSoft);
text("言えること", 158, 3144, 35, C.teal, true);
paragraph("穴あけ後のRG、フレア上限、PAP軸との向きから見たフレアの使われやすさ。", 158, 3204, 990, 29, C.ink, false, 1.47);

roundRect(1284, 3110, 1084, 252, 28, C.orangeSoft);
text("まだ言えないこと", 1330, 3144, 35, C.orange, true);
paragraph("何枚曲がるか、何フィートで曲がるか。油・表面・速度・投球差を含むレーン実験が必要。", 1330, 3204, 990, 29, C.ink, false, 1.47);

ctx.strokeStyle = C.line;
ctx.lineWidth = 2;
ctx.beginPath();
ctx.moveTo(112, 3408);
ctx.lineTo(2368, 3408);
ctx.stroke();
text("一次資料：USBC Bowling Technology Study／USBC Ball Motion Study／Maurice Pinel Updated Dual Angle Guide／Storm Pin-to-PAP／Radical Drilling Instructions", 112, 3434, 21, C.muted, false);

fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));
console.log(JSON.stringify({ outputPath, width: W, height: H }, null, 2));
