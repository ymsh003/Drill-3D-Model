import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { PDFDocument } from "pdf-lib";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const data = JSON.parse(fs.readFileSync(path.join(projectRoot, "outputs", "layout-interaction-experiment-data.json"), "utf8"));
const archetypeData = JSON.parse(fs.readFileSync(path.join(projectRoot, "outputs", "layout-archetype-experiment-data.json"), "utf8"));
const tempDir = path.join(projectRoot, "tmp", "pdfs");
const outputDir = path.join(projectRoot, "output", "pdf");
const outputPath = path.join(outputDir, "drill-layout-three-factor-beginner-guide-final.pdf");
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(outputDir, { recursive: true });

const modelImages = Object.fromEntries(await Promise.all([
  ["overview", "model-overview-45-35-45-hires.png"],
  ["drill20", "model-drill-20-hires.png"],
  ["drill80", "model-drill-80-hires.png"],
  ["pin15", "model-pin-15-hires.png"],
  ["pin35", "model-pin-35-hires.png"],
  ["pin55", "model-pin-55-hires.png"],
  ["val20", "model-val-20-hires.png"],
  ["val70", "model-val-70-hires.png"]
].map(async ([key, file]) => [key, await loadImage(path.join(tempDir, file))])));

for (const [fontPath, family] of [
  ["C:/Windows/Fonts/meiryo.ttc", "Meiryo"],
  ["C:/Windows/Fonts/meiryob.ttc", "Meiryo Bold"]
]) {
  if (fs.existsSync(fontPath)) GlobalFonts.registerFromPath(fontPath, family);
}

const W = 2480;
const H = 3508;
const M = 128;
const C = {
  paper: "#F4F7F5", ink: "#14252A", muted: "#52686E", line: "#BACAC8", white: "#FFFFFF",
  teal: "#087F76", tealSoft: "#D9EFEB", orange: "#D96B2B", orangeSoft: "#F9E5D8",
  blue: "#2F6FA3", blueSoft: "#DDEAF5", purple: "#76518C", purpleSoft: "#E9E0EE",
  yellow: "#F2C94C", yellowSoft: "#FFF3C9", dark2: "#243A3F", grid: "#D6E1DF"
};

function makePage(pageNumber, shortTitle) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = C.ink;
  ctx.fillRect(0, 0, W, 322);
  drawText(ctx, "DRILL LAYOUT GUIDE", M, 58, 28, C.tealSoft, true);
  drawText(ctx, shortTitle, M, 112, 70, C.white, true);
  drawText(ctx, "一次資料との照合／標準コア594条件と、4種類のコア条件×63条件（計252条件）の静的比較", M, 226, 28, "#C7D8D6");
  drawText(ctx, `${pageNumber} / 10`, W - M, 72, 28, "#C7D8D6", false, "right");
  return { canvas, ctx };
}

function setFont(ctx, size, bold = false) {
  ctx.font = `${bold ? "700" : "400"} ${size}px "${bold ? "Meiryo Bold" : "Meiryo"}", sans-serif`;
}

function drawText(ctx, value, x, y, size, color = C.ink, bold = false, align = "left") {
  setFont(ctx, size, bold);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "top";
  ctx.fillText(String(value), x, y);
}

