import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { Presentation, PresentationFile } from "@oai/artifact-tool";

const workspaceDir = path.resolve(process.cwd());
const SKILL_DIR = "C:/Users/syo03/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.12148/skills/presentations";
const RUNTIME_PYTHON = "C:/Users/syo03/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe";
const FINAL_PPTX = path.join(workspaceDir, "output", "presentations", "bowling-drill-layout-beginner-course-v3.pptx");
const TMP_DIR = path.join(workspaceDir, "tmp", "presentations", "beginner-course-v3");
const stagingDir = path.join(workspaceDir, ".codex-finalizer");
const data = JSON.parse(await fs.readFile(path.join(workspaceDir, "outputs", "real-ball-catalog-validation.json"), "utf8"));

const { applyPresentationChartFont, finalizePresentation } = await import(
  pathToFileURL(path.join(SKILL_DIR, "container_tools", "artifact_tool_utils.mjs")).href
);

await fs.mkdir(TMP_DIR, { recursive: true });
await fs.mkdir(path.dirname(FINAL_PPTX), { recursive: true });
await fs.mkdir(stagingDir, { recursive: true });

const family = "Noto Sans JP";
const W = 1280;
const H = 720;
const C = {
  ink: "#10272D", muted: "#4E666B", paper: "#F5F8F7", white: "#FFFFFF",
  teal: "#087F76", teal2: "#20A394", tealSoft: "#D9EFEB", orange: "#D96B2B",
  orangeSoft: "#F9E5D8", blue: "#2F6FA3", blueSoft: "#DDEAF5", purple: "#76518C",
  purpleSoft: "#E9E0EE", line: "#B9CBC8", grid: "#D8E4E2", yellow: "#F2C94C"
};

const displayProductName = (ball) => {
  const name = String(ball.name);
  const brand = String(ball.brand);
  return name.toLowerCase().startsWith(brand.toLowerCase()) ? name : `${brand} ${name}`;
};

const imageNames = {
  overview: "model-overview-45-35-45-hires.png",
  base: "model-layout-base-clean.png",
  drill20: "model-drill-20-hires.png",
  drill80: "model-drill-80-hires.png",
  pin15: "model-pin-15-hires.png",
  pin35: "model-pin-35-hires.png",
  pin55: "model-pin-55-hires.png",
  val20: "model-val-20-hires.png",
  val70: "model-val-70-hires.png"
};
const imageBytes = {};
for (const [key, name] of Object.entries(imageNames)) {
  imageBytes[key] = new Uint8Array(await fs.readFile(path.join(workspaceDir, "tmp", "pdfs", name)));
}

const presentation = Presentation.create({ slideSize: { width: W, height: H } });

function addBox(slide, { left, top, width, height, fill = "none", line = "none", radius = 0 }) {
  return slide.shapes.add({
    geometry: radius ? "roundRect" : "rect",
    position: { left, top, width, height },
    fill,
    line: line === "none" ? { fill: "none", width: 0 } : { fill: line, width: 1 }
  });
}

function addText(slide, text, { left, top, width, height, size = 24, color = C.ink, bold = false, align = "left", valign = "top", fill = "none" }) {
  const shape = slide.shapes.add({
    geometry: "textbox",
    position: { left, top, width, height },
    fill,
    line: { fill: "none", width: 0 }
  });
  shape.text = String(text);
  shape.text.style = {
    typeface: family,
    fontSize: size,
    bold,
    color,
    autoFit: "shrinkText",
    alignment: align,
    verticalAlignment: valign
  };
  return shape;
}

function addHeader(slide, title, number, section = "ボウリングボールのドリルレイアウト") {
  slide.background.fill = C.paper;
  addBox(slide, { left: 0, top: 0, width: W, height: 10, fill: C.teal });
  addText(slide, section, { left: 54, top: 25, width: 750, height: 28, size: 15, color: C.teal, bold: true });
  addText(slide, title, { left: 54, top: 56, width: 1120, height: 62, size: 34, bold: true });
  addText(slide, String(number).padStart(2, "0"), { left: 1180, top: 36, width: 48, height: 30, size: 16, color: C.muted, align: "right" });
  addBox(slide, { left: 54, top: 675, width: 1172, height: 1, fill: C.line });
  addText(slide, "公式カタログ値と静的穴あけモデルに基づく初心者向け講座", { left: 54, top: 684, width: 780, height: 22, size: 12, color: C.muted });
  addText(slide, `${number} / 14`, { left: 1130, top: 684, width: 96, height: 22, size: 12, color: C.muted, align: "right" });
}

