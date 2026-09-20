import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(here, "..");
const htmlPath = path.join(projectRoot, "outputs", "bowling-drill-3d-prototype.html");
const outputPath = path.join(projectRoot, "outputs", "zero-axis-experiment-data.json");
const html = fs.readFileSync(htmlPath, "utf8");
const inlineScript = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
  .map((match) => match[1])
  .sort((a, b) => b.length - a.length)[0];

if (!inlineScript) throw new Error("Inline application script was not found.");

function extractBalanced(source, start, openChar, closeChar) {
  let depth = 0;
  let quote = null;
  let escaped = false;
  let lineComment = false;
  let blockComment = false;
  let regex = false;
  let regexClass = false;
  for (let index = start; index < source.length; index++) {
    const char = source[index];
    const next = source[index + 1];
    if (regex) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === "[") regexClass = true;
      else if (char === "]") regexClass = false;
      else if (char === "/" && !regexClass) regex = false;
      continue;
    }
    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next !== "/" && next !== "*") {
      const prefix = source.slice(start, index).trimEnd();
      const previous = prefix.at(-1) || "";
      if (!previous || "([=,:;!&|?{}>".includes(previous) || /\b(?:return|throw|case)$/.test(prefix)) {
        regex = true;
        regexClass = false;
        continue;
      }
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === openChar) depth += 1;
    if (char === closeChar) {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unclosed ${openChar}${closeChar} block.`);
}

function extractFunctions(source) {
  const results = [];
  const seen = new Set();
  const pattern = /(?:^|[^\w$])(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let match;
  while ((match = pattern.exec(source))) {
    const name = match[1];
    if (seen.has(name)) continue;
    let functionStart = source.indexOf("function", match.index);
    const asyncPrefix = source.slice(Math.max(0, functionStart - 12), functionStart).match(/async\s+$/);
    if (asyncPrefix) functionStart -= asyncPrefix[0].length;
    const parameterStart = source.indexOf("(", functionStart);
    const parameterEnd = extractBalanced(source, parameterStart, "(", ")");
    const braceStart = source.indexOf("{", parameterEnd);
    const end = extractBalanced(source, braceStart, "{", "}");
    results.push(source.slice(functionStart, end + 1));
    seen.add(name);
    pattern.lastIndex = end + 1;
  }
  return results;
}

function extractConst(source, name) {
  const marker = `const ${name} =`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Constant ${name} was not found.`);
  let quote = null;
  let escaped = false;
  let depth = 0;
  for (let index = start + marker.length; index < source.length; index++) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if ("([{ ".includes(char) && char !== " ") depth += 1;
    if (")]}".includes(char)) depth -= 1;
    if (char === ";" && depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Constant ${name} is not terminated.`);
}

function parseAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? true;
  }
  return attributes;
}

function toDataset(attributes) {
  const dataset = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (!key.startsWith("data-")) continue;
    const name = key.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
    dataset[name] = String(value);
  }
  return dataset;
}

function makeElement(attributes, value) {
  return {
    id: attributes.id,
    type: attributes.type || "text",
    min: attributes.min ?? "",
    max: attributes.max ?? "",
    step: attributes.step ?? "1",
    value: String(value ?? attributes.value ?? ""),
    defaultValue: String(attributes.value ?? ""),
    checked: Object.hasOwn(attributes, "checked"),
    dataset: toDataset(attributes),
    tagName: (attributes.__tag || "input").toUpperCase(),
    textContent: "",
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener() {},
    dispatchEvent() {}
  };
}

const elements = new Map();
for (const match of html.matchAll(/<input\b[^>]*>/gi)) {
  const attributes = parseAttributes(match[0]);
  if (!attributes.id) continue;
  attributes.__tag = "input";
  elements.set(attributes.id, makeElement(attributes));
}
for (const match of html.matchAll(/<select\b([^>]*)>([\s\S]*?)<\/select>/gi)) {
  const attributes = parseAttributes(`<select ${match[1]}>`);
  if (!attributes.id) continue;
  const options = [...match[2].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/gi)].map((optionMatch) => {
    const optionAttributes = parseAttributes(`<option ${optionMatch[1]}>`);
    return { value: optionAttributes.value ?? optionMatch[2].replace(/<[^>]+>/g, "").trim(), selected: Object.hasOwn(optionAttributes, "selected") };
  });
  const selected = options.find((option) => option.selected) || options[0] || { value: "" };
  attributes.__tag = "select";
  elements.set(attributes.id, makeElement(attributes, selected.value));
}

const inputs = new Map([...elements.values()].filter((element) => element.type === "range").map((element) => [element.id, element]));
const documentStub = {
  querySelector(selector) {
    if (selector.startsWith("#")) return elements.get(selector.slice(1)) || null;
    return null;
  },
  querySelectorAll() { return []; },
  getElementById(id) { return elements.get(id) || null; }
};

const context = {
  console,
  Math,
  Number,
  String,
  Boolean,
  Array,
  Object,
  Map,
  Set,
  Date,
  JSON,
  document: documentStub,
  inputs,
  state: { layoutOrigin: null, layoutBasis: null },
  window: {},
  navigator: {},
  performance: { now: () => 0 }
};
vm.createContext(context);

for (const source of extractFunctions(inlineScript)) {
  const name = source.match(/function\s+([A-Za-z_$][\w$]*)/)?.[1] || "anonymous";
  vm.runInContext(source, context, { filename: `drill-model-function-${name}.js` });
}

for (const name of [
  "BALL_DIAMETER",
  "THUMB_SOLID_LENGTH",
  "FINGER_GRIP_LENGTH",
  "TIP_FLAT_THICKNESS",
  "SEMI_BUMP_DEPTH",
  "SEMI_BUMP_THICKNESS",
  "GRIP_SHAPE_PRESETS",
  "DRILL_BIT_SIZES",
  "GRIP_INNER_BY_OUTER",
  "BARE_FINGER_SIZES",
  "DEFAULT_GRIP_INNER",
  "DUAL_LAYOUT_COLORS",
  "FIXED_PIN_DIRECTION"
]) {
  vm.runInContext(extractConst(inlineScript, name), context, { filename: `constant-${name}.js` });
}

function setValue(id, value) {
  const element = elements.get(id);
  if (!element) throw new Error(`Input ${id} was not found.`);
  element.value = String(value);
}

function evaluate(drillAngle, pinPap, valAngle) {
  setValue("layoutDrillAngle", drillAngle);
  setValue("layoutPinPap", pinPap);
  setValue("layoutValAngle", valAngle);
  const data = context.layout();
  context.state.layoutOrigin = data.usesDualAngleLayout ? data.dualLayout.gripCenter : null;
  context.state.layoutBasis = data.usesDualAngleLayout ? data.dualLayout.layoutBasis : null;
  data.physicalModel = context.calculatePhysicalModel(data);
  const model = data.physicalModel;
  const basis = context.physicalPrincipalBasis(data);
  const center = model.centerOfMass;
  const [rgLow, rgMid, rgHigh] = model.rgPrincipal;
  context.state.layoutOrigin = null;
  context.state.layoutBasis = null;
  return {
    drill_angle_deg: drillAngle,
    pin_pap_in: pinPap,
    val_angle_deg: valAngle,
    mass_after_lb: model.massAfter,
    removed_mass_oz: model.removedOz,
    com_shift_in: Math.hypot(center.x, center.y, center.z),
    com_x_in: center.x,
    com_y_in: center.y,
    com_z_in: center.z,
    pap_rg_in: model.rgAfter,
    pap_inertia_lb_in2: model.iAfter,
    rg_low_in: rgLow,
    rg_mid_in: rgMid,
    rg_high_in: rgHigh,
    total_diff_in: model.totalDiffAfter,
    int_diff_in: model.intDiffAfter,
    performance_diff_in: model.performanceDiffAfter,
    effective_flare_diff_in: model.effectiveFlareDiffAfter,
    flare_utilization_pct: model.flareUtilizationAfter * 100,
    pap_to_pin_deg: context.vectorAngleDegrees(model.papAxis, basis.lowAxis),
    pap_to_psa_deg: context.vectorAngleDegrees(model.papAxis, basis.highAxis)
  };
}

function numericRange(min, max, step) {
  const count = Math.round((max - min) / step);
  return Array.from({ length: count + 1 }, (_, index) => Math.round((min + index * step) * 1e9) / 1e9);
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
const baseline = evaluate(0, 0, 0);
const sweeps = [
  { key: "drill_angle", label: "ドリル角", unit: "deg", values: numericRange(-120, 120, 1), settings: (value) => [value, 0, 0] },
  { key: "pin_pap", label: "PIN-PAP", unit: "in", values: numericRange(0, 6.5, 1 / 16), settings: (value) => [0, value, 0] },
  { key: "val_angle", label: "VAL角", unit: "deg", values: numericRange(-120, 120, 1), settings: (value) => [0, 0, value] }
];

const metricKeys = [
  "mass_after_lb",
  "removed_mass_oz",
  "com_shift_in",
  "com_x_in",
  "com_y_in",
  "com_z_in",
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
  "pap_to_pin_deg",
  "pap_to_psa_deg"
];

const rows = [];
for (const sweep of sweeps) {
  for (const factorValue of sweep.values) {
    const observation = evaluate(...sweep.settings(factorValue));
    const row = {
      sweep_key: sweep.key,
      sweep_label: sweep.label,
      factor_value: factorValue,
      factor_unit: sweep.unit,
      ...observation
    };
    for (const metric of metricKeys) {
      const current = observation[metric];
      const base = baseline[metric];
      row[`delta_${metric}`] = current == null || base == null ? null : current - base;
    }
    rows.push(row);
    if (rows.length % 50 === 0) console.log(`progress ${rows.length}/587`);
  }
}

function linearFit(data, xKey, yKey) {
  const points = data.filter((row) => Number.isFinite(row[xKey]) && Number.isFinite(row[yKey]));
  const meanX = points.reduce((sum, row) => sum + row[xKey], 0) / points.length;
  const meanY = points.reduce((sum, row) => sum + row[yKey], 0) / points.length;
  const ssX = points.reduce((sum, row) => sum + (row[xKey] - meanX) ** 2, 0);
  const covariance = points.reduce((sum, row) => sum + (row[xKey] - meanX) * (row[yKey] - meanY), 0);
  const slope = ssX > 0 ? covariance / ssX : 0;
  const intercept = meanY - slope * meanX;
  const ssResidual = points.reduce((sum, row) => sum + (row[yKey] - (intercept + slope * row[xKey])) ** 2, 0);
  const ssTotal = points.reduce((sum, row) => sum + (row[yKey] - meanY) ** 2, 0);
  return { slope, intercept, r2: ssTotal > 0 ? Math.max(0, 1 - ssResidual / ssTotal) : 1 };
}

const summaries = sweeps.map((sweep) => {
  const data = rows.filter((row) => row.sweep_key === sweep.key);
  const metrics = Object.fromEntries(metricKeys.map((metric) => {
    const numeric = data.filter((row) => Number.isFinite(row[metric]));
    const minimum = numeric.reduce((best, row) => row[metric] < best[metric] ? row : best, numeric[0]);
    const maximum = numeric.reduce((best, row) => row[metric] > best[metric] ? row : best, numeric[0]);
    const fit = linearFit(numeric, "factor_value", metric);
    return [metric, {
      min: minimum?.[metric] ?? null,
      min_at: minimum?.factor_value ?? null,
      max: maximum?.[metric] ?? null,
      max_at: maximum?.factor_value ?? null,
      span: minimum && maximum ? maximum[metric] - minimum[metric] : null,
      baseline: baseline[metric],
      normalized_span_pct: minimum && maximum && baseline[metric] != null
        ? (maximum[metric] - minimum[metric]) / Math.max(Math.abs(baseline[metric]), metric.includes("diff") ? 0.001 : 1e-9) * 100
        : null,
      slope: fit.slope,
      r2: fit.r2
    }];
  }));
  return {
    sweep_key: sweep.key,
    sweep_label: sweep.label,
    factor_unit: sweep.unit,
    row_count: data.length,
    min_factor: sweep.values[0],
    max_factor: sweep.values.at(-1),
    step: sweep.values[1] - sweep.values[0],
    metrics
  };
});

const zeroRows = rows.filter((row) => row.factor_value === 0);
for (const row of zeroRows) {
  for (const metric of metricKeys) {
    if (row[metric] == null && baseline[metric] == null) continue;
    if (Math.abs(row[metric] - baseline[metric]) > 1e-10) throw new Error(`Zero baseline mismatch for ${row.sweep_key} ${metric}.`);
  }
}

const finiteCheck = rows.flatMap((row) => metricKeys
  .filter((metric) => row[metric] != null && !Number.isFinite(row[metric]))
  .map((metric) => `${row.sweep_key}:${row.factor_value}:${metric}`));
if (finiteCheck.length) throw new Error(`Non-finite results: ${finiteCheck.slice(0, 10).join(", ")}`);

const payload = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  experiment: "Each Dual Angle factor is swept over every UI-supported step while the other two factors are fixed at zero.",
  row_count: rows.length,
  unique_condition_count: rows.length - 2,
  baseline,
  fixed_inputs: {
    ball_weight_lb: context.catalogWeightPounds(),
    catalog_rg_low_in: context.value("layoutCatalogRg"),
    catalog_total_diff_in: context.value("layoutCatalogDiff"),
    catalog_intermediate_diff_in: context.value("layoutCatalogIntDiff"),
    pap_right_in: context.value("layoutPapRight"),
    pap_up_in: context.value("layoutPapUp"),
    middle_span_in: context.value("middleSpan"),
    ring_span_offset_in: context.value("ringSpanOffset"),
    bridge_in: context.value("bridge"),
    middle_depth_in: context.value("middleDrillDepth"),
    ring_depth_in: context.value("ringDrillDepth"),
    thumb_depth_in: context.value("thumbDrillDepth"),
    handedness: context.selectValue("handedness"),
    core_type: context.selectValue("layoutCoreType")
  },
  summaries,
  rows
};

fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2));
console.log(JSON.stringify({ outputPath, rowCount: rows.length, uniqueConditions: payload.unique_condition_count, zeroBaselines: zeroRows.length }, null, 2));
}

export { context, evaluate, numericRange, setValue };