function roundRect(ctx, x, y, w, h, radius, fill, stroke = null, lineWidth = 2) {
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

function drawModelImage(ctx, image, x, y, w, h, radius = 24) {
  roundRect(ctx, x, y, w, h, radius, C.ink, C.line, 3);
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  const dx = x + (w - dw) / 2;
  const dy = y + (h - dh) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
  ctx.clip();
  ctx.drawImage(image, 0, 0, image.width, image.height, dx, dy, dw, dh);
  ctx.restore();
}

function wrapLines(ctx, value, maxWidth, size, bold = false) {
  setFont(ctx, size, bold);
  const lines = [];
  let current = "";
  for (const char of [...String(value)]) {
    const candidate = current + char;
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = char;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function paragraph(ctx, value, x, y, maxWidth, size, color = C.ink, bold = false, gap = 1.5) {
  const lines = wrapLines(ctx, value, maxWidth, size, bold);
  lines.forEach((line, index) => drawText(ctx, line, x, y + index * size * gap, size, color, bold));
  return lines.length * size * gap;
}

function title(ctx, number, value, y) {
  roundRect(ctx, M, y, 58, 58, 29, C.ink);
  drawText(ctx, number, M + 29, y + 7, 31, C.white, true, "center");
  drawText(ctx, value, M + 84, y - 2, 49, C.ink, true);
}

function pill(ctx, value, x, y, fill, foreground = C.white, size = 28) {
  setFont(ctx, size, true);
  const w = ctx.measureText(value).width + 40;
  roundRect(ctx, x, y, w, size + 30, 16, fill);
  drawText(ctx, value, x + 20, y + 10, size, foreground, true);
  return w;
}

function arrow(ctx, x1, y1, x2, y2, color = C.line, width = 8) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 24 * Math.cos(a - Math.PI / 6), y2 - 24 * Math.sin(a - Math.PI / 6));
  ctx.lineTo(x2 - 24 * Math.cos(a + Math.PI / 6), y2 - 24 * Math.sin(a + Math.PI / 6));
  ctx.closePath();
  ctx.fill();
}

function footer(ctx, pageNumber) {
  ctx.strokeStyle = C.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(M, 3410);
  ctx.lineTo(W - M, 3410);
  ctx.stroke();
  drawText(ctx, "出典：USBC／Maurice Pinel／Storm Bowling／Radical Bowling　｜　数値：静的慣性モデルによる比較結果", M, 3433, 21, C.muted);
  drawText(ctx, String(pageNumber), W - M, 3433, 21, C.muted, false, "right");
}

function meanBy(field, metric) {
  const groups = new Map();
  for (const row of data.rows) {
    const key = row[field];
    const group = groups.get(key) || [];
    group.push(row[metric]);
    groups.set(key, group);
  }
  return [...groups].sort((a, b) => a[0] - b[0]).map(([x, values]) => ({
    x: Number(x), y: values.reduce((sum, value) => sum + value, 0) / values.length
  }));
}

function drawLineChart(ctx, x, y, w, h, series, xTicks, yMin, yMax, xLabel, yLabel, color, callout = null) {
  const left = x + 104;
  const right = x + w - 44;
  const top = y + 88;
  const bottom = y + h - 104;
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    const yy = bottom - i / 4 * (bottom - top);
    ctx.beginPath();
    ctx.moveTo(left, yy);
    ctx.lineTo(right, yy);
    ctx.stroke();
    drawText(ctx, (yMin + i / 4 * (yMax - yMin)).toFixed(2), left - 18, yy - 16, 23, C.muted, false, "right");
  }
  const xMin = series[0].x;
  const xMax = series.at(-1).x;
  const sx = (value) => left + (value - xMin) / (xMax - xMin || 1) * (right - left);
  const sy = (value) => bottom - (value - yMin) / (yMax - yMin || 1) * (bottom - top);
  ctx.strokeStyle = color;
  ctx.lineWidth = 11;
  ctx.lineJoin = "round";
  ctx.beginPath();
  series.forEach((point, index) => index ? ctx.lineTo(sx(point.x), sy(point.y)) : ctx.moveTo(sx(point.x), sy(point.y)));
  ctx.stroke();
  for (const point of series) {
    ctx.beginPath();
    ctx.arc(sx(point.x), sy(point.y), 10, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
  for (const tick of xTicks) drawText(ctx, tick, sx(tick), bottom + 18, 23, C.muted, false, "center");
  drawText(ctx, xLabel, (left + right) / 2, bottom + 62, 25, C.ink, true, "center");
  drawText(ctx, yLabel, left, y + 28, 24, C.muted);
  if (callout) {
    const point = series.reduce((best, item) => Math.abs(item.x - callout.x) < Math.abs(best.x - callout.x) ? item : best, series[0]);
    pill(ctx, callout.text, sx(point.x) - 130, Math.max(y + 12, sy(point.y) - 88), callout.fill, callout.color || C.white, 24);
  }
}

function drawMultiLineChart(ctx, x, y, w, h, seriesList, xTicks, yMin, yMax, xLabel, yLabel) {
  const left = x + 112;
  const right = x + w - 48;
  const top = y + 98;
  const bottom = y + h - 116;
  ctx.strokeStyle = C.grid;
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    const yy = bottom - i / 4 * (bottom - top);
    ctx.beginPath(); ctx.moveTo(left, yy); ctx.lineTo(right, yy); ctx.stroke();
    drawText(ctx, (yMin + i / 4 * (yMax - yMin)).toFixed(2), left - 18, yy - 16, 23, C.muted, false, "right");
  }
  const xMin = xTicks[0];
  const xMax = xTicks.at(-1);
  const sx = (value) => left + (value - xMin) / (xMax - xMin || 1) * (right - left);
  const sy = (value) => bottom - (value - yMin) / (yMax - yMin || 1) * (bottom - top);
  for (const series of seriesList) {
    ctx.strokeStyle = series.color;
    ctx.lineWidth = 9;
    ctx.lineJoin = "round";
    ctx.beginPath();
    series.points.forEach((point, index) => index ? ctx.lineTo(sx(point.x), sy(point.y)) : ctx.moveTo(sx(point.x), sy(point.y)));
    ctx.stroke();
    for (const point of series.points) {
      ctx.beginPath(); ctx.arc(sx(point.x), sy(point.y), 9, 0, Math.PI * 2); ctx.fillStyle = series.color; ctx.fill();
    }
  }
  for (const tick of xTicks) drawText(ctx, tick, sx(tick), bottom + 18, 23, C.muted, false, "center");
  drawText(ctx, xLabel, (left + right) / 2, bottom + 66, 25, C.ink, true, "center");
  drawText(ctx, yLabel, left, y + 32, 24, C.muted);
}

function contributionBars(ctx, x, y, w, values, max = 100) {
  values.forEach(([name, value, color], index) => {
    const yy = y + index * 128;
    drawText(ctx, name, x, yy, 30, C.ink, true);
    drawText(ctx, `${value.toFixed(1)}%`, x + w, yy, 30, color, true, "right");
    roundRect(ctx, x, yy + 52, w, 24, 12, C.grid);
    roundRect(ctx, x, yy + 52, Math.max(10, w * value / max), 24, 12, color);
  });
}

function drawPage1() {
  const { canvas, ctx } = makePage(1, "結論");
  title(ctx, "1", "三つの値を組み合わせて判断する", 402);
  roundRect(ctx, M, 512, W - 2 * M, 316, 30, C.ink);
  paragraph(ctx, "PIN-PAP距離はトラックフレアの大きさを左右する主要因である。ドリル角とVAL角は、ボールが向きを変える時期と動き方の目安になるだけでなく、穴の位置を通じて穴あけ後の慣性特性も変える。したがって、三つの値を組み合わせた状態で、穴あけ後の三つの主軸RGを確認する。", M + 54, 556, W - 2 * M - 108, 37, C.white, true, 1.45);

  title(ctx, "2", "標準コアの594条件から得た四つの結論", 918);
  const conclusions = [
    ["01", "トラックフレアの目安", "本モデルのPAP補正フレア指標には、PIN-PAP距離が最も強く影響した。値は3～4インチ付近で最大になった。", C.teal, C.tealSoft],
    ["02", "穴あけ後のディファレンシャル", "Performance Differentialは三つの値すべてで変化し、交互作用がばらつきの19.7%を説明した。", C.orange, C.orangeSoft],
    ["03", "PAP軸まわりのRG", "PIN-PAP距離は、今回の固定条件におけるPAP軸RGのばらつきの92.1%を説明した。", C.blue, C.blueSoft],
    ["04", "コア特性が異なっても共通", "対称・非対称とDifferential RGの大小を変えても、PAP補正フレア指標の平均値は3.5インチで最大になった。", C.purple, C.purpleSoft]
  ];
  conclusions.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = M + col * 1134;
    const y = 1032 + row * 438;
    roundRect(ctx, x, y, 1088, 390, 28, C.white, C.line, 3);
    roundRect(ctx, x, y, 18, 390, 9, item[3]);
    pill(ctx, item[0], x + 48, y + 44, item[3], C.white, 28);
    drawText(ctx, item[1], x + 154, y + 50, 40, item[3], true);
    paragraph(ctx, item[2], x + 48, y + 138, 992, 34, C.ink, true, 1.55);
  });

  title(ctx, "3", "PAP補正フレア指標（本モデル）のばらつきへの寄与", 1960);
  roundRect(ctx, M, 2070, W - 2 * M, 760, 30, C.white, C.line, 3);
  const shares = data.analysis.effective_flare_diff_in.variance_share_pct;
  const interaction = shares["drill_angle_deg*pin_pap_in"] + shares["drill_angle_deg*val_angle_deg"] + shares["pin_pap_in*val_angle_deg"] + shares.three_way;
  contributionBars(ctx, M + 62, 2160, 1000, [
    ["PIN-PAP", shares.pin_pap_in, C.teal], ["ドリル角", shares.drill_angle_deg, C.orange],
    ["VAL角", shares.val_angle_deg, C.blue], ["交互作用", interaction, C.purple]
  ]);
  roundRect(ctx, 1320, 2160, 964, 528, 26, C.tealSoft);
  drawText(ctx, "読み方", 1372, 2210, 35, C.teal, true);
  paragraph(ctx, "52.7%は『PIN-PAP距離だけで結果の52.7%が決まる』という意味ではない。594条件で生じたPAP補正フレア指標のばらつきのうち、PIN-PAP距離の主効果が説明した割合である。", 1372, 2270, 860, 30, C.ink, false, 1.5);
  paragraph(ctx, "Performance Differentialでは、交互作用がばらつきの19.7%を説明する。評価する指標が変われば、三つの値の寄与も変わる。", 1372, 2520, 860, 30, C.ink, true, 1.5);
  footer(ctx, 1);
  return canvas;
}