function addImage(slide, key, position, alt, fit = "contain") {
  return slide.images.add({ blob: imageBytes[key], contentType: "image/png", alt, fit, position });
}

function addNotes(slide, text) {
  slide.speakerNotes.textFrame.setText(text);
}

function styleTable(table, headerFill = C.ink, headerColor = C.white) {
  table.borders.assign({ style: "solid", fill: C.line, width: 1 });
  for (let r = 0; r < table.rows.length; r += 1) {
    for (let c = 0; c < table.columns.length; c += 1) {
      const cell = table.getCell(r, c);
      cell.fill = r === 0 ? headerFill : (r % 2 ? C.white : "#EDF3F2");
    }
  }
}

function tableValues(rows) {
  return rows.map((row, rowIndex) => row.map((value) => ({
    runs: [{
      run: String(value),
      textStyle: {
        typeface: family,
        fontSize: rowIndex === 0 ? "14px" : "13px",
        bold: rowIndex === 0,
        color: C.ink
      }
    }]
  })));
}

// 1 Cover
{
  const slide = presentation.slides.add();
  slide.background.fill = C.ink;
  addBox(slide, { left: 0, top: 0, width: 14, height: H, fill: C.teal2 });
  addText(slide, "BEGINNER COURSE", { left: 64, top: 74, width: 500, height: 36, size: 18, color: C.tealSoft, bold: true });
  addText(slide, "ボウリングボールの\nドリルレイアウト", { left: 64, top: 126, width: 580, height: 170, size: 50, color: C.white, bold: true });
  addText(slide, "3つの数値とカタログ値を、完成球の重さの偏りから読み解く", { left: 66, top: 322, width: 540, height: 90, size: 24, color: "#C9DAD7" });
  addText(slide, "ドリル角 × PIN-PAP × VAL角", { left: 66, top: 465, width: 520, height: 44, size: 27, color: C.yellow, bold: true });
  addText(slide, "講座用プレゼンテーション", { left: 66, top: 564, width: 420, height: 32, size: 17, color: "#C9DAD7" });
  addImage(slide, "overview", { left: 670, top: 62, width: 560, height: 600 }, "45度、3.5インチ、45度の3Dモデル");
  addNotes(slide, "本資料は実験報告ではなく、初心者向け講座として用語、3値の読み方、実在ボールの比較、実務手順を整理したもの。モデル画像は本プロジェクトの3Dモデル。一次資料: USBC Equipment Specifications Manual、Maurice Pinel Updated Dual Angle Guide。");
}

// 2 Scope
{
  const slide = presentation.slides.add(); addHeader(slide, "この講座で区別する3つの情報", 2);
  const cols = [
    { x: 70, color: C.orange, title: "カバーと表面", body: "レーンとの摩擦を左右する。素材、仕上げ、オイル量の影響を強く受ける。" },
    { x: 444, color: C.teal, title: "コアの物理値", body: "RG、ディファレンシャルRG、非対称成分が、回転の始まりやすさと軸移動の上限を形づくる。" },
    { x: 818, color: C.blue, title: "ドリルレイアウト", body: "PAPを基準にコアと穴の向きを決める。3つの値は互いに影響し合う。" }
  ];
  for (const col of cols) {
    addBox(slide, { left: col.x, top: 176, width: 330, height: 315, fill: C.white, line: C.line, radius: 18 });
    addBox(slide, { left: col.x, top: 176, width: 330, height: 12, fill: col.color });
    addText(slide, col.title, { left: col.x + 24, top: 212, width: 280, height: 44, size: 25, bold: true, color: col.color });
    addText(slide, col.body, { left: col.x + 24, top: 282, width: 280, height: 160, size: 19, color: C.ink });
  }
  addText(slide, "この資料が扱う中心", { left: 72, top: 530, width: 260, height: 30, size: 18, color: C.teal, bold: true });
  addText(slide, "カタログ値と穴あけ位置から、完成球の静的な慣性値がどう変わるかを読む。何枚曲がるか、何フィートで曲がり始めるかは予測しない。", { left: 72, top: 566, width: 1100, height: 70, size: 22, bold: true });
  addNotes(slide, "USBC Ball Motion Studyは、カバーに関する特性を含む複数要因がボール軌道へ影響することを示している。本資料は静的慣性値とレイアウトの関係に範囲を限定する。Source: https://images.bowl.com/bowl/media/legacy/uploadedfiles/Equip_and_Specs/Equip_and_Specs_Home/08ballmotionstudy.pdf");
}

