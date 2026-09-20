import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const html = fs.readFileSync(new URL("../outputs/bowling-drill-3d-prototype.html", import.meta.url), "utf8");

for (const id of [
  "runStaticExperiment",
  "exportStaticExperimentCsv",
  "clearStaticExperiment",
  "staticExperimentBaseline",
  "staticExperimentInfluence",
  "staticExperimentOfat",
  "staticExperimentInteractions",
  "staticExperimentCompound"
]) {
  assert.match(html, new RegExp(`id=["']${id}["']`), `${id} is missing`);
}

for (const marker of [
  "function runStaticExperiment()",
  "function evaluateStaticExperiment(overrides)",
  "function calculateStaticInteractions(baseline, compound, levelsByFactor)",
  "function exportStaticExperimentCsv()",
  "factorial_3_level",
  "same_energy_rpm_delta_at_350"
]) {
  assert.ok(html.includes(marker), `${marker} is missing`);
}

function extractFunction(name) {
  const start = html.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} not found`);
  const braceStart = html.indexOf("{", start);
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = braceStart; index < html.length; index++) {
    const char = html[index];
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
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return html.slice(start, index + 1);
    }
  }
  throw new Error(`${name} is not closed`);
}

const sandbox = {
  clamp: (number, min, max) => Math.min(max, Math.max(min, number))
};
vm.createContext(sandbox);
for (const name of ["staticUniqueNumbers", "staticSweepLevels", "staticThreeLevelWindow", "staticMetricEffect", "staticFarthestLevel", "calculateStaticInteractions"]) {
  vm.runInContext(`${extractFunction(name)}; this.${name} = ${name};`, sandbox);
}

const drillFactor = { key: "drillAngle", sweepMin: 10, sweepMax: 90, sweepStep: 10 };
assert.deepEqual(Array.from(sandbox.staticSweepLevels(drillFactor, 45)), [10, 20, 30, 40, 45, 50, 60, 70, 80, 90]);
assert.deepEqual(Array.from(sandbox.staticThreeLevelWindow(45, -120, 120, 20)), [25, 45, 65]);
assert.deepEqual(Array.from(sandbox.staticThreeLevelWindow(4.5, 0, 6.5, 1)), [3.5, 4.5, 5.5]);
assert.deepEqual(Array.from(sandbox.staticThreeLevelWindow(-120, -120, 120, 20)), [-120, -100, -80]);

const levels = [
  sandbox.staticThreeLevelWindow(45, -120, 120, 20),
  sandbox.staticThreeLevelWindow(4.5, 0, 6.5, 1),
  sandbox.staticThreeLevelWindow(45, -120, 120, 20)
];
assert.equal(levels.reduce((count, values) => count * values.length, 1), 27);

const effect = sandbox.staticMetricEffect(
  [{ drillAngle: 10, papInertia: 20 }, { drillAngle: 20, papInertia: 22 }, { drillAngle: 30, papInertia: 24 }],
  { key: "drillAngle" },
  { key: "papInertia", label: "PAP軸 I", floor: 1 },
  { papInertia: 22 }
);
assert.equal(effect.span, 4);
assert.ok(effect.r2 > 0.999999);
assert.equal(effect.direction, "増加傾向 ↗");

sandbox.STATIC_EXPERIMENT_FACTORS = [
  { key: "drillAngle", label: "ドリル角" },
  { key: "pinPap", label: "PIN-PAP" },
  { key: "valAngle", label: "VAL角" }
];
sandbox.STATIC_EXPERIMENT_METRICS = [{ key: "papInertia" }];
const baseline = { drillAngle: 1, pinPap: 1, valAngle: 1, papInertia: 19 };
const compoundLevels = { drillAngle: [0, 1, 2], pinPap: [0, 1, 2], valAngle: [0, 1, 2] };
const additive = [];
const interacting = [];
for (const drillAngle of compoundLevels.drillAngle) {
  for (const pinPap of compoundLevels.pinPap) {
    for (const valAngle of compoundLevels.valAngle) {
      additive.push({ drillAngle, pinPap, valAngle, papInertia: 10 + 2 * drillAngle + 3 * pinPap + 4 * valAngle });
      interacting.push({ drillAngle, pinPap, valAngle, papInertia: 10 + 2 * drillAngle + 3 * pinPap + 4 * valAngle + 5 * drillAngle * pinPap });
    }
  }
}
assert.deepEqual(
  Array.from(sandbox.calculateStaticInteractions(baseline, additive, compoundLevels), (row) => row.metrics.papInertia),
  [0, 0, 0]
);
const nonlinear = sandbox.calculateStaticInteractions({ ...baseline, papInertia: 24 }, interacting, compoundLevels);
assert.equal(nonlinear[0].metrics.papInertia, 5);
assert.equal(nonlinear[1].metrics.papInertia, 0);
assert.equal(nonlinear[2].metrics.papInertia, 0);

console.log("static experiment tests: 22 passed");