function drawPage2() {
  const { canvas, ctx } = makePage(2, "3Dモデルと基準点");
  title(ctx, "1", "球面上の基準点とコアの向きを確認する", 402);
  paragraph(ctx, "作成中サイトの3Dモデルから表示部分だけを書き出した。フィンガーを上、サムを下、グリップ中心を正面に合わせ、レイアウトは45° × 3.5インチ × 45°とした。", M, 494, W - 2 * M, 31, C.muted, false, 1.5);
  drawModelImage(ctx, modelImages.overview, M, 590, W - 2 * M, 1450, 30);
  const markers = [
    ["PIN（ピン）", "赤", "メーカーの位置表示。低RG軸の一端は、原則ピン中心から1インチ以内にある。", C.orange],
    ["PAP", "水色", "Positive Axis Point。リリース直後の回転軸の正側が、ボール表面と交わる点。", C.teal],
    ["PSA / MB", "紫", "PSAはPreferred Spin Axis。MBマークは、非対称コアのPSA方向を示すために用いる。", C.purple],
    ["グリップ中心", "黄", "本モデルでは三つのグリップホールの配置中心を黄色で表示する。", C.yellow]
  ];
  markers.forEach((item, index) => {
    const xx = M + index * 560;
    roundRect(ctx, xx, 2100, 520, 350, 24, C.ink);
    drawText(ctx, item[0], xx + 30, 2132, 28, item[3], true);
    pill(ctx, item[1], xx + 30, 2190, item[3], C.white, 22);
    paragraph(ctx, item[2], xx + 30, 2260, 460, 22, "#D8E5E3", false, 1.42);
  });

  title(ctx, "2", "三つの基準線を公式名称で読む", 2540);
  const lineCards = [
    ["赤から橙の弧", "PIN-PAPライン", "PINとPAPを結ぶ球面上の最短経路。PIN-PAP距離は、この経路に沿って測る。", C.orange, C.orangeSoft],
    ["水色の大円", "VAL（Vertical Axis Line）", "PAPを通り、ミッドラインに直交する大円。VAL角はPIN-PAPラインとの角度。", C.blue, C.blueSoft],
    ["黄緑の破線", "PIN-PSAライン", "非対称コアでPINとPSAを結ぶ基準線。ドリル角はPIN-PAPラインとの角度。", C.teal, C.tealSoft]
  ];
  lineCards.forEach((item, index) => {
    const x = M + index * 756;
    roundRect(ctx, x, 2650, 708, 470, 26, item[4], C.line, 2);
    pill(ctx, item[0], x + 34, 2690, item[3], C.white, 22);
    drawText(ctx, item[1], x + 34, 2760, 31, item[3], true);
    paragraph(ctx, item[2], x + 34, 2840, 640, 25, C.ink, false, 1.48);
  });
  footer(ctx, 2);
  return canvas;
}

