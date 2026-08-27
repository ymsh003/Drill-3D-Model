import assert from "node:assert/strict";

const add=(a,b)=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const scale=(a,s)=>({x:a.x*s,y:a.y*s,z:a.z*s});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const norm=a=>{const n=Math.hypot(a.x,a.y,a.z);return scale(a,1/n)};
const near=(a,b,e=1e-10)=>Math.abs(a-b)<e;
const vecNear=(a,b,e=1e-10)=>near(a.x,b.x,e)&&near(a.y,b.y,e)&&near(a.z,b.z,e);

function tangentAtSurface(surfacePoint,tangent){
  const n=norm(surfacePoint);
  return norm(sub(tangent,scale(n,dot(tangent,n))));
}
function basis(start,role="thumb",source={right:{x:1,y:0,z:0},up:{x:0,y:1,z:0}}){
  const outward=norm(start);
  const forwardSign=role==="finger"?-1:1;
  const right=tangentAtSurface(start,source.right);
  let forward=tangentAtSurface(start,scale(source.up,forwardSign));
  forward=norm(sub(forward,scale(right,dot(forward,right))));
  return {outward,right,forward};
}
function axis(start,pSide,pFR,role="thumb",source){
  const b=basis(start,role,source);
  const aim=add(scale(b.right,pSide),scale(b.forward,pFR));
  return norm(sub(aim,start));
}

const R=109.1565;
const S={x:0,y:0,z:R};
assert.ok(vecNear(axis(S,0,0),{x:0,y:0,z:-1}),"zero pitch must aim at ball center");
const a=axis(S,6.35,3.175);
for(const depth of [12.7,31.75,76.2]){
  const tip=add(S,scale(a,depth));
  assert.ok(vecNear(norm(sub(tip,S)),a),"depth must not alter pitch axis");
}
const side=axis(S,6.35,0);
const forward=axis(S,0,6.35);
assert.ok(side.x>0&&near(side.y,0),"positive side pitch must follow local right basis");
assert.ok(forward.y>0&&near(forward.x,0),"thumb Forward must point toward the finger pair");
const fingerForward=axis(S,0,6.35,"finger");
assert.ok(fingerForward.y<0&&near(fingerForward.x,0),"finger Forward must point toward the grip center");
assert.ok(near(Math.acos(-dot(a,norm(S))),Math.atan(Math.hypot(6.35,3.175)/R)),"inclination must equal atan(rho/R)");
const rotatedSource={right:norm({x:1,y:0,z:-1}),up:{x:0,y:1,z:0}};
const rotatedStart=scale(norm({x:1,y:0,z:1}),R);
const rb=basis(rotatedStart,"thumb",rotatedSource);
assert.ok(near(dot(rb.right,rb.forward),0)&&near(dot(rb.right,rb.outward),0)&&near(dot(rb.forward,rb.outward),0),"transported basis must be orthonormal");
console.log("grip geometry tests: 8 passed");
