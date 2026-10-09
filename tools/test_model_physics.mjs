import assert from 'node:assert/strict';
import fs from 'node:fs';
import {context as c, evaluate, setValue} from './run_zero_axis_experiment.mjs';
const checks=[];
const near=(a,b,tol=1e-10)=>assert.ok(Math.abs(a-b)<=tol,`${a} != ${b}`);
const vnear=(a,b,tol=1e-10)=>['x','y','z'].forEach(k=>near(a[k],b[k],tol));
function test(name,fn){fn();checks.push(name);}
const original={};
for(const id of ['layoutCatalogRg','layoutCatalogDiff','layoutCatalogIntDiff','layoutCoreType']) original[id]=c.document.querySelector('#'+id).value;
const data=c.layout();
const empty={...data,holes:[]};
test('USBC principal RG and PSA definition, without drilling',()=>{
 setValue('layoutCatalogRg',2.48);setValue('layoutCatalogDiff',.052);setValue('layoutCatalogIntDiff',.018);
 const m=c.calculatePhysicalModel(empty),b=c.physicalPrincipalBasis(empty);
 near(m.rgMid,2.514);near(m.rgHigh,2.532);near(m.intDiffAfter,.018);
 near(Math.sqrt(c.axisInertia(b.highAxis,m.tensorBefore)/m.mass),2.532);
 near(c.dot(c.cross(b.lowAxis,b.midAxis),b.highAxis),1);
});
test('Symmetric blank has a degenerate high-RG plane',()=>{
 setValue('layoutCatalogIntDiff',0);
 const m=c.calculatePhysicalModel(empty),b=c.physicalPrincipalBasis(empty);
 near(c.axisInertia(b.midAxis,m.tensorBefore),c.axisInertia(b.highAxis,m.tensorBefore));
});
for(const [id,v] of Object.entries(original)) setValue(id,v);
test('Eigen residuals, reconstruction and right-handed sorted basis',()=>{
 for(const tensor of [[[3,0,0],[0,1,0],[0,0,2]],[[91,1,2],[1,94,.7],[2,.7,96]]]){
  const e=c.symmetricEigen3(tensor);near(c.dot(c.cross(e.vectors[0],e.vectors[1]),e.vectors[2]),1);
  e.vectors.forEach((v,i)=>{const a=[v.x,v.y,v.z];tensor.forEach((row,k)=>near(row.reduce((s,x,j)=>s+x*a[j],0),e.values[i]*a[k],1e-9));});
 }
});
test('Mass model is independent of ambient draw projection state',()=>{
 evaluate(45,4,45);const d=c.layout();
 c.state.layoutOrigin=null;c.state.layoutBasis=null;const m=c.calculatePhysicalModel(d);
 c.state.layoutOrigin={x:1,y:2,z:3};c.state.layoutBasis={normal:{x:1,y:0,z:0},right:{x:0,y:1,z:0},up:{x:0,y:0,z:1}};
 const n=c.calculatePhysicalModel(d);near(m.iAfter,n.iAfter);vnear(m.centerOfMass,n.centerOfMass);
 c.state.layoutOrigin=null;c.state.layoutBasis=null;
});
let maxEnergyError=0,maxMomentumError=0;
test('Torque-free RK4 preserves energy and angular-momentum magnitude',()=>{
 const I=[90,94,96];let w={x:20,y:15,z:30};
 const E=w=>.5*(I[0]*w.x**2+I[1]*w.y**2+I[2]*w.z**2);
 const L=w=>Math.hypot(I[0]*w.x,I[1]*w.y,I[2]*w.z);
 const e=E(w),l=L(w);
 for(let k=0;k<500;k++){w=c.integrateEulerAngularVelocity(w,I,.01);maxEnergyError=Math.max(maxEnergyError,Math.abs(E(w)/e-1));maxMomentumError=Math.max(maxMomentumError,Math.abs(L(w)/l-1));}
 assert.ok(maxEnergyError<1e-9);assert.ok(maxMomentumError<1e-9);
 const coarse=c.integrateEulerAngularVelocity({x:20,y:15,z:30},I,.05);
 let fine={x:20,y:15,z:30};for(let i=0;i<100;i++)fine=c.integrateEulerAngularVelocity(fine,I,.0005);
 vnear(coarse,fine,1e-8);
});
test('Every exact principal axis is stationary; middle-axis stationarity is not stability',()=>{
 for(const w of [{x:30,y:0,z:0},{x:0,y:30,z:0},{x:0,y:0,z:30}])vnear(c.integrateEulerAngularVelocity(w,[1,2,3],.2),w);
 const w={x:1e-5,y:10,z:1e-5};const after=c.integrateEulerAngularVelocity(w,[1,2,3],1);
 assert.ok(Math.hypot(after.x,after.z)>10*Math.hypot(w.x,w.z));
});
test('Misalignment is sin(2 theta) for an axisymmetric tensor, not flare utilization',()=>{
 const T=[[1,0,0],[0,2,0],[0,0,2]],e=c.symmetricEigen3(T);
 for(let deg=0;deg<=90;deg+=5){const t=deg*Math.PI/180,u={x:Math.cos(t),y:Math.sin(t),z:0};near(c.inertiaAxisDiagnostics(u,T,e).normalizedMisalignment,Math.sin(2*t));}
 const T0=[[2,0,0],[0,2,0],[0,0,2]];near(c.inertiaAxisDiagnostics({x:1,y:2,z:3},T0,c.symmetricEigen3(T0)).axisRatePerSpin,0);
});
test('Axis-rate diagnostic matches an infinitesimal Euler integration',()=>{
 const I=[90,94,96],T=[[90,0,0],[0,94,0],[0,0,96]],e=c.symmetricEigen3(T);
 const u=c.normalize({x:1,y:2,z:3}),w=c.scalePoint(u,30),dt=1e-6;
 const next=c.normalize(c.integrateEulerAngularVelocity(w,I,dt));
 near(c.distance(next,u)/dt/30,c.inertiaAxisDiagnostics(u,T,e).axisRatePerSpin,1e-7);
});
let removalConvergence;
test('Spherical clipping agrees with analytic radial flat-bottom drill volume',()=>{
 const R=4.3,r=.5,d=1.5,s={start:{x:0,y:0,z:R},axis:{x:0,y:0,z:-1},radius:r,cylinderLength:d,pointLength:0,ballRadius:R};
 const full=Math.PI*r*r*d;
 const cap=Math.PI*r*r*R-2*Math.PI/3*(R**3-(R*R-r*r)**1.5);
 const low=c.clippedDrillRemovalContribution(s,1),high=c.clippedDrillRemovalContribution(s,1,96,96);
 assert.ok(low.mass<full);near(low.mass,full-cap,1e-5);near(high.mass,full-cap,1e-6);
 removalConvergence={analytic:full-cap,default:low.mass,fine:high.mass};
});
test('Pitch axis is depth independent using the production geometry',()=>{
 const d=c.layout(),h={...d.holes[0],lateral:.25,vertical:.125};
 const a=c.drillSegment({...h,drillDepth:1},d),b=c.drillSegment({...h,drillDepth:3},d);vnear(a.axis,b.axis);
});
test('Dual-angle spherical distance and local angle definitions',()=>{
 for(const hand of ['right','left']){setValue('handedness',hand);
  for(const [a,p,v] of [[20,1,20],[45,4,45],[90,6,70]]){
   evaluate(a,p,v);const d=c.layout().dualLayout,R=c.layout().ballRadius;
   near(c.surfaceDistance(d.pin,d.pap,R),p,1e-9);
   near(c.axisAngleDegrees(d.pinMbDown,d.drillTangent),a,1e-8);
   near(c.axisAngleDegrees(d.drillTangentAtPap,d.valDownTangent),v,1e-8);
   near(c.dot(d.layoutBasis.up,d.layoutBasis.right),0,1e-9);
  }
 }setValue('handedness','right');
});
test('Default completed tensor is positive and satisfies inertia triangle inequality',()=>{
 const m=c.calculatePhysicalModel(c.layout());assert.ok(m.principalMoments[0]>0);assert.ok(m.principalMoments[2]<m.principalMoments[0]+m.principalMoments[1]);
});
const result={status:'pass',checks,maxEnergyRelativeError:maxEnergyError,maxMomentumRelativeError:maxMomentumError,removalConvergence};
fs.writeFileSync(new URL('../outputs/physics-audit-tests.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