function drawPage3() {
  const { canvas, ctx } = makePage(3, "RGとフレアの公式用語");
  title(ctx, "1", "RG（Radius of Gyration）は軸を明示して読む", 402);
  roundRect(ctx, M, 520, W - 2 * M, 438, 30, C.white, C.line, 3);
  pill(ctx, "RG = √(慣性モーメント ÷ 質量)", M + 52, 570, C.ink, C.white, 32);
  paragraph(ctx, "RG（回転半径）は、質量が指定した回転軸からどの程度離れて分布しているかを、長さで表した値である。同じ質量なら、RGが小さいほど質量は軸の近くに分布し、同じトルクを受けたときに回転速度が変化しやすい。", M + 52, 672, W - 2 * M - 104, 34, C.ink, false, 1.5);
  paragraph(ctx, "低RG・中RG・高RGは、完成球の三つの主慣性軸に対応する値である。『ボールのRG』だけでは回転軸が不明確になるため、本資料では軸名または低・中・高を明記する。", M + 52, 820, W - 2 * M - 104, 29, C.muted, true, 1.45);

  title(ctx, "2", "二つのディファレンシャルとPerformance Differential", 1048);
  const diffCards = [
    ["Differential RG（総ディファレンシャル）", "高RG - 低RG", "USBCの正式な測定項目。ボールが持つトラックフレアの可能性を示す基本値。", C.teal, C.tealSoft],
    ["Intermediate Differential（中間ディファレンシャル）", "高RG - 中RG", "USBCの正式な測定項目。非対称コアにおける中RG軸と高RG軸の差を示す。", C.purple, C.purpleSoft],
    ["Performance Differential", "√{(Differential RG)² + (Intermediate Differential)²}", "Radicalのドリル資料で使われる用語。穴あけ後の二つのディファレンシャルを合成し、トラックフレアの大きさを比較する。", C.orange, C.orangeSoft]
  ];
  diffCards.forEach((item, index) => {
    const y = 1162 + index * 410;
    roundRect(ctx, M, y, W - 2 * M, 356, 28, C.white, C.line, 3);
    roundRect(ctx, M, y, 18, 356, 9, item[3]);
    drawText(ctx, item[0], M + 52, y + 40, 40, item[3], true);
    pill(ctx, item[1], M + 1500, y + 36, item[4], item[3], 25);
    paragraph(ctx, item[2], M + 52, y + 128, W - 2 * M - 104, 33, C.ink, false, 1.55);
  });

  title(ctx, "3", "PAP補正フレア指標（本モデル独自）", 2442);
  roundRect(ctx, M, 2556, W - 2 * M, 654, 30, C.ink);
  drawText(ctx, "定義", M + 52, 2604, 35, C.tealSoft, true);
  paragraph(ctx, "Performance Differentialに、PAP軸と穴あけ後の主慣性軸との位置関係を加えた、本モデル独自の比較値。", M + 52, 2670, W - 2 * M - 104, 40, C.white, true, 1.55);
  arrow(ctx, M + 240, 2878, M + 690, 2878, C.teal, 10);
  arrow(ctx, M + 856, 2878, M + 1306, 2878, C.orange, 10);
  arrow(ctx, M + 1472, 2878, M + 1922, 2878, C.blue, 10);
  drawText(ctx, "PAP軸", M + 465, 2920, 30, C.tealSoft, true, "center");
  drawText(ctx, "穴あけ後の主慣性軸", M + 1081, 2920, 30, C.orangeSoft, true, "center");
  drawText(ctx, "PAP軸から外れる成分", M + 1697, 2920, 30, C.blueSoft, true, "center");
  paragraph(ctx, "この名称はUSBCやメーカーの公式用語ではない。公式用語であるPerformance Differentialと混同しないよう、本資料では必ず『本モデル独自』と明記する。", M + 52, 3035, W - 2 * M - 104, 31, "#D8E5E3", false, 1.45);
  footer(ctx, 3);
  return canvas;
}

function drawPage4() {
  const { canvas, ctx } = makePage(4, "3D比較 I：ドリル角");
  title(ctx, "1", "PIN-PSAラインとPIN-PAPラインの角度を変える", 402);
  paragraph(ctx, "比較条件：PIN-PAP距離3.5インチ、VAL角45°を固定。左20°、右80°。", M, 494, W - 2 * M, 30, C.muted);
  drawModelImage(ctx, modelImages.drill20, M, 580, 1080, 770, 26);
  drawModelImage(ctx, modelImages.drill80, 1272, 580, 1080, 770, 26);
  pill(ctx, "ドリル角 20°", M + 34, 612, C.orange, C.white, 27);
  pill(ctx, "ドリル角 80°", 1306, 612, C.orange, C.white, 27);

  title(ctx, "2", "画像で確認する違い", 1450);
  const drillCards = [
    [M, "20°", "PIN-PAPラインがPIN-PSAラインに近い。PSA方向に対するグリップホールの配置は、右図とは異なる。"],
    [1272, "80°", "PIN-PAPラインがPIN-PSAラインから大きく離れる。PIN-PAP距離が同じでも、穴の位置関係が変わる。"]
  ];
  drillCards.forEach(([x, angle, body]) => {
    roundRect(ctx, x, 1560, 1080, 470, 26, C.orangeSoft, C.line, 2);
    drawText(ctx, angle, x + 42, 1602, 42, C.orange, true);
    paragraph(ctx, body, x + 42, 1680, 996, 32, C.ink, true, 1.55);
  });

  title(ctx, "3", "ドリル角の結論", 2140);
  roundRect(ctx, M, 2250, W - 2 * M, 760, 30, C.ink);
  paragraph(ctx, "非対称コアでは、ドリル角はPIN-PSAラインとPIN-PAPラインの角度である。ドリル角を変えると、PSAに対するホール配置が変わり、穴あけ後の中RG軸と高RG軸の方向およびIntermediate Differentialが変化する。", M + 52, 2308, W - 2 * M - 104, 38, C.white, true, 1.55);
  roundRect(ctx, M + 52, 2648, W - 2 * M - 104, 250, 24, C.orangeSoft);
  paragraph(ctx, "読み方：PIN-PAP距離が同じでも、ドリル角だけを変えるとコアに対するグリップホールの位置が変わる。左図と右図では、赤いPIN、紫のPSA、灰色のホールの相対位置を比較する。", M + 94, 2694, W - 2 * M - 188, 31, C.ink, true, 1.5);
  footer(ctx, 4);
  return canvas;
}

