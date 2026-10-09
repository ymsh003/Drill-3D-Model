import { functionalAnova } from "./experiment_statistics.mjs";
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
  "normalized_axis_misalignment",
  "torque_free_axis_rate_per_spin",
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
        angle_sum_deg: drillAngle + valAngle
      });
    }
  }
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
  schema_version: 3,
  model_revision: "mass-moments-2026-09-25",
  metric_interpretation: {
    performance_diff_in: "Legacy hypot(total,int) composite, not an established flare bound or verified Radical formula.",
    effective_flare_diff_in: "Legacy composite multiplied by normalized axis misalignment; uncalibrated comparison only.",
    flare_utilization_pct: "Legacy name for 100 times normalized axis misalignment; NOT percentage of actual flare.",
    normalized_axis_misalignment: "2 norm(u cross Iu)/(Imax-Imin); dimensionless instantaneous diagnostic.",
    torque_free_axis_rate_per_spin: "norm(du/dt)/norm(omega) under zero external torque; not a lane prediction."
  },
  generated_at: new Date().toISOString(),
  experiment: "Balanced full-factorial static drilling-layout experiment over the primary-source practical range.",
  interpretation: {
    physical_outputs: "Approximate mass properties and uncalibrated axis diagnostics. No calculated value is an actual flare width or upper bound.",
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
  "drill_angle_deg", "pin_pap_in", "val_angle_deg", "angle_sum_deg",
  "mass_after_lb", "removed_mass_oz", "com_shift_in", "pap_rg_in", "pap_inertia_lb_in2",
  "rg_low_in", "rg_mid_in", "rg_high_in", "total_diff_in", "int_diff_in",
  "normalized_axis_misalignment", "torque_free_axis_rate_per_spin",
  "performance_diff_in", "effective_flare_diff_in", "flare_utilization_pct",
  "pap_to_pin_deg", "pap_to_psa_deg"
];
const csv = "\uFEFF" + [columns, ...rows.map((row) => columns.map((column) => row[column]))]
  .map((row) => row.map(csvCell).join(","))
  .join("\r\n");

fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));
fs.writeFileSync(csvPath, csv);
console.log(JSON.stringify({ jsonPath, csvPath, rowCount: rows.length }, null, 2));