// 3 Terms
{
  const slide = presentation.slides.add(); addHeader(slide, "基準点と基準線", 3);
  addImage(slide, "pin35", { left: 66, top: 142, width: 590, height: 470 }, "PIN、PAP、PSA、VALを示すモデルのみの3D画像");
  const terms = [
    ["PAP", "投球直後の回転軸がボール表面と交わる点。レイアウトは各ボウラーのPAPから測る。", C.teal],
    ["PIN", "メーカーが示すピン。低RG軸の一端は、通常PIN中心から1インチ以内にある。", C.orange],
    ["PSA / MB", "非対称コアの好ましい回転軸を示す印。メーカーによって表記が異なる。", C.purple],
    ["VAL", "PAPを通り、投球直後の回転軸に直角な基準線。VAL角の基準になる。", C.blue]
  ];
  terms.forEach(([name, desc, color], index) => {
    const y = 150 + index * 116;
    addText(slide, name, { left: 710, top: y, width: 160, height: 34, size: 24, bold: true, color });
    addText(slide, desc, { left: 710, top: y + 39, width: 480, height: 64, size: 17 });
  });
  addNotes(slide, "USBC Equipment Specifications Manual: PINはウエイトブロック上端を示し、低RG軸の一端はPIN中心から1インチ以内。Source: https://bowl.com/getmedia/7b8b2ee2-cd3a-4fe1-ba31-1389d8fc9bbf/es_manual.pdf");
}

// 4 Layout notation
{
  const slide = presentation.slides.add(); addHeader(slide, "45° × 3.5インチ × 45°の読み方", 4);
  const items = [
    { x: 82, n: "1", value: "45°", title: "ドリル角", body: "PINとPSA / MBの向きを、PAPから見て決める角度。" , color: C.orange },
    { x: 454, n: "2", value: "3.5 in", title: "PIN-PAP", body: "PAPからPINまでの球面距離。コア軸と投球軸の離れ方を決める。", color: C.teal },
    { x: 826, n: "3", value: "45°", title: "VAL角", body: "PIN-PAP線とVALの間の角度。PIN周辺とグリップ穴の向きを決める。", color: C.blue }
  ];
  items.forEach((item) => {
    addText(slide, item.n, { left: item.x, top: 166, width: 40, height: 40, size: 20, bold: true, color: C.white, align: "center", valign: "middle", fill: item.color });
    addText(slide, item.value, { left: item.x, top: 224, width: 300, height: 76, size: 43, bold: true, color: item.color });
    addText(slide, item.title, { left: item.x, top: 312, width: 300, height: 40, size: 25, bold: true });
    addText(slide, item.body, { left: item.x, top: 367, width: 300, height: 126, size: 18 });
  });
  addBox(slide, { left: 82, top: 535, width: 1044, height: 94, fill: C.tealSoft, line: C.teal, radius: 14 });
  addText(slide, "3つの値は独立した性能つまみではない。1つを変えると、PIN、PSA / MB、グリップ穴の位置関係が変わり、完成球の慣性値も変わる。", { left: 112, top: 562, width: 984, height: 58, size: 21, bold: true });
  addNotes(slide, "Dual Angle Layout Techniqueはドリル角、PIN-PAP距離、VAL角の3要素で構成される。Source: https://wiki.maverickbowling.com/wiki/images/a/a5/Updated_Dual_Angle_Guide.pdf");
}