function drawPage5() {
  const { canvas, ctx } = makePage(5, "3D比較 II：PIN-PAP距離");
  title(ctx, "1", "PAPからPINまでの球面距離を変える", 402);
  paragraph(ctx, "比較条件：ドリル角45°、VAL角45°を固定。左から1.5、3.5、5.5インチ。", M, 494, W - 2 * M, 30, C.muted);
  const pinPanels = [[modelImages.pin15, "1.5インチ"], [modelImages.pin35, "3.5インチ"], [modelImages.pin55, "5.5インチ"]];
  pinPanels.forEach((item, index) => {
    const x = M + index * 756;
    drawModelImage(ctx, item[0], x, 580, 708, 620, 24);
    pill(ctx, item[1], x + 28, 610, C.teal, C.white, 26);
  });
  roundRect(ctx, M, 1240, W - 2 * M, 230, 24, C.tealSoft);
  paragraph(ctx, "赤いPINと水色のPAPの間隔に注目する。距離を変えると、PAP軸とPIN軸のなす角が変わる。", M + 42, 1286, W - 2 * M - 84, 32, C.ink, true, 1.5);

  title(ctx, "2", "三つの距離を同じ尺度で比較する", 1570);
  const pinCards = [
    ["1.5インチ", "PINとPAPが近く、PAP軸とPIN軸のなす角は小さい。トラックフレアは小さくなりやすい。"],
    ["3.5インチ", "球の中心から見た両軸の角度は約47°。本モデルではPAP補正フレア指標が最大付近になる。"],
    ["5.5インチ", "PINとPAPがさらに離れ、両軸の角度は90°へ近づく。トラックフレアは再び小さくなりやすい。"]
  ];
  pinCards.forEach((item, index) => {
    const x = M + index * 756;
    roundRect(ctx, x, 1680, 708, 540, 26, C.white, C.line, 3);
    drawText(ctx, item[0], x + 38, 1724, 37, C.teal, true);
    paragraph(ctx, item[1], x + 38, 1810, 632, 29, C.ink, true, 1.55);
  });

  title(ctx, "3", "PIN-PAP距離の結論", 2340);
  roundRect(ctx, M, 2450, W - 2 * M, 610, 30, C.ink);
  paragraph(ctx, "PIN-PAP距離は、完成球が持つトラックフレアの可能性をどの程度利用するかを大きく左右する。Stormの資料では3～4インチを高フレアになりやすい範囲としており、本モデルでも3.5インチで最大値を示した。短すぎても長すぎても値は小さくなる。", M + 52, 2510, W - 2 * M - 104, 38, C.white, true, 1.55);
  footer(ctx, 5);
  return canvas;
}

function drawPage6() {
  const { canvas, ctx } = makePage(6, "3D比較 III：VAL角");
  title(ctx, "1", "VALとPIN-PAPラインの角度を変える", 402);
  paragraph(ctx, "比較条件：ドリル角45°、PIN-PAP距離3.5インチを固定。左20°、右70°。", M, 494, W - 2 * M, 30, C.muted);
  drawModelImage(ctx, modelImages.val20, M, 580, 1080, 770, 26);
  drawModelImage(ctx, modelImages.val70, 1272, 580, 1080, 770, 26);
  pill(ctx, "VAL角 20°", M + 34, 612, C.blue, C.white, 27);
  pill(ctx, "VAL角 70°", 1306, 612, C.blue, C.white, 27);

  title(ctx, "2", "画像で確認する違い", 1450);
  const valCards = [
    [M, "20°", "VALとPIN-PAPラインの角度が小さい。PINはVALに近く、グリップホールとの相対位置も右図とは異なる。"],
    [1272, "70°", "VALとPIN-PAPラインの角度が大きい。PINはVALから離れ、穴あけ後のRGとDifferential RGも変化する。"]
  ];
  valCards.forEach(([x, angle, body]) => {
    roundRect(ctx, x, 1560, 1080, 470, 26, C.blueSoft, C.line, 2);
    drawText(ctx, angle, x + 42, 1602, 42, C.blue, true);
    paragraph(ctx, body, x + 42, 1680, 996, 32, C.ink, true, 1.55);
  });

  title(ctx, "3", "VAL角の結論", 2140);
  roundRect(ctx, M, 2250, W - 2 * M, 760, 30, C.ink);
  paragraph(ctx, "VAL角は、PIN-PAPラインとVALとの角度である。Maurice Pinelの『Dual Angle Layout Technique』では、VAL角を小さくすると回転の立ち上がりと方向転換が速くなり、大きくすると遅くなると説明されている。", M + 52, 2308, W - 2 * M - 104, 38, C.white, true, 1.55);
  roundRect(ctx, M + 52, 2648, W - 2 * M - 104, 250, 24, C.blueSoft);
  paragraph(ctx, "本モデルの静的計算でも、VAL角を変えると穴あけ後の低RG・中RG・高RG、Differential RG、Intermediate Differentialが変化した。", M + 94, 2694, W - 2 * M - 188, 31, C.ink, true, 1.5);
  footer(ctx, 6);
  return canvas;
}

