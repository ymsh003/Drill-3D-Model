import fs from 'node:fs';
import {context as c,evaluate,setValue} from './run_zero_axis_experiment.mjs';
const file=process.argv[2];
if(!file)throw Error('Usage: node tools/run_mass_model.mjs input.json [output.json]');
const input=JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
for(const k of Object.keys(input))if(!['layout','catalog','massOptions'].includes(k))throw Error(`Unknown input ${k}`);
const catalogKeys={weightLb:'layoutBallWeightLb',rgLowIn:'layoutCatalogRg',totalDiffIn:'layoutCatalogDiff',intermediateDiffIn:'layoutCatalogIntDiff'};
for(const [k,v] of Object.entries(input.catalog || {})) {
 if(!catalogKeys[k] || !Number.isFinite(v))throw Error(`Invalid catalog input ${k}`);setValue(catalogKeys[k],v);
}
const layout=input.layout || {},{drillAngleDeg=45,pinPapIn=4.5,valAngleDeg=45}=layout;
for(const k of Object.keys(layout))if(!['drillAngleDeg','pinPapIn','valAngleDeg'].includes(k))throw Error(`Unknown layout input ${k}`);
if(![drillAngleDeg,pinPapIn,valAngleDeg].every(Number.isFinite))throw Error('Invalid layout');
evaluate(drillAngleDeg,pinPapIn,valAngleDeg);
const data=c.layout();data.massOptions=input.massOptions || {};
const model=c.calculatePhysicalModel(data);
const result={input,units:{length:'in',mass:'lb',inertia:'lb in^2'},coordinateReference:{origin:'geometric center',frame:'production ball-fixed xyz',layoutBasis:data.layoutBasis,pin:data.dualLayout.pin,psa:data.dualLayout.layoutMb},holeOrder:data.holes.map((h,i)=>({index:i,name:h.name})),model};
const json=JSON.stringify(result,null,2);
if(process.argv[3])fs.writeFileSync(process.argv[3],json);else console.log(json);