// 5 Catalog terms
{
  const slide = presentation.slides.add(); addHeader(slide, "カタログ値の意味", 5);
  const rows = [
    ["RG", "回転の始まりやすさ", "小さいほど慣性半径が小さく、同じ条件なら回転状態が変わりやすい"],
    ["ディファレンシャルRG", "最大RG - 最小RG", "完成球が持つ軸移動の土台。大きいほど上限が大きい"],
    ["インターミディエイト・ディファレンシャル", "最大RG - 中間RG", "非対称性の大きさ。PSA / MBの向きと関係する"],
    ["表面・カバー", "摩擦とオイルへの応答", "同じRGでも、レーン上の動きは表面素材と仕上げで変わる"]
  ];
  rows.forEach((row, index) => {
    const y = 155 + index * 112;
    addText(slide, row[0], { left: 78, top: y, width: 310, height: 40, size: 23, bold: true, color: [C.teal,C.orange,C.purple,C.blue][index] });
    addText(slide, row[1], { left: 400, top: y, width: 280, height: 40, size: 20, bold: true });
    addText(slide, row[2], { left: 700, top: y, width: 480, height: 78, size: 18 });
    if (index < rows.length - 1) addBox(slide, { left: 78, top: y + 91, width: 1100, height: 1, fill: C.line });
  });
  addText(slide, "カタログRGは穴あけ前の値。完成球では穴の体積と位置によって3方向のRGが変わる。", { left: 78, top: 600, width: 1100, height: 46, size: 22, bold: true, color: C.ink });
  addNotes(slide, "RG、Total Differential、Intermediate Differentialの定義はUSBC Ball Motion StudyおよびUSBC SOP-BALL-1に基づく。Sources: https://images.bowl.com/bowl/media/legacy/uploadedfiles/Equip_and_Specs/Equip_and_Specs_Home/08ballmotionstudy.pdf ; https://bowl.com/getmedia/e19a2c09-19b6-43fa-8773-dab22edcfecf/sop-ball-1-asymm_rg.pdf");
}

// 6 Real catalog table
{
  const slide = presentation.slides.add(); addHeader(slide, "実在6球の公式カタログ値", 6);
  const values = [["ボール（15 lb）", "コア", "RG", "Diff. RG", "Int. Diff."]];
  for (const ball of data.balls) values.push([
    displayProductName(ball),
    ball.core_type_ja,
    ball.catalog_rg_low_in.toFixed(3),
    ball.catalog_total_diff_in.toFixed(3),
    ball.catalog_intermediate_diff_in ? ball.catalog_intermediate_diff_in.toFixed(3) : "-"
  ]);
  const table = slide.tables.add({ rows: values.length, columns: 5, left: 64, top: 150, width: 1152, height: 390, columnWidths: [470,150,150,190,192], values: tableValues(values) });
  styleTable(table);
  addText(slide, "選定方針", { left: 72, top: 560, width: 170, height: 30, size: 18, color: C.teal, bold: true });
  addText(slide, "対称 / 非対称、低RG / 高RG、低ディファレンシャル / 高ディファレンシャルを横断して比較した。数値はメーカー公式ページと照合済み。", { left: 72, top: 593, width: 1110, height: 53, size: 19 });
  addNotes(slide, "Manufacturer sources: Storm Ion Max https://www.stormbowling.com/storm-ion-max-bowling-ball ; Storm Phaze II https://www.stormbowling.com/medias/Storm_Phaze%20II_tech%20sheet.pdf ; Storm Tropical Surge https://www.stormbowling.com/storm-tropical-surge-bowling-ball-black-cherry ; Hammer Black Widow 3.0 https://hammerbowling.com/products/black-widow-3-0 ; Hammer Effect Tour https://hammerbowling.com/products/hammer-effect-tour ; Hammer Purple Pearl Urethane https://hammerbowling.com/collections/mide-performance/products/purple-pearl-urethane");
}

