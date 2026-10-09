import assert from 'node:assert/strict';
import fs from 'node:fs';
import {functionalAnova} from './experiment_statistics.mjs';
import {evaluate} from './run_zero_axis_experiment.mjs';
const synthetic=[];
for(const a of [-1,1])for(const b of [-1,1])for(const c of [-1,1])synthetic.push({drill_angle_deg:a,pin_pap_in:b,val_angle_deg:c,y:2*a+3*b+4*a*b+5*a*b*c});
const analysis=functionalAnova(synthetic,'y');
for(const [term,square] of Object.entries({drill_angle_deg:4,pin_pap_in:9,val_angle_deg:0,'drill_angle_deg*pin_pap_in':16,'drill_angle_deg*val_angle_deg':0,'pin_pap_in*val_angle_deg':0,three_way:25}))assert.ok(Math.abs(analysis.variance_share_pct[term]-100*square/54)<1e-10);
let count=0;
for(const name of ['zero-axis-experiment-data','layout-interaction-experiment-data','layout-archetype-experiment-data','real-ball-catalog-validation']){
 const d=JSON.parse(fs.readFileSync(new URL(`../outputs/${name}.json`,import.meta.url)));
 assert.equal(d.model_revision,'mass-moments-2026-09-25');assert.equal(d.row_count,d.rows.length);
 for(const row of d.rows){for(const key of ['pap_rg_in','total_diff_in','int_diff_in','performance_diff_in','effective_flare_diff_in','normalized_axis_misalignment','torque_free_axis_rate_per_spin'])assert.ok(Number.isFinite(row[key]),`${name}: ${key}`);assert.ok(row.normalized_axis_misalignment>=0&&row.normalized_axis_misalignment<=1);count++;}
 if(name==='layout-interaction-experiment-data')for(const i of [0,211,593]){
  const row=d.rows[i],fresh=evaluate(row.drill_angle_deg,row.pin_pap_in,row.val_angle_deg);
  for(const key of ['pap_rg_in','total_diff_in','normalized_axis_misalignment','torque_free_axis_rate_per_spin'])assert.ok(Math.abs(row[key]-fresh[key])<1e-12);
  assert.ok(!Object.hasOwn(row,'source_timing_guide_pct'));
 }
}
console.log(`PASS: analytic ANOVA oracle; ${count} rows finite with revision metadata; 3 production recalculations match saved data.`);