function drawPage7() {
  const { canvas, ctx } = makePage(7, "三つの値の交互作用を数値で見る");
  title(ctx, "1", "角度合計が同じでも、穴あけ後の慣性特性は異なる", 402);
  const examples = [
    { layout: "30° × 3.5インチ × 70°", drill: 30, pin: 3.5, val: 70, color: C.orange, soft: C.orangeSoft },
    { layout: "70° × 3.5インチ × 30°", drill: 70, pin: 3.5, val: 30, color: C.blue, soft: C.blueSoft }
  ].map((item) => ({ ...item, row: data.rows.find((row) => row.drill_angle_deg === item.drill && row.pin_pap_in === item.pin && row.val_angle_deg === item.val) }));
  examples.forEach((item, index) => {
    const x = M + index * 1134;
    roundRect(ctx, x, 520, 1088, 780, 30, C.white, C.line, 3);
    pill(ctx, item.layout, x + 46, 566, item.color, C.white, 31);
    drawText(ctx, "角度合計 100°", x + 46, 658, 31, C.muted, true);
    const values = [
      ["PAP軸RG", item.row.pap_rg_in.toFixed(4)],
      ["Differential RG", item.row.total_diff_in.toFixed(4)],
      ["Intermediate Differential", item.row.int_diff_in.toFixed(4)],
      ["Performance Differential", item.row.performance_diff_in.toFixed(4)],
      ["PAP補正フレア指標（本モデル）", item.row.effective_flare_diff_in.toFixed(4)]
    ];
    values.forEach((value, i) => {
      const yy = 744 + i * 100;
      drawText(ctx, value[0], x + 46, yy, 29, C.ink);
      drawText(ctx, value[1], x + 1028, yy, 31, item.color, true, "right");
      ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + 46, yy + 60); ctx.lineTo(x + 1028, yy + 60); ctx.stroke();
    });
  });
  roundRect(ctx, M, 1356, W - 2 * M, 244, 26, C.ink);
  paragraph(ctx, "Dual Angle Layout Techniqueでは、ドリル角とVAL角の合計を、ボールが滑走から曲がりへ移る速さの目安として用いる。一方、二つの角度の配分はホール配置を変えるため、穴あけ後の二つのディファレンシャルとPAP補正フレア指標も変化する。", M + 50, 1404, W - 2 * M - 100, 33, C.white, true, 1.5);

  title(ctx, "2", "評価指標によって交互作用の寄与は異なる", 1700);
  const eff = data.analysis.effective_flare_diff_in.variance_share_pct;
  const perf = data.analysis.performance_diff_in.variance_share_pct;
  const combine = (s) => s["drill_angle_deg*pin_pap_in"] + s["drill_angle_deg*val_angle_deg"] + s["pin_pap_in*val_angle_deg"] + s.three_way;
  const barGroups = [
    [M, "PAP補正フレア指標（本モデル）", eff, combine(eff), C.teal],
    [1264, "Performance Differential", perf, combine(perf), C.orange]
  ];
  for (const [x, heading, shares, combined, accent] of barGroups) {
    roundRect(ctx, x, 1812, 1088, 860, 30, C.white, C.line, 3);
    drawText(ctx, heading, x + 46, 1856, 38, accent, true);
    contributionBars(ctx, x + 46, 1950, 996, [
      ["ドリル角", shares.drill_angle_deg, C.orange],
      ["PIN-PAP", shares.pin_pap_in, C.teal],
      ["VAL角", shares.val_angle_deg, C.blue],
      ["交互作用", combined, C.purple]
    ]);
    roundRect(ctx, x + 46, 2468, 996, 142, 22, accent === C.teal ? C.tealSoft : C.orangeSoft);
    paragraph(ctx, combined < 10 ? "ばらつきの多くは主効果で説明できる。ただし、ドリル角とPIN-PAP距離の交互作用も残る。" : "ばらつきの約5分の1を交互作用が説明する。三つの値を個別に見るだけでは、この差を捉えられない。", x + 78, 2496, 932, 27, C.ink, true, 1.4);
  }

  title(ctx, "3", "三つの値が組み合わさる仕組み", 2780);
  roundRect(ctx, M, 2890, W - 2 * M, 350, 30, C.purpleSoft);
  paragraph(ctx, "PIN-PAP距離はPAP軸とPIN軸のなす角を決める。ドリル角とVAL角は、その傾きを球面上のどの方向へ向けるかを決める。三つを組み合わせると、穴あけ後の主慣性軸、二つのディファレンシャル、PAP補正フレア指標が変化する。", M + 50, 2940, W - 2 * M - 100, 36, C.ink, true, 1.52);
  footer(ctx, 7);
  return canvas;
}

function drawPage8() {
  const { canvas, ctx } = makePage(8, "初心者が迷わない選び方");
  title(ctx, "1", "レイアウトを検討する順序", 402);
  const steps = [
    ["1", "PIN-PAP", "フレア量のおおよその範囲を選ぶ", "3～4インチ付近では大きく、短い側と長い側では小さくなりやすい。", C.teal, C.tealSoft],
    ["2", "ドリル角とVAL角の合計", "反応時期の目安を決める", "Dual Angle Layout Techniqueでは、合計が小さいほど早く、大きいほど遅く反応する傾向を示す。", C.orange, C.orangeSoft],
    ["3", "二つの角度の配分", "同じ角度合計の中で曲がり方を調整する", "ドリル角とVAL角の配分によって、反応の始まり方と方向転換の速さを調整する。", C.blue, C.blueSoft],
    ["4", "穴あけ後の特性を再計算", "三つの主軸RGと二つのディファレンシャルを確認する", "同じPIN-PAP距離でも、角度の組み合わせによって穴あけ後の慣性特性は変わる。", C.purple, C.purpleSoft]
  ];
  steps.forEach((item, index) => {
    const y = 520 + index * 420;
    roundRect(ctx, M, y, W - 2 * M, 350, 28, C.white, C.line, 3);
    roundRect(ctx, M + 42, y + 40, 78, 78, 39, item[4]);
    drawText(ctx, item[0], M + 81, y + 52, 36, C.white, true, "center");
    drawText(ctx, item[1], M + 154, y + 42, 35, item[4], true);
    drawText(ctx, item[2], M + 154, y + 100, 39, C.ink, true);
    paragraph(ctx, item[3], M + 154, y + 176, W - 2 * M - 208, 31, C.muted, false, 1.5);
    if (index < steps.length - 1) arrow(ctx, W / 2, y + 358, W / 2, y + 402, C.line, 7);
  });

  title(ctx, "2", "三つの値を実務で読む要点", 2250);
  roundRect(ctx, M, 2364, W - 2 * M, 690, 30, C.ink);
  const finalItems = [
    "PIN-PAP距離は、PAP軸とPIN軸のなす角を通じてRGとPAP補正フレア指標を大きく変える。",
    "ドリル角とVAL角は、反応時期と曲がり方の目安になるほか、ホール配置を通じて穴あけ後の二つのディファレンシャルも変える。",
    "角度合計が同じでも、二つの角度の配分が異なれば、穴あけ後の慣性特性は同じにならない。",
    "PIN-PAP距離、角度合計、二つの角度の配分、穴あけ後の再計算の順に確認すると、役割を区別しやすい。"
  ];
  finalItems.forEach((value, index) => {
    roundRect(ctx, M + 52, 2420 + index * 138, 56, 56, 28, [C.teal, C.orange, C.blue, C.purple][index]);
    drawText(ctx, String(index + 1), M + 80, 2428 + index * 138, 28, C.white, true, "center");
    paragraph(ctx, value, M + 136, 2416 + index * 138, W - 2 * M - 204, 31, C.white, true, 1.45);
  });

  title(ctx, "3", "一次資料", 3148);
  drawText(ctx, "USBC Equipment Specifications／USBC Ball Motion Study／Maurice Pinel Dual Angle Layout Technique／Storm Pin Buffer Layout System／Radical Drilling Instructions", M, 3244, 23, C.muted);
  footer(ctx, 8);
  return canvas;
}