// 7 Catalog map
{
  const slide = presentation.slides.add(); addHeader(slide, "RGとディファレンシャルRGの位置づけ", 7);
  const shortNames = ["Tropical Surge", "Phaze II", "Purple Urethane", "Effect Tour", "Ion Max", "Black Widow 3.0"];
  const colors = [C.teal, C.orange, C.purple, C.blue, "#20A394", "#B5423A"];
  const chart = slide.charts.add("scatter", {
    position: { left: 64, top: 144, width: 760, height: 455 },
    series: data.balls.map((ball, index) => ({
      name: shortNames[index], xValues: [ball.catalog_rg_low_in], values: [ball.catalog_total_diff_in],
      marker: { style: "circle", size: 11, fill: colors[index], line: { fill: colors[index], width: 1 } },
      line: { fill: "none", width: 0 }
    })),
    scatterOptions: { style: "marker", varyColors: false },
    hasLegend: true,
    legend: { position: "bottom", overlay: false, textStyle: { fill: C.ink, fontSize: 12 } },
    xAxis: { min: 2.44, max: 2.68, majorUnit: 0.04, title: { text: "RG（インチ）" }, majorGridlines: { fill: C.grid, width: 1 } },
    yAxis: { min: 0, max: 0.065, majorUnit: 0.01, numberFormatCode: "0.000", title: { text: "ディファレンシャルRG（インチ）" }, majorGridlines: { fill: C.grid, width: 1 } },
    chartFill: C.white, plotAreaFill: C.white, chartLine: { fill: C.line, width: 1 }
  });
  applyPresentationChartFont(chart, { fontFamily: family });
  addText(slide, "右へ", { left: 875, top: 185, width: 90, height: 26, size: 17, bold: true, color: C.teal });
  addText(slide, "RGが大きい", { left: 875, top: 218, width: 270, height: 38, size: 25, bold: true });
  addText(slide, "静的には回転状態が変わりにくい側。", { left: 875, top: 263, width: 310, height: 58, size: 18 });
  addText(slide, "上へ", { left: 875, top: 360, width: 90, height: 26, size: 17, bold: true, color: C.orange });
  addText(slide, "Diff. RGが大きい", { left: 875, top: 393, width: 310, height: 38, size: 25, bold: true });
  addText(slide, "軸移動の上限が大きい側。ただし表面と投球条件も必要。", { left: 875, top: 438, width: 310, height: 82, size: 18 });
  addNotes(slide, "Chart uses official 15 lb catalog data verified against manufacturer pages listed on slide 6. RG and differential alone do not predict total lane motion; USBC Ball Motion Study covers multiple contributors.");
}

// 8 PIN-PAP
{
  const slide = presentation.slides.add(); addHeader(slide, "PIN-PAP距離と軸移動の使われ方", 8);
  const pick = ["storm-phaze-ii", "hammer-hammer-effect-tour", "hammer-purple-pearl-urethane"].map((key) => data.summary.find((x) => x.key === key));
  const categories = [1,2,3,3.5,4,5,6].map(String);
  const chart = slide.charts.add("line", {
    position: { left: 64, top: 145, width: 760, height: 430 }, categories,
    series: [
      { name: "Phaze II", values: categories.map((x) => pick[0].pin_pap_effective_flare_curve[x]), line: { fill: C.orange, width: 3 }, marker: { style: "circle", size: 7, fill: C.orange } },
      { name: "Effect Tour", values: categories.map((x) => pick[1].pin_pap_effective_flare_curve[x]), line: { fill: C.blue, width: 3 }, marker: { style: "circle", size: 7, fill: C.blue } },
      { name: "Purple Urethane", values: categories.map((x) => pick[2].pin_pap_effective_flare_curve[x]), line: { fill: C.purple, width: 3 }, marker: { style: "circle", size: 7, fill: C.purple } }
    ],
    hasLegend: true, legend: { position: "bottom", overlay: false },
    xAxis: { title: { text: "PIN-PAP（インチ）" }, majorGridlines: null },
    yAxis: { min: 0, max: 0.05, majorUnit: 0.01, numberFormatCode: "0.000", title: { text: "PAP補正フレア指標（モデル独自）" }, majorGridlines: { fill: C.grid, width: 1 } },
    chartFill: C.white, plotAreaFill: C.white, chartLine: { fill: C.line, width: 1 }
  });
  applyPresentationChartFont(chart, { fontFamily: family });
  addText(slide, "基本傾向", { left: 866, top: 164, width: 250, height: 34, size: 21, bold: true, color: C.teal });
  addText(slide, "中程度の距離で指標が大きくなる傾向があり、6球中5球は3.5インチで最大。低ディファレンシャル球は例外。", { left: 866, top: 211, width: 320, height: 120, size: 19 });
  addText(slide, "例外の読み方", { left: 866, top: 372, width: 250, height: 34, size: 21, bold: true, color: C.purple });
  addText(slide, "元のディファレンシャルが非常に小さい球では、穴あけによる変化の割合が大きい。距離だけで判断しない。", { left: 866, top: 419, width: 320, height: 120, size: 19 });
  addText(slide, "この縦軸は曲がる板数ではない。", { left: 866, top: 571, width: 320, height: 34, size: 17, bold: true, color: C.orange });
  addNotes(slide, "Storm Pin Buffer Layout Guide describes 0-2 in as lower flare, 3-4 in as higher flare, and 5-6 in as lower flare. Source: https://www.stormbowling.com/storm-pin-buffer-layout-guide . The plotted vertical axis is a custom static model comparison index, not lane hook.");
}

