import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.resolve(here, "..", "outputs", "zero-axis-experiment-data.json");
const data = JSON.parse(await fs.readFile(dataPath, "utf8"));

assert.equal(data.row_count, 587, "全観測行数");
assert.equal(data.unique_condition_count, 585, "固有条件数");
assert.equal(data.rows.length, 587, "rows配列長");

const expectedSweeps = {
  drill_angle: { count: 241, min: -120, max: 120, step: 1 },
  pin_pap: { count: 105, min: 0, max: 6.5, step: 1 / 16 },
  val_angle: { count: 241, min: -120, max: 120, step: 1 }
};

for (const [key, expected] of Object.entries(expectedSweeps)) {
  const rows = data.rows.filter((row) => row.sweep_key === key);
  assert.equal(rows.length, expected.count, `${key}: 行数`);
  assert.equal(rows[0].factor_value, expected.min, `${key}: 最小入力`);
  assert.equal(rows.at(-1).factor_value, expected.max, `${key}: 最大入力`);
  for (let index = 1; index < rows.length; index += 1) {
    assert.ok(Math.abs(rows[index].factor_value - rows[index - 1].factor_value - expected.step) < 1e-12, `${key}: 入力刻み ${index}`);
  }
}

const numericKeys = Object.keys(data.rows[0]).filter((key) => typeof data.rows[0][key] === "number");
for (const [rowIndex, row] of data.rows.entries()) {
  for (const key of numericKeys) assert.ok(Number.isFinite(row[key]), `有限値: row ${rowIndex + 1}, ${key}`);
}

const zeroRows = data.rows.filter((row) => row.drill_angle_deg === 0 && row.pin_pap_in === 0 && row.val_angle_deg === 0);
assert.equal(zeroRows.length, 3, "全ゼロ行数");
for (const row of zeroRows) {
  for (const [key, value] of Object.entries(data.baseline)) {
    if (typeof value === "number") assert.ok(Math.abs(row[key] - value) < 1e-12, `全ゼロ基準一致: ${key}`);
  }
}

const mirrorMetrics = ["pap_inertia_lb_in2", "pap_rg_in", "rg_low_in", "rg_mid_in", "rg_high_in", "total_diff_in", "int_diff_in"];
const drillRows = new Map(data.rows.filter((row) => row.sweep_key === "drill_angle").map((row) => [row.factor_value, row]));
const valRows = data.rows.filter((row) => row.sweep_key === "val_angle");
let mirrorMaxAbsError = 0;
for (const valRow of valRows) {
  const drillRow = drillRows.get(-valRow.factor_value);
  assert.ok(drillRow, `鏡像ドリル角: ${-valRow.factor_value}`);
  for (const key of mirrorMetrics) mirrorMaxAbsError = Math.max(mirrorMaxAbsError, Math.abs(valRow[key] - drillRow[key]));
}
assert.ok(mirrorMaxAbsError <= 1e-12, `ドリル角とVAL角の鏡像誤差: ${mirrorMaxAbsError}`);

assert.equal(new Set(data.rows.map((row) => row.removed_mass_oz.toFixed(12))).size, 1, "除去質量は全条件で一定");
assert.equal(new Set(data.rows.map((row) => row.mass_after_lb.toFixed(12))).size, 1, "完成球重量は全条件で一定");

console.log(JSON.stringify({
  status: "pass",
  rowCount: data.rows.length,
  uniqueConditions: data.unique_condition_count,
  zeroRows: zeroRows.length,
  finiteNumericFields: numericKeys.length,
  mirrorMaxAbsError
}, null, 2));
