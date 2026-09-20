import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FileBlob, SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const workspaceRoot = path.resolve(projectRoot, "..", "..");
const dataPath = path.join(projectRoot, "outputs", "zero-axis-experiment-data.json");
const outputDir = path.join(workspaceRoot, "outputs", "01a0618f-0e1e-7a61-8820-a3b0483e867e");
const previewDir = path.join(projectRoot, "work", "zero-axis-preview");
const outputPath = path.join(outputDir, "drill-layout-zero-axis-experiment.xlsx");
const data = JSON.parse(await fs.readFile(dataPath, "utf8"));

const workbook = Workbook.create();
const summary = workbook.worksheets.add("Summary");
const visualization = workbook.worksheets.add("Visualization");
const measurements = workbook.worksheets.add("Measurements");
summary.showGridLines = false;
visualization.showGridLines = false;
measurements.showGridLines = false;
summary.tabColor = "#0F5F68";
visualization.tabColor = "#167381";
measurements.tabColor = "#5AAE9B";

const fontFamily = "Arial";
const dark = "#123D46";
const teal = "#167381";
const lightTeal = "#DDF2F0";
const paleBlue = "#EAF4F8";
const paleAmber = "#FFF4D6";
const body = "#17272D";
const muted = "#5D7078";
const line = "#B8CDD2";

const metricMeta = {
  mass_after_lb: ["完成球重量", "lb", "0.000000"],
  removed_mass_oz: ["除去質量", "oz", "0.000000"],
  com_shift_in: ["重心移動", "in", "0.000000"],
  com_x_in: ["重心X", "in", "0.000000"],
  com_y_in: ["重心Y", "in", "0.000000"],
  com_z_in: ["重心Z", "in", "0.000000"],
  pap_rg_in: ["PAP軸RG", "in", "0.000000"],
  pap_inertia_lb_in2: ["PAP軸慣性", "lb in²", "0.000000"],
  rg_low_in: ["主RG低", "in", "0.000000"],
  rg_mid_in: ["主RG中", "in", "0.000000"],
  rg_high_in: ["主RG高", "in", "0.000000"],
  total_diff_in: ["Total Diff", "in", "0.000000"],
  int_diff_in: ["Intermediate Diff", "in", "0.000000"],
  pap_to_pin_deg: ["PAP→PIN軸角", "deg", "0.000000"],
  pap_to_psa_deg: ["PAP→PSA軸角", "deg", "0.000000"]
};

const metricKeys = Object.keys(metricMeta);
const keySummaryMetrics = [
  "pap_inertia_lb_in2",
  "pap_rg_in",
  "total_diff_in",
  "int_diff_in",
  "rg_low_in",
  "rg_mid_in",
  "rg_high_in",
  "com_shift_in",
  "removed_mass_oz"
];

const factorUnit = { drill_angle: "deg", pin_pap: "in", val_angle: "deg" };
const factorValueFormat = { drill_angle: "0", pin_pap: "0.0000", val_angle: "0" };
const factorOrder = ["drill_angle", "pin_pap", "val_angle"];
const factorTitles = {
  drill_angle: "ドリル角",
  pin_pap: "PIN-PAP",
  val_angle: "VAL角"
};

function responseLabel(metric) {
  if (Math.abs(metric.span) < 1e-12) return "一定";
  if (metric.r2 < 0.8) return "非線形";
  return metric.slope > 0 ? "増加傾向" : "減少傾向";
}

function columnName(indexOneBased) {
  let index = indexOneBased;
  let name = "";
  while (index > 0) {
    index -= 1;
    name = String.fromCharCode(65 + index % 26) + name;
    index = Math.floor(index / 26);
  }
  return name;
}

function styleTitle(sheet, address) {
  const range = sheet.getRange(address);
  range.format.font = { name: fontFamily, size: 16, bold: true, color: dark };
  range.format.rowHeight = 25;
}

function styleSection(sheet, address) {
  const range = sheet.getRange(address);
  range.format.fill = lightTeal;
  range.format.font = { name: fontFamily, size: 11, bold: true, color: dark };
  range.format.borders = { preset: "outside", style: "thin", color: line };
  range.format.rowHeight = 22;
}