// 9 Drilling angle
{
  const slide = presentation.slides.add(); addHeader(slide, "ドリル角が変えるもの", 9);
  addImage(slide, "drill20", { left: 64, top: 150, width: 520, height: 370 }, "ドリル角20度の3Dモデル");
  addImage(slide, "drill80", { left: 696, top: 150, width: 520, height: 370 }, "ドリル角80度の3Dモデル");
  addText(slide, "20°", { left: 76, top: 164, width: 100, height: 42, size: 27, bold: true, color: C.orange });
  addText(slide, "80°", { left: 708, top: 164, width: 100, height: 42, size: 27, bold: true, color: C.orange });
  addText(slide, "ドリル角はPSA / MB側の向きを変え、グリップ穴がコアのどこを通るかにも影響する。非対称コアでは特に、完成球の中間RGとPSA方向が変わりやすい。", { left: 94, top: 555, width: 1092, height: 77, size: 22, bold: true });
  addNotes(slide, "Maurice Pinel's guide uses a practical drilling-angle range of 10 to 90 degrees and explains its interaction with VAL angle. Source: https://wiki.maverickbowling.com/wiki/images/a/a5/Updated_Dual_Angle_Guide.pdf");
}

// 10 VAL angle
{
  const slide = presentation.slides.add(); addHeader(slide, "VAL角が変えるもの", 10);
  addImage(slide, "val20", { left: 64, top: 150, width: 520, height: 370 }, "VAL角20度の3Dモデル");
  addImage(slide, "val70", { left: 696, top: 150, width: 520, height: 370 }, "VAL角70度の3Dモデル");
  addText(slide, "20°", { left: 76, top: 164, width: 100, height: 42, size: 27, bold: true, color: C.blue });
  addText(slide, "70°", { left: 708, top: 164, width: 100, height: 42, size: 27, bold: true, color: C.blue });
  addText(slide, "VAL角はPIN-PAP線とVALの開きを変える。同じPIN-PAP距離でもPINとグリップ穴の位置関係が変わるため、穴あけ後の3方向RGは同じにならない。", { left: 94, top: 555, width: 1092, height: 77, size: 22, bold: true });
  addNotes(slide, "The VAL angle is the angle between the Pin-to-PAP line and the VAL in the Dual Angle Layout Technique. Source: https://wiki.maverickbowling.com/wiki/images/a/a5/Updated_Dual_Angle_Guide.pdf");
}

