import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { context, evaluate, setValue } from "./run_zero_axis_experiment.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const outputDirectory = path.join(projectRoot, "outputs");
const jsonPath = path.join(outputDirectory, "layout-archetype-experiment-data.json");
const csvPath = path.join(outputDirectory, "layout-archetype-experiment-data.csv");

const levels = {
  drill_angle_deg: [10, 50, 90],
  pin_pap_in: [1, 2, 3, 3.5, 4, 5, 6],
  val_angle_deg: [20, 40, 70]
};

const archetypes = [
  { key: "symmetric_low", label_ja: "対称・低RG差", core_type: "symmetric", rg_low_in: 2.52, total_diff_in: 0.030, intermediate_diff_in: 0.000 },
  { key: "symmetric_high", label_ja: "対称・高RG差", core_type: "symmetric", rg_low_in: 2.48, total_diff_in: 0.055, intermediate_diff_in: 0.000 },
  { key: "asymmetric_medium", label_ja: "非対称・中RG差", core_type: "morph", rg_low_in: 2.50, total_diff_in: 0.045, intermediate_diff_in: 0.015 },
  { key: "asymmetric_high", label_ja: "非対称・高RG差", core_type: "morph", rg_low_in: 2.48, total_diff_in: 0.055, intermediate_diff_in: 0.025 }
];

const metrics = ["pap_rg_in", "performance_diff_in", "effective_flare_diff_in", "flare_utilization_pct"];

function mean(values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function groupMean(rows, factor, metric) {
  const result = {};
  for (const level of levels[factor]) {
    result[String(level)] = mean(rows.filter((row) => row[factor] === level).map((row) => row[metric]));
  }
  return result;
}

function groupMeans(data, groupKeys, metric) {
  const groups = new Map();
  for (const row of data) {
    const key = groupKeys.map((name) => row[name]).join("|");
    const group = groups.get(key) || { sum: 0, count: 0 };
    group.sum += row[metric];
    group.count += 1;
    groups.set(key, group);
  }
  return new Map([...groups].map(([key, group]) => [key, group.sum / group.count]));
}

function varianceShares(data, metric) {
  const factors = ["drill_angle_deg", "pin_pap_in", "val_angle_deg"];
  const grand = mean(data.map((row) => row[metric]));
  const one = Object.fromEntries(factors.map((factor) => [factor, groupMeans(data, [factor], metric)]));
  const pairs = [[factors[0], factors[1]], [factors[0], factors[2]], [factors[1], factors[2]]];
  const two = Object.fromEntries(pairs.map((pair) => [pair.join("*"), groupMeans(data, pair, metric)]));
  const sums = Object.fromEntries([...factors, ...pairs.map((pair) => pair.join("*")), "three_way"].map((key) => [key, 0]));
  let total = 0;
  for (const row of data) {
    const main = Object.fromEntries(factors.map((factor) => [factor, one[factor].get(String(row[factor])) - grand]));
    const pairEffects = {};
    for (const pair of pairs) {
      const name = pair.join("*");
      pairEffects[name] = two[name].get(pair.map((factor) => row[factor]).join("|")) - grand - main[pair[0]] - main[pair[1]];
    }
    const predicted = grand + Object.values(main).reduce((sum, value) => sum + value, 0) + Object.values(pairEffects).reduce((sum, value) => sum + value, 0);
    const threeWay = row[metric] - predicted;
    for (const factor of factors) sums[factor] += main[factor] ** 2;
    for (const [name, value] of Object.entries(pairEffects)) sums[name] += value ** 2;
    sums.three_way += threeWay ** 2;
    total += (row[metric] - grand) ** 2;
  }
  return Object.fromEntries(Object.entries(sums).map(([key, value]) => [key, total > 1e-18 ? value / total * 100 : 0]));
}

const original = {
  core_type: context.selectValue("layoutCoreType"),
  rg_low_in: context.value("layoutCatalogRg"),
  total_diff_in: context.value("layoutCatalogDiff"),
  intermediate_diff_in: context.value("layoutCatalogIntDiff")
};

const rows = [];
for (const archetype of archetypes) {
  setValue("layoutCoreType", archetype.core_type);
  setValue("layoutCatalogRg", archetype.rg_low_in);
  setValue("layoutCatalogDiff", archetype.total_diff_in);
  setValue("layoutCatalogIntDiff", archetype.intermediate_diff_in);
  for (const drillAngle of levels.drill_angle_deg) {
    for (const pinPap of levels.pin_pap_in) {
      for (const valAngle of levels.val_angle_deg) {
        rows.push({
          archetype_key: archetype.key,
          archetype_label_ja: archetype.label_ja,
          catalog_rg_low_in: archetype.rg_low_in,
          catalog_total_diff_in: archetype.total_diff_in,
          catalog_intermediate_diff_in: archetype.intermediate_diff_in,
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

const summaries = archetypes.map((archetype) => {
  const sample = rows.filter((row) => row.archetype_key === archetype.key);
  const pinCurve = groupMean(sample, "pin_pap_in", "effective_flare_diff_in");
  const peak = Object.entries(pinCurve).sort((a, b) => b[1] - a[1])[0];
  return {
    ...archetype,
    condition_count: sample.length,
    mean_metrics: Object.fromEntries(metrics.map((metric) => [metric, mean(sample.map((row) => row[metric]))])),
    pin_pap_effective_flare_curve: pinCurve,
    peak_pin_pap_in: Number(peak[0]),
    peak_effective_flare_diff_in: peak[1],
    variance_share_pct: Object.fromEntries(metrics.map((metric) => [metric, varianceShares(sample, metric)]))
  };
});

const payload = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  experiment: "Cross-archetype balanced static layout comparison with all non-layout drilling inputs fixed.",
  ranges: levels,
  archetypes,
  row_count: rows.length,
  summary: summaries,
  rows
};

const columns = [
  "archetype_key", "archetype_label_ja", "catalog_rg_low_in", "catalog_total_diff_in", "catalog_intermediate_diff_in",
  "drill_angle_deg", "pin_pap_in", "val_angle_deg", "pap_rg_in", "rg_low_in", "rg_mid_in", "rg_high_in",
  "total_diff_in", "int_diff_in", "performance_diff_in", "effective_flare_diff_in", "flare_utilization_pct", "removed_mass_oz"
];
const csvCell = (value) => /[",\r\n]/.test(String(value)) ? `"${String(value).replace(/"/g, '""')}"` : String(value);
const csv = "\uFEFF" + [columns, ...rows.map((row) => columns.map((column) => row[column]))]
  .map((row) => row.map(csvCell).join(","))
  .join("\r\n");

fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
fs.writeFileSync(csvPath, csv);
console.log(JSON.stringify({ jsonPath, csvPath, rowCount: rows.length, summaries }, null, 2));
