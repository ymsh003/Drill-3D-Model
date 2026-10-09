import fs from 'node:fs';
import {context as c,evaluate} from './run_zero_axis_experiment.mjs';
evaluate(45,4.5,45);const data=c.layout(),mass=c.catalogWeightPounds();
const density=mass/(4/3*Math.PI*data.ballRadius**3);
const segments=data.holes.map(h=>c.drillSegment(h,data,c.drilledOpeningRadius(h)));
const rows=[24,48,96,192].map(n=>{
 const single=segments.map(s=>c.clippedDrillRemovalContribution(s,density,n,Math.round(n*4/3)));
 const sum=single.reduce((a,q)=>a+q.mass,0),union=c.drillUnionProperties(segments,density,n,Math.round(n*4/3));
 return {radialSteps:n,angularSteps:Math.round(n*4/3),summedRemovalLb:sum,unionRemovalLb:union.mass,overcountOz:16*(sum-union.mass)};
});
const result={layout:'45 x 4.5 x 45',rows};
fs.writeFileSync(new URL('../outputs/default-union-convergence.json',import.meta.url),JSON.stringify(result,null,2));console.log(result);
