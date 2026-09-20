import assert from "node:assert/strict";
import fs from "node:fs";

const data = JSON.parse(fs.readFileSync(new URL("../outputs/layout-interaction-experiment-data.json", import.meta.url), "utf8"));

assert.equal(data.row_count, 594, "full factorial must contain 9 × 11 × 6 conditions");
assert.deepEqual(data.ranges.drill_angle_deg, [10, 20, 30, 40, 50, 60, 70, 80, 90]);
assert.deepEqual(data.ranges.pin_pap_in, [1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6]);
assert.deepEqual(data.ranges.val_angle_deg, [20, 30, 40, 50, 60, 70]);

for (const row of data.rows) {
  for (const key of ["pap_rg_in", "total_diff_in", "performance_diff_in", "effective_flare_diff_in", "flare_utilization_pct"]) {
    assert.ok(Number.isFinite(row[key]), `${key} must be finite`);
  }
  assert.ok(row.performance_diff_in + 1e-12 >= row.total_diff_in,
    "flare ceiling must not be below total differential");
  assert.ok(row.flare_utilization_pct >= 0 && row.flare_utilization_pct <= 100,
    "flare utilization must remain within 0–100%");
}

const pinMeans = new Map();
for (const pin of data.ranges.pin_pap_in) {
  const rows = data.rows.filter((row) => row.pin_pap_in === pin);
  pinMeans.set(pin, rows.reduce((sum, row) => sum + row.effective_flare_diff_in, 0) / rows.length);
}
const peakPin = [...pinMeans].sort((a, b) => b[1] - a[1])[0][0];
assert.ok(peakPin >= 3 && peakPin <= 4, "effective flare must peak in the source-supported 3–4 inch region");
assert.ok(pinMeans.get(1) < pinMeans.get(3.5), "short pin must produce less effective flare than the peak");
assert.ok(pinMeans.get(6) < pinMeans.get(3.5), "long pin must produce less effective flare than the peak");

for (const analysis of Object.values(data.analysis)) {
  if (analysis.total_sum_of_squares < 1e-18) continue;
  const totalShare = Object.values(analysis.variance_share_pct).reduce((sum, value) => sum + value, 0);
  assert.ok(Math.abs(totalShare - 100) < 1e-6, "orthogonal variance shares must sum to 100%");
}

console.log(`layout interaction experiment tests: pass (594 conditions, peak PIN–PAP ${peakPin} in)`);