function styleHeader(range) {
  range.format.fill = dark;
  range.format.font = { name: fontFamily, size: 10, bold: true, color: "#FFFFFF" };
  range.format.horizontalAlignment = "center";
  range.format.verticalAlignment = "center";
  range.format.wrapText = true;
  range.format.borders = {
    bottom: { style: "medium", color: "#FFFFFF" },
    insideVertical: { style: "thin", color: "#FFFFFF" }
  };
}

summary.getRange("A2").values = [["Dual Angle 1因子ゼロ基準実験"]];
styleTitle(summary, "A2");
summary.getRange("A3").values = [["各走査では対象因子だけを全入力刻みで変更し、ほかの2因子を0に固定。全ゼロを共通基準とした静的完成球モデルの比較。"]];
summary.getRange("A3:R3").format.font = { name: fontFamily, size: 10, italic: true, color: muted };
summary.getRange("A3:R3").format.borders = { bottom: { style: "thin", color: teal } };

summary.getRange("A5:H5").values = [["全ゼロ基準", "値", "指標", "値", "指標", "値", "検証", "値"]];
styleHeader(summary.getRange("A5:H5"));
summary.getRange("A6:H7").values = [
  ["PAP軸慣性 (lb in²)", data.baseline.pap_inertia_lb_in2, "PAP軸RG (in)", data.baseline.pap_rg_in, "Total Diff (in)", data.baseline.total_diff_in, "観測行", data.row_count],
  ["Intermediate Diff (in)", data.baseline.int_diff_in, "完成球重量 (lb)", data.baseline.mass_after_lb, "除去質量 (oz)", data.baseline.removed_mass_oz, "固有条件", data.unique_condition_count]
];
summary.getRange("A6:H7").format.font = { name: fontFamily, size: 10, color: body };
summary.getRange("A6:H7").format.verticalAlignment = "center";
for (const address of ["B6:B7", "D6:D7", "F6:F7", "H6:H7"]) summary.getRange(address).format.numberFormat = "0.000000";
summary.getRange("A6:H7").format.borders = { preset: "inside", style: "thin", color: "#DDE8EA" };

summary.getRange("O5").values = [["主要結果"]];
styleSection(summary, "O5:R5");
const pinSummary = data.summaries.find((item) => item.sweep_key === "pin_pap");
const drillSummary = data.summaries.find((item) => item.sweep_key === "drill_angle");
const valSummary = data.summaries.find((item) => item.sweep_key === "val_angle");
const findings = [
  `PIN-PAPのみがPAP軸とPIN低RG軸の関係を直接変更。0–6.5 inでPAP軸慣性は${pinSummary.metrics.pap_inertia_lb_in2.span.toFixed(6)} lb in²（基準比${pinSummary.metrics.pap_inertia_lb_in2.normalized_span_pct.toFixed(3)}%）変化。`,
  `PIN-PAPのPAP軸RGは${pinSummary.metrics.pap_rg_in.min.toFixed(6)}–${pinSummary.metrics.pap_rg_in.max.toFixed(6)} in。最大値は${pinSummary.metrics.pap_rg_in.max_at.toFixed(4)} inで発生。`,
  `ドリル角・VAL角ではPAP=PINのためPAP軸慣性の変化幅は各${drillSummary.metrics.pap_inertia_lb_in2.span.toFixed(9)} lb in²。主RGとDiffは穴配置の回転により非線形に変化。`,
  `ドリル角θとVAL角−θの結果は数値誤差${(4.440892098500626e-16).toExponential(1)}以内で一致。ゼロ条件では両因子が同じ配置回転を逆符号で表す。`,
  `穴径・深さを固定したため、全587行で除去質量は${data.baseline.removed_mass_oz.toFixed(6)} ozのまま。変化は除去位置と軸投影による。`
];
summary.getRange("O6:O10").values = findings.map((finding) => [finding]);
summary.getRange("O6:R10").format.font = { name: fontFamily, size: 10, color: body };
summary.getRange("O6:O10").format.wrapText = true;
summary.getRange("O6:O10").format.rowHeight = 58;
summary.getRange("O6:O10").format.fill = paleBlue;

