import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { context, evaluate, numericRange } from "./run_zero_axis_experiment.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const outputDirectory = path.join(projectRoot, "outputs");
const jsonPath = path.join(outputDirectory, "layout-interaction-experiment-data.json");
const csvPath = path.join(outputDirectory, "layout-interaction-experiment-data.csv");

const levels = {
  drill_angle_deg: numericRange(10, 90, 10),
  pin_pap_in: numericRange(1, 6, 0.5),
  val_angle_deg: numericRange(20, 70, 10)
};

const metricKeys = [
  "pap_rg_in",
  "pap_inertia_lb_in2",
  "rg_low_in",
  "rg_mid_in",
  "rg_high_in",
  "total_diff_in",
  "int_diff_in",
  "performance_diff_in",
  "effective_flare_diff_in",
  "flare_utilization_pct",
  "removed_mass_oz",
  "com_shift_in"
];

const rows = [];
for (const drillAngle of levels.drill_angle_deg) {
  for (const pinPap of levels.pin_pap_in) {
    for (const valAngle of levels.val_angle_deg) {
      const observation = evaluate(drillAngle, pinPap, valAngle);
      rows.push({
        ...observation,
        angle_sum_deg: drillAngle + valAngle,
        source_timing_guide_pct: Math.max(0, Math.min(100, (160 - drillAngle - valAngle) / 130 * 100))
      });
    }
  }
}

function keyFor(values) {
  return values.join("|");
}

function groupMeans(data, groupKeys, metric) {
  const groups = new Map();
  for (const row of data) {
    const key = keyFor(groupKeys.map((name) => row[name]));
    const group = groups.get(key) || { sum: 0, count: 0 };
    group.sum += row[metric];
    group.count += 1;
    groups.set(key, group);
  }
  return new Map([...groups].map(([key, group]) => [key, group.sum / group.count]));
}

function functionalAnova(data, metric) {
  const factors = ["drill_angle_deg", "pin_pap_in", "val_angle_deg"];
  const grandMean = data.reduce((sum, row) => sum + row[metric], 0) / data.length;
  const oneWayMeans = Object.fromEntries(factors.map((factor) => [factor, groupMeans(data, [factor], metric)]));
  const pairs = [
    ["drill_angle_deg", "pin_pap_in"],
    ["drill_angle_deg", "val_angle_deg"],
    ["pin_pap_in", "val_angle_deg"]
  ];
  const pairMeans = Object.fromEntries(pairs.map((pair) => [pair.join("*"), groupMeans(data, pair, metric)]));
  const sums = {
    drill_angle_deg: 0,
    pin_pap_in: 0,
    val_angle_deg: 0,
    "drill_angle_deg*pin_pap_in": 0,
    "drill_angle_deg*val_angle_deg": 0,
    "pin_pap_in*val_angle_deg": 0,
    three_way: 0
  };
  const pairExtremes = Object.fromEntries(pairs.map((pair) => [pair.join("*"), { value: 0, at: null }]));
  let total = 0;
  for (const row of data) {
    const main = Object.fromEntries(factors.map((factor) => [
      factor,
      oneWayMeans[factor].get(keyFor([row[factor]])) - grandMean
    ]));
    const pairEffects = {};
    for (const pair of pairs) {
      const name = pair.join("*");
      const effect = pairMeans[name].get(keyFor(pair.map((factor) => row[factor])))
        - grandMean - main[pair[0]] - main[pair[1]];
      pairEffects[name] = effect;
      if (Math.abs(effect) > Math.abs(pairExtremes[name].value)) {
        pairExtremes[name] = {
          value: effect,
          at: Object.fromEntries(pair.map((factor) => [factor, row[factor]]))
        };
      }
    }
    const predictedWithoutThreeWay = grandMean
      + factors.reduce((sum, factor) => sum + main[factor], 0)
      + Object.values(pairEffects).reduce((sum, effect) => sum + effect, 0);
    const threeWay = row[metric] - predictedWithoutThreeWay;
    factors.forEach((factor) => { sums[factor] += main[factor] ** 2; });
    Object.entries(pairEffects).forEach(([name, effect]) => { sums[name] += effect ** 2; });
    sums.three_way += threeWay ** 2;
    total += (row[metric] - grandMean) ** 2;
  }
  const shares = Object.fromEntries(Object.entries(sums).map(([name, sum]) => [name, total > 1e-18 ? sum / total * 100 : 0]));
  return {
    grand_mean: grandMean,
    total_sum_of_squares: total,
    variance_share_pct: shares,
    strongest_pair_effect: pairExtremes
  };
}

function extrema(metric) {
  const ordered = [...rows].sort((a, b) => a[metric] - b[metric]);
  return {
    min: { value: ordered[0][metric], drill_angle_deg: ordered[0].drill_angle_deg, pin_pap_in: ordered[0].pin_pap_in, val_angle_deg: ordered[0].val_angle_deg },
    max: { value: ordered.at(-1)[metric], drill_angle_deg: ordered.at(-1).drill_angle_deg, pin_pap_in: ordered.at(-1).pin_pap_in, val_angle_deg: ordered.at(-1).val_angle_deg }
  };
}

const analysis = Object.fromEntries(metricKeys.map((metric) => [metric, {
  ...functionalAnova(rows, metric),
  extrema: extrema(metric)
}]));

const payload = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  experiment: "Balanced full-factorial static drilling-layout experiment over the primary-source practical range.",
  interpretation: {
    physical_outputs: "Post-drilling mass properties from the completed inertia tensor. Effective flare differential combines the completed-ball differential ceiling with PAP-axis misalignment.",
    timing_guide: "Source-derived guide only: a smaller drilling-angle plus VAL-angle sum indicates a faster transition; it is not a lane hook or breakpoint prediction.",
    excluded: "Lane oil, cover surface, speed loss, friction and release variability are not simulated."
  },
  ranges: levels,
  row_count: rows.length,
  fixed_inputs: {
    ball_weight_lb: context.catalogWeightPounds(),
    catalog_rg_low_in: context.value("layoutCatalogRg"),
    catalog_total_diff_in: context.value("layoutCatalogDiff"),
    catalog_intermediate_diff_in: context.value("layoutCatalogIntDiff"),
    pap_right_in: context.value("layoutPapRight"),
    pap_up_in: context.value("layoutPapUp"),
    handedness: context.selectValue("handedness"),
    core_type: context.selectValue("layoutCoreType")
  },
  analysis,
  rows
};

function csvCell(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const columns = [
  "drill_angle_deg", "pin_pap_in", "val_angle_deg", "angle_sum_deg", "source_timing_guide_pct",
  "mass_after_lb", "removed_mass_oz", "com_shift_in", "pap_rg_in", "pap_inertia_lb_in2",
  "rg_low_in", "rg_mid_in", "rg_high_in", "total_diff_in", "int_diff_in",
  "performance_diff_in", "effective_flare_diff_in", "flare_utilization_pct",
  "pap_to_pin_deg", "pap_to_psa_deg"
];
const csv = "\uFEFF" + [columns, ...rows.map((row) => columns.map((column) => row[column]))]
  .map((row) => row.map(csvCell).join(","))
  .join("\r\n");

fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
fs.writeFileSync(csvPath, csv);
console.log(JSON.stringify({ jsonPath, csvPath, rowCount: rows.length }, null, 2));
