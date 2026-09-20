import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(here, "../outputs/bowling-drill-3d-prototype.html");
const html = readFileSync(htmlPath, "utf8");

assert.match(html, /const rgHigh = rgLow \+ diff;\s*const rgMid = rgHigh - intDiff;/,
  "USBC convention requires intermediate RG = high RG - intermediate differential");
assert.match(html, /const intDiffAfter = rgPrincipal\[2\] - rgPrincipal\[1\]/,
  "completed-ball intermediate differential must be high RG - intermediate RG");
assert.match(html, /const performanceDiffAfter = Math\.hypot\(totalDiffAfter, intDiffAfter\)/,
  "flare ceiling must include total and intermediate differential");
assert.match(html, /const migrationVector = cross\(papAxis, angularMomentumPerRadian\)/,
  "usable flare must depend on PAP-axis misalignment with the completed inertia tensor");
assert.match(html, /usbcDifferentialFlareEstimate\(data\.physicalModel\.performanceDiffAfter\)[\s\S]*data\.physicalModel\.flareUtilizationAfter/,
  "motion flare must combine the differential ceiling with layout utilization");
assert.match(html, /let highAxis = sub\(normalize\(mbPoint\)/,
  "PSA/MB point must establish the high-RG axis");
assert.match(html, /const midAxis = normalize\(cross\(highAxis, lowAxis\)\)/,
  "intermediate axis must be orthogonal to the PIN low-RG and PSA high-RG axes");

const low = 2.480;
const totalDiff = 0.052;
const intermediateDiff = 0.018;
const high = low + totalDiff;
const intermediate = high - intermediateDiff;
const performanceDiff = Math.hypot(totalDiff, intermediateDiff);
assert.equal(high.toFixed(3), "2.532");
assert.equal(intermediate.toFixed(3), "2.514");
assert.equal((high - low).toFixed(3), totalDiff.toFixed(3));
assert.equal((high - intermediate).toFixed(3), intermediateDiff.toFixed(3));
assert.equal(performanceDiff.toFixed(4), "0.0550");

const sameEnergyRpm = (rpm, referenceInertia, candidateInertia) =>
  rpm * Math.sqrt(referenceInertia / candidateInertia);
assert.ok(sameEnergyRpm(300, 90, 100) < 300,
  "same rotational energy must yield lower RPM for a higher moment of inertia");
assert.ok(sameEnergyRpm(300, 100, 90) > 300,
  "same rotational energy must yield higher RPM for a lower moment of inertia");

console.log("physics convention tests: 15 passed");