summary.getRange("A9:M9").values = [["因子", "指標", "単位", "基準", "最小", "最小時の入力", "最大", "最大時の入力", "変化幅", "基準比", "傾き/入力単位", "R²", "応答"]];
styleHeader(summary.getRange("A9:M9"));
const effectRows = [];
for (const factor of data.summaries) {
  for (const metricKey of keySummaryMetrics) {
    const metric = factor.metrics[metricKey];
    const [label, unit] = metricMeta[metricKey];
    effectRows.push([
      factor.sweep_label,
      label,
      unit,
      metric.baseline,
      metric.min,
      metric.min_at,
      metric.max,
      metric.max_at,
      metric.span,
      metric.normalized_span_pct / 100,
      metric.slope,
      metric.r2,
      responseLabel(metric)
    ]);
  }
}
summary.getRange(`A10:M${9 + effectRows.length}`).values = effectRows;
summary.getRange(`A10:M${9 + effectRows.length}`).format.font = { name: fontFamily, size: 10, color: body };
summary.getRange(`D10:I${9 + effectRows.length}`).format.numberFormat = "0.000000";
summary.getRange(`J10:J${9 + effectRows.length}`).format.numberFormat = "0.000%";
summary.getRange(`K10:K${9 + effectRows.length}`).format.numberFormat = "0.000000";
summary.getRange(`L10:L${9 + effectRows.length}`).format.numberFormat = "0.000";
summary.getRange(`A10:M${9 + effectRows.length}`).format.borders = { bottom: { style: "thin", color: "#E0E9EB" } };
summary.getRange(`J10:J${9 + effectRows.length}`).conditionalFormats.add("colorScale", {
  colors: ["#FFFFFF", "#FFF0B8", "#F0A25A"],
  thresholds: ["min", { type: "percentile", value: 50 }, "max"]
});

const effectEndRow = 9 + effectRows.length;
const effectTable = summary.tables.add(`A9:M${effectEndRow}`, true, "EffectSummaryTable");
effectTable.style = "TableStyleMedium2";

const headers = [
  "sweep_key",
  "sweep_label",
  "factor_value",
  "factor_unit",
  "drill_angle_deg",
  "pin_pap_in",
  "val_angle_deg",
  ...metricKeys,
  ...metricKeys.map((key) => `delta_${key}`),
  "pap_inertia_change_pct",
  "total_diff_change_pct",
  "int_diff_change_pct"
];
const measurementRows = data.rows.map((row) => [
  row.sweep_key,
  row.sweep_label,
  row.factor_value,
  row.factor_unit,
  row.drill_angle_deg,
  row.pin_pap_in,
  row.val_angle_deg,
  ...metricKeys.map((key) => row[key]),
  ...metricKeys.map((key) => row[`delta_${key}`]),
  (row.pap_inertia_lb_in2 - data.baseline.pap_inertia_lb_in2) / Math.abs(data.baseline.pap_inertia_lb_in2),
  (row.total_diff_in - data.baseline.total_diff_in) / Math.abs(data.baseline.total_diff_in),
  (row.int_diff_in - data.baseline.int_diff_in) / Math.abs(data.baseline.int_diff_in)
]);

measurements.getRange("A1").values = [["全入力刻みの観測データ"]];
styleTitle(measurements, "A1");
measurements.getRange("A2").values = [[`生成日時 ${data.generated_at}。各行は1条件。対象以外のDual Angle 2因子は0。0条件は走査別に3行保持。`]];
measurements.getRange("A2:AN2").format.font = { name: fontFamily, size: 9, italic: true, color: muted };
measurements.getRange("A4").write([headers, ...measurementRows]);
const lastColumn = columnName(headers.length);
const lastRow = 4 + measurementRows.length;
styleHeader(measurements.getRange(`A4:${lastColumn}4`));
measurements.getRange(`A5:${lastColumn}${lastRow}`).format.font = { name: fontFamily, size: 9, color: body };
measurements.getRange(`C5:${lastColumn}${lastRow}`).format.numberFormat = "0.000000";
measurements.getRange(`${columnName(headers.indexOf("pap_inertia_change_pct") + 1)}5:${lastColumn}${lastRow}`).format.numberFormat = "0.0000%";
const measurementTable = measurements.tables.add(`A4:${lastColumn}${lastRow}`, true, "MeasurementsTable");
measurementTable.style = "TableStyleMedium2";
measurements.freezePanes.freezeRows(4);
measurements.freezePanes.freezeColumns(4);

const widthByHeader = {
  sweep_key: 16,
  sweep_label: 12,
  factor_value: 12,
  factor_unit: 10,
  drill_angle_deg: 14,
  pin_pap_in: 12,
  val_angle_deg: 14
};
headers.forEach((header, index) => {
  const column = columnName(index + 1);
  measurements.getRange(`${column}:${column}`).format.columnWidth = widthByHeader[header] || (header.startsWith("delta_") ? 16 : 15);
});