function drawPage9() {
  const { canvas, ctx } = makePage(9, "ボール特性を変えて再検証");
  title(ctx, "1", "四つのコア条件すべてで最大値は3.5インチ", 402);
  paragraph(ctx, "対称・非対称とDifferential RGの大小を組み合わせた四つのコア条件について、各63条件（計252条件）を再計算した。曲線は各PIN-PAP距離について、ドリル角3条件×VAL角3条件を平均したPAP補正フレア指標を示す。", M, 494, W - 2 * M, 29, C.muted, false, 1.45);
  roundRect(ctx, M, 610, W - 2 * M, 1040, 30, C.white, C.line, 3);
  const colors = [C.blue, C.teal, C.orange, C.purple];
  const archetypeLabels = [
    "対称／Differential RG 小",
    "対称／Differential RG 大",
    "非対称／Differential RG 中",
    "非対称／Differential RG 大"
  ];
  const series = archetypeData.summary.map((summary, index) => ({
    label: archetypeLabels[index],
    color: colors[index],
    points: Object.entries(summary.pin_pap_effective_flare_curve)
      .map(([x, y]) => ({ x: Number(x), y: Number(y) }))
      .sort((a, b) => a.x - b.x)
  }));
  series.forEach((item, index) => pill(ctx, item.label, M + 62 + index * 532, 660, item.color, C.white, 24));
  drawMultiLineChart(ctx, M + 18, 720, W - 2 * M - 36, 870, series, [1, 2, 3, 4, 5, 6], 0, 0.05, "PIN-PAP距離（インチ）", "PAP補正フレア指標（本モデル）");

  title(ctx, "2", "共通する傾向と、コア条件による違い", 1750);
  roundRect(ctx, M, 1860, W - 2 * M, 684, 30, C.white, C.line, 3);
  const cols = [M + 36, M + 500, M + 850, M + 1160, M + 1470, M + 1780, M + 2080];
  const headers = ["コア特性", "最大点", "平均指標", "ドリル角", "PIN-PAP", "VAL角", "交互作用"];
  headers.forEach((header, index) => drawText(ctx, header, cols[index], 1910, 24, C.muted, true));
  ctx.strokeStyle = C.line; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(M + 36, 1960); ctx.lineTo(W - M - 36, 1960); ctx.stroke();
  archetypeData.summary.forEach((summary, rowIndex) => {
    const yy = 2000 + rowIndex * 124;
    const shares = summary.variance_share_pct.effective_flare_diff_in;
    const mix = 100 - shares.drill_angle_deg - shares.pin_pap_in - shares.val_angle_deg;
    const values = [
      archetypeLabels[rowIndex],
      `${summary.peak_pin_pap_in.toFixed(1)} in`,
      summary.mean_metrics.effective_flare_diff_in.toFixed(4),
      `${shares.drill_angle_deg.toFixed(1)}%`,
      `${shares.pin_pap_in.toFixed(1)}%`,
      `${shares.val_angle_deg.toFixed(1)}%`,
      `${mix.toFixed(1)}%`
    ];
    values.forEach((value, index) => drawText(ctx, value, cols[index], yy, index === 0 ? 25 : 24, index === 0 ? colors[rowIndex] : C.ink, index === 0 || index === 1));
    if (rowIndex < archetypeData.summary.length - 1) {
      ctx.strokeStyle = C.grid; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(M + 36, yy + 72); ctx.lineTo(W - M - 36, yy + 72); ctx.stroke();
    }
  });
  roundRect(ctx, M + 36, 2472, W - 2 * M - 72, 42, 21, C.tealSoft);

  title(ctx, "3", "なぜ3～4インチ付近で最大になりやすいか", 2650);
  roundRect(ctx, M, 2760, W - 2 * M, 490, 30, C.ink);
  pill(ctx, "軸移動を生む幾何学的成分 ∝ sin θ × cos θ", M + 52, 2812, C.teal, C.white, 29);
  paragraph(ctx, "PAP軸とPIN軸のなす角θが45°のとき、この成分は最大になる。球半径4.2975インチでは、45°に相当する球面距離は4.2975 × π/4 = 3.38インチである。本モデルの最大値3.5インチは、Stormが高フレアになりやすい範囲として示す3～4インチにも含まれる。", M + 52, 2900, W - 2 * M - 104, 32, C.white, true, 1.5);
  footer(ctx, 9);
  return canvas;
}

