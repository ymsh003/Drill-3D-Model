import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { context, evaluate, setValue } from "./run_zero_axis_experiment.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const outputDirectory = path.join(projectRoot, "outputs");
const catalogPath = path.join(outputDirectory, "ball-spec-catalog.js");
const jsonPath = path.join(outputDirectory, "real-ball-catalog-validation.json");
const csvPath = path.join(outputDirectory, "real-ball-catalog-validation.csv");

const catalogSource = fs.readFileSync(catalogPath, "utf8");
const catalog = JSON.parse(catalogSource.slice(catalogSource.indexOf("{"), catalogSource.lastIndexOf("}") + 1));

const selected = [
  { brand: "Storm", name: "TROPICAL SURGE BLACK-CHERRY", role_ja: "高RG・低ディファレンシャルの対称コア" },
  { brand: "Storm", name: "Phaze II", role_ja: "低RG・高ディファレンシャルの対称コア" },
  { brand: "Hammer", name: "Purple Pearl Urethane", role_ja: "高RG・非常に低いディファレンシャルの対称コア" },
  { brand: "Hammer", name: "Hammer Effect Tour", role_ja: "低RG・低めのディファレンシャルを持つ非対称コア" },
  { brand: "Storm", name: "ION MAX", role_ja: "低RG・高ディファレンシャルの非対称コア" },
  { brand: "Hammer", name: "Black Widow 3.0", role_ja: "中程度のRG・高ディファレンシャルの非対称コア" }
];

const officialVerification = {
  "Storm|TROPICAL SURGE BLACK-CHERRY": "https://www.stormbowling.com/storm-tropical-surge-bowling-ball-black-cherry",
  "Storm|Phaze II": "https://www.stormbowling.com/medias/Storm_Phaze%20II_tech%20sheet.pdf",
  "Hammer|Purple Pearl Urethane": "https://hammerbowling.com/collections/mide-performance/products/purple-pearl-urethane",
  "Hammer|Hammer Effect Tour": "https://hammerbowling.com/products/hammer-effect-tour",
  "Storm|ION MAX": "https://www.stormbowling.com/storm-ion-max-bowling-ball",
  "Hammer|Black Widow 3.0": "https://hammerbowling.com/products/black-widow-3-0"
};

const levels = {
  drill_angle_deg: [20, 45, 70],
  pin_pap_in: [1, 2, 3, 3.5, 4, 5, 6],
  val_angle_deg: [20, 45, 70]
};

const referenceLayouts = [
  { key: "early_transition_reference", label_ja: "角度合計が小さい比較条件", drill_angle_deg: 20, pin_pap_in: 3.5, val_angle_deg: 20 },
  { key: "neutral_reference", label_ja: "中央の比較条件", drill_angle_deg: 45, pin_pap_in: 3.5, val_angle_deg: 45 },
  { key: "late_transition_reference", label_ja: "角度合計が大きい比較条件", drill_angle_deg: 70, pin_pap_in: 5.0, val_angle_deg: 70 }
];

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function extent(rows, key) {
  const values = rows.map((row) => row[key]).filter(Number.isFinite);
  return { min: Math.min(...values), max: Math.max(...values), span: Math.max(...values) - Math.min(...values) };
}

function selectedCatalogBalls() {
  return selected.map((selection) => {
    const ball = catalog.balls.find((candidate) => candidate.brand === selection.brand && candidate.name === selection.name);
    if (!ball) throw new Error(`Catalog ball not found: ${selection.brand} ${selection.name}`);
    const specs = ball.specsByWeight?.["15"];
    if (!specs || !Number.isFinite(specs.rg) || !Number.isFinite(specs.diff)) {
      throw new Error(`15 lb specifications are incomplete: ${selection.brand} ${selection.name}`);
    }
    const key = `${selection.brand}|${selection.name}`;
    return {
      ...selection,
      key: key.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
      core_type: ball.coreType === "asymmetric" ? "morph" : "symmetric",
      core_type_ja: ball.coreType === "asymmetric" ? "非対称" : "対称",
      cover: ball.cover,
      surface: ball.surface,
      catalog_rg_low_in: specs.rg,
      catalog_total_diff_in: specs.diff,
      catalog_intermediate_diff_in: specs.intDiff || 0,
      catalog_source_url: ball.sourceUrl,
      verified_source_url: officialVerification[key]
    };
  });
}