visualization.mergeCells("A2:R2");
visualization.getRange("A2").values = [["入力因子別の物理応答"]];
styleTitle(visualization, "A2");
visualization.mergeCells("A3:R3");
visualization.getRange("A3").values = [["各列は対象因子だけを可変とし、ほかの2因子を0に固定。横軸の全入力刻みを表示。グラフごとに縦軸の単位と縮尺が異なる。"]];
visualization.getRange("A3:R3").format.font = { name: fontFamily, size: 10, italic: true, color: muted };
visualization.getRange("A3:R3").format.borders = { bottom: { style: "thin", color: teal } };

const visualizationSections = [
  { row: 5, title: "PAP軸慣性の基準差", metricColumns: ["delta_pap_inertia_lb_in2"], labels: ["PAP軸慣性の基準差"], unit: "lb in²", format: "0.0000", colors: ["#167381"] },
  { row: 27, title: "RGの変化", metricColumns: ["pap_rg_in", "rg_low_in", "rg_mid_in", "rg_high_in"], labels: ["PAP軸RG", "主RG低", "主RG中", "主RG高"], unit: "in", format: "0.0000", colors: ["#7B3FA1", "#2A9D8F", "#E9C46A", "#E76F51"] },
  { row: 51, title: "Diffの変化", metricColumns: ["total_diff_in", "int_diff_in"], labels: ["Total Diff", "Intermediate Diff"], unit: "in", format: "0.0000", colors: ["#167381", "#F4A261"] },
  { row: 75, title: "重心座標の変化", metricColumns: ["com_x_in", "com_y_in", "com_z_in"], labels: ["重心X", "重心Y", "重心Z"], unit: "in", format: "0.000", colors: ["#2A9D8F", "#E76F51", "#577590"] }
];

for (const section of visualizationSections) {
  visualization.getRange(`A${section.row}`).values = [[section.title]];
  styleSection(visualization, `A${section.row}:R${section.row}`);
}

const chartDataHeaders = [
  "input",
  "delta_pap_inertia_lb_in2",
  "pap_rg_in",
  "rg_low_in",
  "rg_mid_in",
  "rg_high_in",
  "total_diff_in",
  "int_diff_in",
  "com_x_in",
  "com_y_in",
  "com_z_in"
];
const chartDataDisplayHeaders = [
  "入力",
  "PAP軸慣性の基準差",
  "PAP軸RG",
  "主RG低",
  "主RG中",
  "主RG高",
  "Total Diff",
  "Intermediate Diff",
  "重心X",
  "重心Y",
  "重心Z"
];
const chartDataStartRows = { drill_angle: 2, pin_pap: 246, val_angle: 354 };
const chartDataColumnStart = 20;
const chartDataStartColumnName = columnName(chartDataColumnStart);
const chartDataEndColumnName = columnName(chartDataColumnStart + chartDataHeaders.length - 1);
visualization.getRange(`${chartDataStartColumnName}1`).values = [["グラフ参照データ"]];
visualization.getRange(`${chartDataStartColumnName}1:${chartDataEndColumnName}1`).format.font = { name: fontFamily, size: 10, bold: true, color: dark };

const chartRanges = {};
for (const factor of factorOrder) {
  const rows = data.rows.filter((row) => row.sweep_key === factor);
  const headerRow = chartDataStartRows[factor];
  const matrix = [chartDataDisplayHeaders, ...rows.map((row) => [
    row.factor_value,
    row.delta_pap_inertia_lb_in2,
    row.pap_rg_in,
    row.rg_low_in,
    row.rg_mid_in,
    row.rg_high_in,
    row.total_diff_in,
    row.int_diff_in,
    row.com_x_in,
    row.com_y_in,
    row.com_z_in
  ])];
  visualization.getRange(`${chartDataStartColumnName}${headerRow}`).write(matrix);
  const dataEndRow = headerRow + rows.length;
  styleHeader(visualization.getRange(`${chartDataStartColumnName}${headerRow}:${chartDataEndColumnName}${headerRow}`));
  visualization.getRange(`${chartDataStartColumnName}${headerRow}:${chartDataEndColumnName}${dataEndRow}`).format.font = { name: fontFamily, size: 9, color: body };
  visualization.getRange(`${chartDataStartColumnName}${headerRow}:${chartDataEndColumnName}${dataEndRow}`).format.numberFormat = "0.000000";
  chartRanges[factor] = { headerRow, dataEndRow };
}
visualization.getRange(`${chartDataStartColumnName}:${chartDataStartColumnName}`).format.columnWidth = 13;
for (let index = 1; index < chartDataHeaders.length; index += 1) {
  const column = columnName(chartDataColumnStart + index);
  visualization.getRange(`${column}:${column}`).format.columnWidth = 18;
}