function drawPage10() {
  const { canvas, ctx } = makePage(10, "性能の全体像・用語・一次資料");
  title(ctx, "1", "ボール性能は四つの層に分けて読む", 402);
  const layers = [
    ["1", "カバーストックと表面仕上げ", "レーンとの摩擦を決める。USBCの実投研究では、表面粗さ・摩擦・吸油特性がボール軌道に大きく影響する。", C.orange, C.orangeSoft],
    ["2", "穴あけ前のコア特性", "低RGは回転の立ち上がりやすさ、Differential RGはトラックフレアの可能性、Intermediate Differentialは非対称性を示す。", C.purple, C.purpleSoft],
    ["3", "ドリルレイアウト", "ドリル角・PIN-PAP・VAL角によって、コア軸とPAP軸の位置関係およびホール配置を決める。", C.teal, C.tealSoft],
    ["4", "投球条件", "PAP、球速、回転数、軸回転、軸傾きが異なれば、同じボールでもレーン上の軌道は変わる。", C.blue, C.blueSoft]
  ];
  layers.forEach((item, index) => {
    const y = 518 + index * 290;
    roundRect(ctx, M, y, W - 2 * M, 244, 26, C.white, C.line, 3);
    roundRect(ctx, M + 38, y + 38, 70, 70, 35, item[3]);
    drawText(ctx, item[0], M + 73, y + 47, 33, C.white, true, "center");
    drawText(ctx, item[1], M + 142, y + 38, 38, item[3], true);
    paragraph(ctx, item[2], M + 142, y + 104, W - 2 * M - 200, 29, C.ink, false, 1.45);
  });

  title(ctx, "2", "迷いやすい用語を一行で確認", 1740);
  const glossary = [
    ["PAP", "リリース直後の回転軸の正側がボール表面と交わる点"],
    ["PIN", "メーカーの位置表示。低RG軸の一端は原則ピン中心から1インチ以内"],
    ["PSA / MBマーク", "PSAはPreferred Spin Axis。MBマークはPSA方向を示す表示"],
    ["VAL", "PAPを通り、ミッドラインに直交する大円"],
    ["Differential RG", "高RG - 低RG。USBCの正式な測定項目"],
    ["Intermediate Differential", "高RG - 中RG。USBCの正式な測定項目"],
    ["Performance Differential", "二つのディファレンシャルを合成したRadical資料の用語"],
    ["PAP補正フレア指標（本モデル独自）", "PAP軸との位置関係を加えた比較値"]
  ];
  glossary.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = M + col * 1134;
    const y = 1852 + row * 178;
    roundRect(ctx, x, y, 1088, 140, 22, C.white, C.line, 2);
    drawText(ctx, item[0], x + 32, y + 24, 28, col ? C.blue : C.teal, true);
    drawText(ctx, item[1], x + 32, y + 76, 24, C.ink);
  });

  title(ctx, "3", "一次資料と、今回の結論", 2650);
  roundRect(ctx, M, 2760, 1438, 522, 26, C.white, C.line, 3);
  drawText(ctx, "一次資料", M + 40, 2802, 32, C.ink, true);
  const sources = [
    "1  USBC Bowling Technology Study - Differential RGとトラックフレア",
    "2  USBC Ball Motion Study - 表面・コア特性と実投軌道",
    "3  Maurice Pinel, Dual Angle Layout Technique - 三つの値と角度関係",
    "4  Storm, Pin Buffer Layout System - PIN-PAP距離とフレア",
    "5  Radical Results Plus Drilling Instructions - 穴あけ後の二つのディファレンシャル"
  ];
  sources.forEach((source, index) => drawText(ctx, source, M + 40, 2870 + index * 70, 24, C.muted, index === 0));
  roundRect(ctx, 1620, 2760, 732, 522, 26, C.ink);
  drawText(ctx, "結論", 1664, 2802, 32, C.tealSoft, true);
  paragraph(ctx, "まず穴あけ前のRG特性を確認し、PIN-PAP距離でトラックフレアのおおよその範囲を選ぶ。次にドリル角とVAL角で反応時期と動き方を整え、最後に穴あけ後の三つの主軸RG、Differential RG、Intermediate Differentialを再計算する。この順序で、三つの値の役割と交互作用を一貫して判断できる。", 1664, 2876, 644, 28, C.white, true, 1.5);
  footer(ctx, 10);
  return canvas;
}

const canvases = [drawPage1(), drawPage2(), drawPage3(), drawPage4(), drawPage5(), drawPage6(), drawPage7(), drawPage8(), drawPage9(), drawPage10()];
const pagePaths = [];
for (let index = 0; index < canvases.length; index++) {
  const pagePath = path.join(tempDir, `drill-layout-guide-page-${index + 1}.png`);
  fs.writeFileSync(pagePath, canvases[index].toBuffer("image/png"));
  pagePaths.push(pagePath);
}

const pdf = await PDFDocument.create();
pdf.setTitle("三つのドリルレイアウト値 - 初心者向けガイド");
pdf.setSubject("ドリル角、PIN-PAP、VAL角の定義・単独作用・相互作用");
pdf.setAuthor("Drill Studio");
for (const pagePath of pagePaths) {
  const image = await pdf.embedPng(fs.readFileSync(pagePath));
  const page = pdf.addPage([595.28, 841.89]);
  page.drawImage(image, { x: 0, y: 0, width: 595.28, height: 841.89 });
}
fs.writeFileSync(outputPath, await pdf.save({ useObjectStreams: true }));
console.log(JSON.stringify({ outputPath, pagePaths, pageCount: pagePaths.length }, null, 2));
