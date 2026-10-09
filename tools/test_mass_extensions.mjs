import assert from 'node:assert/strict';
import fs from 'node:fs';
import {context as c,evaluate} from './run_zero_axis_experiment.mjs';
const checks=[],near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const test=(name,fn)=>{fn();checks.push(name)};
const matrixNear=(a,b,tol=1e-9)=>a.forEach((r,i)=>r.forEach((v,j)=>near(v,b[i][j],tol)));
const seg=(start,axis,r=.5,L=2,pointLength=0)=>({start,axis,radius:r,cylinderLength:L,pointLength,ballRadius:10});
const a=seg({x:0,y:0,z:0},{x:0,y:0,z:1});
test('Duplicated cylindrical and conical holes are removed once',()=>{
 for(const s of [a,{...a,pointLength:.5}]){
  const one=c.drillUnionProperties([s],1),two=c.drillUnionProperties([s,s],1);
  near(one.mass,two.mass);matrixNear(one.tensor,two.tensor);
 }
});
test('Nested coaxial holes equal their larger outer hole',()=>{
 const small={...a,radius:.25,cylinderLength:1};
 const one=c.drillUnionProperties([a],1,64,96),two=c.drillUnionProperties([small,a],1,64,96);
 near(one.mass,two.mass,1e-9);matrixNear(one.tensor,two.tensor,1e-8);
});
test('Axially overlapping cylinders match analytic union moments',()=>{
 const b={...a,start:{x:0,y:0,z:1}},u=c.drillUnionProperties([a,b],1,128,128);
 const mass=Math.PI*.25*3;near(u.mass,mass,1e-10);near(u.firstMoment.z,mass*1.5,1e-10);
 near(u.tensor[2][2],mass*.25/2,1e-5);near(u.tensor[0][0],mass*(.25/4+3),1e-5);
});
const x=seg({x:-2,y:0,z:0},{x:1,y:0,z:0},.5,4);
const z=seg({x:0,y:0,z:-2},{x:0,y:0,z:1},.5,4);
const exact=2*Math.PI*.25*4-16*.5**3/3;
const crossRuns=[24,64,128].map(n=>{const u=c.drillUnionProperties([x,z],1,n,2*n);return {radialSteps:n,angularSteps:2*n,volume:u.mass,error:u.mass-exact}});
test('Crossed cylinders agree with independent Steinmetz integral and converge',()=>{
 assert.ok(Math.abs(crossRuns[2].error)<Math.abs(crossRuns[0].error));
 assert.ok(Math.abs(crossRuns[2].error)/exact<3e-5);
});
test('Hole order does not affect union result',()=>{
 const b=c.drillUnionProperties([x,z],1),d=c.drillUnionProperties([z,x],1);assert.deepEqual(b,d);
});
test('Quadratic ray clipping handles tangent, parallel and inside rays',()=>{
 assert.equal(c.rayDrillIntervals({x:.6,y:0,z:-1},{x:0,y:0,z:1},a,0,5).length,0);
 assert.deepEqual(c.rayDrillIntervals({x:0,y:0,z:-1},{x:0,y:0,z:1},a,0,5),[[1,3]]);
 assert.equal(c.rayDrillIntervals({x:-1,y:.5,z:1},{x:1,y:0,z:0},a,0,2).length,0);
});
evaluate(45,4.5,45);const data=c.layout();
const part={holeIndex:0,massLb:.003,outerRadiusIn:.30,innerRadiusIn:.20,lengthIn:.50,startDepthIn:.15};
let example;
test('Initial COM uses parallel-axis translation in both directions',()=>{
 const base=c.calculatePhysicalModel({...data,holes:[]});
 const center={x:.01,y:-.003,z:.03};
 const moved=c.calculatePhysicalModel({...data,holes:[],massOptions:{initialCenterOfMassIn:center}});
 matrixNear(base.tensorAfter,moved.tensorAfter);for(const k of ['x','y','z'])near(moved.centerOfMass[k],center[k]);
 matrixNear(moved.tensorBeforeOrigin,c.matrixAdd(base.tensorBefore,c.parallelAxisTensor(base.mass,center)));
});
test('Measured annular insert has analytic mass, first moment and inertia',()=>{
 const v=c.insertedMassProperties(data,c.checkedMassOptions({...data,massOptions:{inserts:[part]}}));
 near(v.mass,.003);const sg=c.drillSegment(data.holes[0],data,c.drilledOpeningRadius(data.holes[0]));
 const center=c.addScaled(sg.start,sg.axis,.40),local=c.matrixSubtract(v.tensor,c.parallelAxisTensor(.003,center));
 near(c.axisInertia(sg.axis,local),.003*(.09+.04)/2);
 const ev=c.symmetricEigen3(local).values.sort((a,b)=>a-b),known=[.003*.13/2,.003*(3*.13+.25)/12,.003*(3*.13+.25)/12].sort((a,b)=>a-b);
 ev.forEach((a,i)=>near(a,known[i]));
});
test('Completed ball includes added mass, initial first moment and tensor',()=>{
 const base=c.calculatePhysicalModel(data),center={x:.01,y:0,z:0};
 const m=c.calculatePhysicalModel({...data,massOptions:{initialCenterOfMassIn:center,inserts:[part]}});
 near(m.massAfter,base.massAfter+.003);near(m.netMassLoss,base.removedMass-.003);
 const h=c.add(c.sub(c.scalePoint(center,m.mass),c.drilledRemovalProperties(data,m.mass).firstMoment),m.inserted.firstMoment);
 for(const k of ['x','y','z'])near(m.centerOfMass[k],h[k]/m.massAfter);
 matrixNear(m.tensorAfter,c.matrixSubtract(c.matrixAdd(c.matrixSubtract(m.tensorBeforeOrigin,c.drilledRemovalProperties(data,m.mass).tensor),m.inserted.tensor),c.parallelAxisTensor(m.massAfter,m.centerOfMass)));
 example={assumption:'Synthetic inputs, not measurements',inputs:{initialCenterOfMassIn:center,inserts:[part]},before:{massAfter:base.massAfter,rgPrincipal:base.rgPrincipal,centerOfMass:base.centerOfMass},after:{massAfter:m.massAfter,rgPrincipal:m.rgPrincipal,centerOfMass:m.centerOfMass}};
});
test('Invalid or overlapping inserts and invalid COM are rejected',()=>{
 for(const massOptions of [{initialCenterOfMassIn:{x:NaN,y:0,z:0}},{radialSteps:0},{inserts:[{...part,massLb:-1}]},{inserts:[{...part,outerRadiusIn:2}]},{inserts:[{...part,startDepthIn:0}]},{inserts:[part,part]}])assert.throws(()=>c.calculatePhysicalModel({...data,massOptions}));
});
test('Explicit neutral options preserve the prior default calculation',()=>{
 const a=c.calculatePhysicalModel(data),b=c.calculatePhysicalModel({...data,massOptions:{initialCenterOfMassIn:{x:0,y:0,z:0},inserts:[],radialSteps:24,angularSteps:32}});
 matrixNear(a.tensorAfter,b.tensorAfter,0);near(a.massAfter,b.massAfter,0);
});
const result={revision:'mass-moments-2026-09-25',status:'pass',checks,steinmetz:{exact,crossRuns},example};
fs.writeFileSync(new URL('../outputs/mass-extension-tests.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));