const chartColumnPositions = {
  drill_angle: ["A", "F"],
  pin_pap: ["G", "L"],
  val_angle: ["M", "R"]
};
const chartMetricIndexes = Object.fromEntries(chartDataHeaders.map((header, index) => [header, index]));

function addVisualizationChart(factor, section, topRow, bottomRow) {
  const { headerRow, dataEndRow } = chartRanges[factor];
  const sourceRanges = [visualization.getRange(`${chartDataStartColumnName}${headerRow}:${chartDataStartColumnName}${dataEndRow}`)];
  for (const metric of section.metricColumns) {
    const column = columnName(chartDataColumnStart + chartMetricIndexes[metric]);
    sourceRanges.push(visualization.getRange(`${column}${headerRow}:${column}${dataEndRow}`));
  }
  const chart = visualization.charts.add("line", sourceRanges);
  const [leftColumn, rightColumn] = chartColumnPositions[factor];
  chart.setPosition(`${leftColumn}${topRow}`, `${rightColumn}${bottomRow}`);
  chart.title = `${factorTitles[factor]}: ${section.title} (${section.unit})`;
  chart.titleTextStyle.typeface = fontFamily;
  chart.titleTextStyle.fontSize = 12;
  chart.hasLegend = section.metricColumns.length > 1;
  if (section.metricColumns.length > 1) chart.legend = { position: "top", textStyle: { typeface: fontFamily, fontSize: 9 } };
  chart.xAxis = {
    axisType: "textAxis",
    tickLabelInterval: factor === "pin_pap" ? 8 : 30,
    textStyle: { typeface: fontFamily, fontSize: 9 }
  };
  chart.yAxis = {
    numberFormatCode: section.format,
    numberFormatSourceLinked: false,
    textStyle: { typeface: fontFamily, fontSize: 9 }
  };
  chart.xAxis.title.text = factor === "pin_pap" ? "PIN-PAP (in)" : `${factorTitles[factor]} (deg)`;
  chart.yAxis.title.text = section.unit;
  chart.series.items.forEach((series, index) => {
    series.line = { fill: section.colors[index], style: "solid", width: 2 };
  });
  return chart;
}

for (const factor of factorOrder) {
  addVisualizationChart(factor, visualizationSections[0], 6, 25);
  addVisualizationChart(factor, visualizationSections[1], 28, 49);
  addVisualizationChart(factor, visualizationSections[2], 52, 73);
  addVisualizationChart(factor, visualizationSections[3], 76, 97);
}

visualization.mergeCells("A99:R99");
visualization.getRange("A99").values = [["除去質量と完成球重量は全587条件で一定のため、変化グラフから除外。PAP軸慣性のグラフは全ゼロ基準との差を表示。"]];
visualization.getRange("A99:R99").format.font = { name: fontFamily, size: 9, italic: true, color: muted };
visualization.getRange("A1:R100").format.verticalAlignment = "center";
const visualizationWidths = { A: 17, B: 17, C: 17, D: 17, E: 17, F: 3, G: 17, H: 17, I: 17, J: 17, K: 17, L: 3, M: 17, N: 17, O: 17, P: 17, Q: 17, R: 3 };
for (const [column, width] of Object.entries(visualizationWidths)) visualization.getRange(`${column}:${column}`).format.columnWidth = width;