// 11 Interaction table
{
  const slide = presentation.slides.add(); addHeader(slide, "3値は組み合わせで読む", 11);
  const ion = data.summary.find((x) => x.key === "storm-ion-max");
  const surge = data.summary.find((x) => x.key === "storm-tropical-surge-black-cherry");
  const refs = ["early_transition_reference", "neutral_reference", "late_transition_reference"];
  const values = [["比較条件", "レイアウト", "Ion Max\nフレア指標", "Tropical Surge\nフレア指標", "読み取り"]];
  const labels = ["角度合計が小さい", "中央", "角度合計が大きい"];
  refs.forEach((key, index) => {
    const a = ion.reference_layouts[key]; const b = surge.reference_layouts[key];
    values.push([
      labels[index], `${a.drill_angle_deg}° × ${a.pin_pap_in.toFixed(1)} in × ${a.val_angle_deg}°`,
      a.effective_flare_diff_in.toFixed(3), b.effective_flare_diff_in.toFixed(3),
      index === 0 ? "指標が大きい" : index === 1 ? "比較基準" : "指標が小さい"
    ]);
  });
  const table = slide.tables.add({ rows: 4, columns: 5, left: 64, top: 158, width: 1152, height: 285, columnWidths: [210,270,190,210,272], values: tableValues(values) });
  styleTable(table);
  addText(slide, "同じレイアウトでも値の大きさはボールによって変わる", { left: 74, top: 485, width: 1080, height: 42, size: 28, bold: true, color: C.teal });
  addText(slide, "Ion Maxは高ディファレンシャルの非対称コア、Tropical Surgeは低ディファレンシャルの対称コア。3値は完成球の向きを変えるが、元のコアが持つ上限までは同じにしない。", { left: 74, top: 542, width: 1100, height: 89, size: 21 });
  addNotes(slide, "Values are from the project's static drilling model using official 15 lb catalog inputs, fixed PAP and grip geometry. The custom flare index is not lane hook. Comparison grid: 20/45/70 deg, 1-6 in, 20/45/70 deg, 63 conditions per ball.");
}

// 12 Real-ball validation bar chart
{
  const slide = presentation.slides.add(); addHeader(slide, "実在6球で確認した共通点と差", 12);
  const shortNames = ["Tropical Surge", "Phaze II", "Purple Urethane", "Effect Tour", "Ion Max", "Black Widow 3.0"];
  const values = data.summary.map((x) => Number(x.reference_layouts.neutral_reference.effective_flare_diff_in.toFixed(3)));
  const chart = slide.charts.add("bar", {
    position: { left: 64, top: 150, width: 735, height: 430 }, categories: shortNames,
    series: [{ name: "PAP補正フレア指標", values, fill: C.teal }],
    barOptions: { direction: "bar", grouping: "clustered", gapWidth: 38 }, hasLegend: false,
    xAxis: { min: 0, max: 0.05, majorUnit: 0.01, numberFormatCode: "0.000", majorGridlines: { fill: C.grid, width: 1 } },
    yAxis: { textStyle: { fill: C.ink, fontSize: 12 } },
    dataLabels: { showValue: true, position: "outEnd", numberFormatCode: "0.000", textStyle: { fill: C.ink, fontSize: 12, bold: true } },
    chartFill: C.white, plotAreaFill: C.white, chartLine: { fill: C.line, width: 1 }
  });
  applyPresentationChartFont(chart, { fontFamily: family });
  addText(slide, "共通点", { left: 850, top: 165, width: 260, height: 34, size: 22, bold: true, color: C.teal });
  addText(slide, "PIN-PAPは多くの球で山形の傾向を示した。", { left: 850, top: 210, width: 330, height: 70, size: 20 });
  addText(slide, "差", { left: 850, top: 320, width: 260, height: 34, size: 22, bold: true, color: C.orange });
  addText(slide, "同じ45° × 3.5 in × 45°でも、指標は約0.009から0.045まで広がった。コアの物理値を先に読む必要がある。", { left: 850, top: 365, width: 330, height: 120, size: 20 });
  addText(slide, "表面の違いはこのグラフに含めていない。", { left: 850, top: 540, width: 330, height: 42, size: 17, bold: true, color: C.purple });
  addNotes(slide, "Static-model comparison at 45 deg x 3.5 in x 45 deg. Official manufacturer inputs, 15 lb. Surface and lane friction are excluded. Data file: outputs/real-ball-catalog-validation.json.");
}