const balls = selectedCatalogBalls();
const original = {
  core_type: context.selectValue("layoutCoreType"),
  rg_low_in: context.value("layoutCatalogRg"),
  total_diff_in: context.value("layoutCatalogDiff"),
  intermediate_diff_in: context.value("layoutCatalogIntDiff")
};

const rows = [];
for (const ball of balls) {
  setValue("layoutCoreType", ball.core_type);
  setValue("layoutCatalogRg", ball.catalog_rg_low_in);
  setValue("layoutCatalogDiff", ball.catalog_total_diff_in);
  setValue("layoutCatalogIntDiff", ball.catalog_intermediate_diff_in);
  for (const drillAngle of levels.drill_angle_deg) {
    for (const pinPap of levels.pin_pap_in) {
      for (const valAngle of levels.val_angle_deg) {
        rows.push({
          ball_key: ball.key,
          brand: ball.brand,
          ball_name: ball.name,
          core_type_ja: ball.core_type_ja,
          catalog_rg_low_in: ball.catalog_rg_low_in,
          catalog_total_diff_in: ball.catalog_total_diff_in,
          catalog_intermediate_diff_in: ball.catalog_intermediate_diff_in,
          ...evaluate(drillAngle, pinPap, valAngle)
        });
      }
    }
  }
}

setValue("layoutCoreType", original.core_type);
setValue("layoutCatalogRg", original.rg_low_in);
setValue("layoutCatalogDiff", original.total_diff_in);
setValue("layoutCatalogIntDiff", original.intermediate_diff_in);

const summary = balls.map((ball) => {
  const sample = rows.filter((row) => row.ball_key === ball.key);
  const pinCurve = Object.fromEntries(levels.pin_pap_in.map((pinPap) => [
    String(pinPap),
    mean(sample.filter((row) => row.pin_pap_in === pinPap).map((row) => row.effective_flare_diff_in))
  ]));
  const peak = Object.entries(pinCurve).sort((a, b) => b[1] - a[1])[0];
  const references = Object.fromEntries(referenceLayouts.map((layout) => {
    const row = sample.find((candidate) =>
      candidate.drill_angle_deg === layout.drill_angle_deg
      && candidate.pin_pap_in === layout.pin_pap_in
      && candidate.val_angle_deg === layout.val_angle_deg
    );
    return [layout.key, { ...layout, ...row }];
  }));
  return {
    ...ball,
    condition_count: sample.length,
    peak_pin_pap_in: Number(peak[0]),
    peak_effective_flare_diff_in: peak[1],
    pin_pap_effective_flare_curve: pinCurve,
    ranges: {
      pap_rg_in: extent(sample, "pap_rg_in"),
      rg_low_in: extent(sample, "rg_low_in"),
      total_diff_in: extent(sample, "total_diff_in"),
      int_diff_in: extent(sample, "int_diff_in"),
      performance_diff_in: extent(sample, "performance_diff_in"),
      effective_flare_diff_in: extent(sample, "effective_flare_diff_in")
    },
    reference_layouts: references
  };
});

const payload = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  method_ja: "メーカー公式カタログの15ポンド値を静的穴あけモデルへ入力し、同じPAP・グリップ・穴径・穴深さで63条件を比較した。レーン上の軌道予測ではない。",
  catalog_updated: catalog.updated,
  weight_lb: 15,
  ranges: levels,
  reference_layouts: referenceLayouts,
  ball_count: balls.length,
  row_count: rows.length,
  balls,
  summary,
  rows
};

const columns = [
  "brand", "ball_name", "core_type_ja", "catalog_rg_low_in", "catalog_total_diff_in", "catalog_intermediate_diff_in",
  "drill_angle_deg", "pin_pap_in", "val_angle_deg", "pap_rg_in", "rg_low_in", "rg_mid_in", "rg_high_in",
  "total_diff_in", "int_diff_in", "performance_diff_in", "effective_flare_diff_in", "flare_utilization_pct", "removed_mass_oz"
];
const csvCell = (value) => /[",\r\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value);
const csv = "\uFEFF" + [columns, ...rows.map((row) => columns.map((column) => row[column]))]
  .map((row) => row.map(csvCell).join(","))
  .join("\r\n");

fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
fs.writeFileSync(csvPath, csv);
console.log(JSON.stringify({ jsonPath, csvPath, ballCount: balls.length, rowCount: rows.length, summary }, null, 2));