summary.getRange("A39").values = [["PAP軸慣性の変化"]];
styleSection(summary, "A39:R39");
const factorRanges = {
  drill_angle: [5, 245],
  pin_pap: [246, 350],
  val_angle: [351, 591]
};
const chartPositions = {
  drill_angle: ["A40", "F55"],
  pin_pap: ["G40", "L55"],
  val_angle: ["M40", "R55"]
};
const factorColumn = columnName(headers.indexOf("factor_value") + 1);
const deltaInertiaColumn = columnName(headers.indexOf("delta_pap_inertia_lb_in2") + 1);
for (const factor of ["drill_angle", "pin_pap", "val_angle"]) {
  const [start, end] = factorRanges[factor];
  const chart = summary.charts.add("line", [
    measurements.getRange(`${factorColumn}${start}:${factorColumn}${end}`),
    measurements.getRange(`${deltaInertiaColumn}${start}:${deltaInertiaColumn}${end}`)
  ]);
  chart.setPosition(...chartPositions[factor]);
  chart.title = `${factorTitles[factor]}のみ可変: ΔPAP軸慣性 (lb in²)`;
  chart.titleTextStyle.typeface = fontFamily;
  chart.titleTextStyle.fontSize = 12;
  chart.hasLegend = false;
  chart.xAxis = { axisType: "textAxis", tickLabelInterval: factor === "pin_pap" ? 8 : 30, textStyle: { typeface: fontFamily, fontSize: 9 } };
  chart.yAxis = { numberFormatCode: "0.0000", numberFormatSourceLinked: false, textStyle: { typeface: fontFamily, fontSize: 9 } };
  chart.xAxis.title.text = factor === "pin_pap" ? "PIN-PAP (in)" : `${factorTitles[factor]} (deg)`;
  chart.yAxis.title.text = "基準差 (lb in²)";
  if (chart.series.items[0]) chart.series.items[0].fill = teal;
}

summary.getRange("A58:H58").values = [["固定入力", "値", "固定入力", "値", "固定入力", "値", "固定入力", "値"]];
styleHeader(summary.getRange("A58:H58"));
const fixedEntries = Object.entries(data.fixed_inputs);
const fixedRows = [];
for (let index = 0; index < fixedEntries.length; index += 4) {
  const row = [];
  for (let pair = 0; pair < 4; pair++) {
    const entry = fixedEntries[index + pair];
    row.push(entry?.[0] ?? "", entry?.[1] ?? "");
  }
  fixedRows.push(row);
}
summary.getRange(`A59:H${58 + fixedRows.length}`).values = fixedRows;
summary.getRange(`A59:H${58 + fixedRows.length}`).format.font = { name: fontFamily, size: 9, color: body };
for (const column of ["B", "D", "F", "H"]) summary.getRange(`${column}59:${column}${58 + fixedRows.length}`).format.numberFormat = "0.000000";

summary.getRange("J58").values = [["解釈上の注意"]];
styleSection(summary, "J58:R58");
summary.getRange("J59:J63").values = [
  ["0を含む条件は因子分離のための数学的実験条件であり、MoRich原典の施工推奨範囲を意味しない。"],
  ["完成球値は一様密度の穴除去モデル。カバー・外核・内核の密度差、グリップ、接着剤、穴の交差体積は含まない。"],
  ["ドリル角とVAL角の単独走査はPIN-PAP=0のため、PAP軸とPIN軸が一致した状態での配置回転を比較している。"],
  ["主RG・Diffの極値は非線形で、端点だけでは把握できない。Measurementsシートに全587観測を保持。"],
  ["軸定義: PIN=低RG、PSA=高RG、残る直交軸=中間RG。Intermediate Diff=高RG−中間RG。"]
];
for (let row = 59; row <= 63; row += 1) summary.mergeCells(`J${row}:R${row}`);
summary.getRange("J59:R63").format.font = { name: fontFamily, size: 9, color: body };
summary.getRange("J59:R63").format.wrapText = true;
summary.getRange("J59:R63").format.rowHeight = 31;
summary.getRange("J59:R63").format.fill = paleAmber;

summary.getRange("J65:J67").values = [
  ["一次資料"],
  ["MoRich Dual Angle Layout Technique: https://www.buddiesproshop.com/content/DualAngle.pdf"],
  ["USBC SOP-BALL-1: https://images.bowl.com/bowl/media/assets/usbc/equipment%20specs/sop-ball-1-asymm_rg.pdf"]
];
summary.getRange("J65:J65").format.font = { name: fontFamily, size: 10, bold: true, color: dark };
summary.getRange("J66:J67").format.font = { name: fontFamily, size: 8, color: muted };