// 13 Workflow
{
  const slide = presentation.slides.add(); addHeader(slide, "実務での確認順序", 13);
  const steps = [
    ["1", "PAPを測る", "同じ数値でもPAPが違えば穴の位置は変わる。"],
    ["2", "ボールの公式値を読む", "重量別のRG、Diff. RG、Int. Diff.、コア区分を確認する。"],
    ["3", "3値を一組で決める", "ドリル角、PIN-PAP、VAL角を同時に記録する。"],
    ["4", "穴あけ後を再計算する", "穴径、穴深さ、グリップを含めて3方向RGを確認する。"],
    ["5", "レーン条件は別に合わせる", "カバー、表面、速度、回転数、オイル条件を加えて最終判断する。"]
  ];
  steps.forEach((step, index) => {
    const y = 145 + index * 98;
    addText(slide, step[0], { left: 72, top: y, width: 52, height: 52, size: 24, bold: true, color: C.white, align: "center", valign: "middle", fill: index < 3 ? C.teal : C.blue });
    addText(slide, step[1], { left: 150, top: y + 2, width: 360, height: 38, size: 24, bold: true });
    addText(slide, step[2], { left: 520, top: y + 3, width: 650, height: 55, size: 18 });
    if (index < steps.length - 1) addBox(slide, { left: 150, top: y + 76, width: 1020, height: 1, fill: C.line });
  });
  addNotes(slide, "Storm's layout guide emphasizes that layouts are measured from the bowler's PAP. Source: https://www.stormbowling.com/storm-pin-buffer-layout-guide");
}

// 14 Summary
{
  const slide = presentation.slides.add(); addHeader(slide, "講座のまとめ", 14);
  const points = [
    ["RG", "回転状態が変わり始める性質の基準。まず重量別の公式値を確認する。", C.teal],
    ["Diff. RG / Int. Diff.", "完成球が持つ軸移動の上限と非対称性の基準。表面性能とは分けて読む。", C.orange],
    ["3つのレイアウト値", "ドリル角、PIN-PAP、VAL角は一組。穴あけ後の3方向RGを同時に変える。", C.blue],
    ["最終判断", "静的計算に、カバー、表面、投球条件、レーン条件を重ねる。", C.purple]
  ];
  points.forEach((point, index) => {
    const y = 155 + index * 112;
    addBox(slide, { left: 72, top: y, width: 10, height: 78, fill: point[2] });
    addText(slide, point[0], { left: 106, top: y - 2, width: 300, height: 38, size: 24, bold: true, color: point[2] });
    addText(slide, point[1], { left: 420, top: y - 2, width: 750, height: 76, size: 21 });
  });
  addBox(slide, { left: 72, top: 596, width: 1100, height: 52, fill: C.ink, radius: 12 });
  addText(slide, "数値の大小だけでボールを選ばず、公式値、PAP、3値、表面条件の順に根拠を積み上げる。", { left: 98, top: 607, width: 1050, height: 34, size: 21, bold: true, color: C.white, align: "center" });
  addNotes(slide, "Primary sources used throughout: USBC Equipment Specifications Manual and Ball Motion Study; Maurice Pinel Updated Dual Angle Guide; Storm Pin Buffer Layout Guide; official manufacturer catalog pages listed on slide 6.");
}

const candidatePath = path.join(stagingDir, "bowling-drill-layout-beginner-course-v3-candidate.pptx");
await (await PresentationFile.exportPptx(presentation)).save(candidatePath);

const result = await finalizePresentation({
  explicitTotalSlideCount: 14,
  requiredNativeTableOwnerSlides: [6, 11],
  requiredNativeChartOwnerSlides: [7, 8, 12],
  materializeLiteralChartWorkbooks: true,
  nativeChartTargetApplication: "powerpoint",
  workspaceDir,
  candidatePath,
  finalPath: FINAL_PPTX,
  pythonExecutable: RUNTIME_PYTHON,
  integrityValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(SKILL_DIR, "container_tools", "inspect_presentation_layout_geometry.py"),
  layoutArgs: [
    "--expected-slide-size-emu", "12192000,6858000",
    "--validate-heading-fit",
    "--require-native-table-slide", "6",
    "--require-native-table-slide", "11"
  ],
  fontPolicy: { basis: "design", families: [family] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "bowling-drill-layout-beginner-course-v3.validation.json")
});

console.log(JSON.stringify({ finalPath: FINAL_PPTX, result }, null, 2));