const summaryWidths = { A: 20, B: 18, C: 17, D: 14, E: 16, F: 14, G: 16, H: 14, I: 14, J: 14, K: 14, L: 12, M: 15, N: 3, O: 48, P: 10, Q: 10, R: 10 };
for (const [column, width] of Object.entries(summaryWidths)) summary.getRange(`${column}:${column}`).format.columnWidth = width;
summary.getRange("A1:R70").format.verticalAlignment = "center";
summary.freezePanes.freezeRows(3);

workbook.recalculate();
await fs.mkdir(outputDir, { recursive: true });
await fs.mkdir(previewDir, { recursive: true });

const summaryPreview = await workbook.render({ sheetName: "Summary", range: "A1:R68", scale: 1.2, format: "png" });
await fs.writeFile(path.join(previewDir, "summary.png"), new Uint8Array(await summaryPreview.arrayBuffer()));
const visualizationPreviewTop = await workbook.render({ sheetName: "Visualization", range: "A1:R49", scale: 1.2, format: "png" });
await fs.writeFile(path.join(previewDir, "visualization-top.png"), new Uint8Array(await visualizationPreviewTop.arrayBuffer()));
const visualizationPreviewBottom = await workbook.render({ sheetName: "Visualization", range: "A50:R100", scale: 1.2, format: "png" });
await fs.writeFile(path.join(previewDir, "visualization-bottom.png"), new Uint8Array(await visualizationPreviewBottom.arrayBuffer()));
const measurementsPreview = await workbook.render({ sheetName: "Measurements", range: "A1:P28", scale: 1.2, format: "png" });
await fs.writeFile(path.join(previewDir, "measurements.png"), new Uint8Array(await measurementsPreview.arrayBuffer()));
const measurementsDeltaPreview = await workbook.render({ sheetName: "Measurements", range: `Q1:${lastColumn}28`, scale: 1.2, format: "png" });
await fs.writeFile(path.join(previewDir, "measurements-deltas.png"), new Uint8Array(await measurementsDeltaPreview.arrayBuffer()));

const summaryInspect = await workbook.inspect({
  kind: "table",
  range: "Summary!A1:M37",
  include: "values,formulas",
  tableMaxRows: 40,
  tableMaxCols: 13,
  maxChars: 12000
});
console.log("SUMMARY_INSPECT");
console.log(summaryInspect.ndjson);
const errorInspect = await workbook.inspect({
  kind: "match",
  searchTerm: "#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!",
  options: { useRegex: true, maxResults: 100 },
  summary: "final formula error scan"
});
console.log("ERROR_INSPECT");
console.log(errorInspect.ndjson);
const visualizationInspect = await workbook.inspect({
  kind: "drawing,table",
  sheetId: "Visualization",
  range: "A1:R100",
  include: "values,formulas",
  tableMaxRows: 8,
  tableMaxCols: 8,
  maxChars: 12000
});
console.log("VISUALIZATION_INSPECT");
console.log(visualizationInspect.ndjson);

const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);
const reopened = await SpreadsheetFile.importXlsx(await FileBlob.load(outputPath));
const reopenedSheets = await reopened.inspect({ kind: "sheet", include: "id,name" });
const reopenedSummary = await reopened.inspect({
  kind: "table",
  range: "Summary!A5:H7",
  include: "values,formulas",
  tableMaxRows: 3,
  tableMaxCols: 8,
  maxChars: 3000
});
const reopenedVisualizationDrawings = await reopened.inspect({
  kind: "drawing",
  sheetId: "Visualization",
  maxChars: 12000
});
const reopenedVisualizationData = await reopened.inspect({
  kind: "table",
  range: "Visualization!T2:AD4",
  include: "values,formulas",
  tableMaxRows: 3,
  tableMaxCols: 11,
  maxChars: 5000
});
console.log("REOPENED_SHEETS");
console.log(reopenedSheets.ndjson);
console.log("REOPENED_SUMMARY");
console.log(reopenedSummary.ndjson);
console.log("REOPENED_VISUALIZATION_DRAWINGS");
console.log(reopenedVisualizationDrawings.ndjson);
console.log("REOPENED_VISUALIZATION_DATA");
console.log(reopenedVisualizationData.ndjson);
console.log(JSON.stringify({ outputPath, rowCount: measurementRows.length, lastColumn, lastRow, summaryChartCount: summary.charts.items.length, visualizationChartCount: visualization.charts.items.length, previewDir }, null, 2));
process.exit(0);
