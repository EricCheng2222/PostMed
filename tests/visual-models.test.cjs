const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../assets/js/visual-models.js');
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('motion turns around at zero velocity while signed displacement stays positive', () => {
  assert.deepEqual(M.motion(4,-1,4), {x:8,v:0,a:-1});
  assert.deepEqual(M.motion(4,-1,6), {x:6,v:-2,a:-1});
  // Signed area under v(t): +8 before the turn, -2 afterwards.
  close(M.motion(4,-1,6).x,8-2);
  for(let v=-8;v<=8;v++)for(let a=-3;a<=3;a++) {
    const t=2,dt=1e-4;
    close((M.motion(v,a,t+dt).x-M.motion(v,a,t-dt).x)/(2*dt),M.motion(v,a,t).v);
  }
});
test('circuits conserve voltage in series and current in parallel across all resistor settings', () => {
  for(let r1=2;r1<=12;r1++)for(let r2=2;r2<=12;r2++) {
    const series=M.circuit(12,r1,r2,false), parallel=M.circuit(12,r1,r2,true);
    close(series.v1+series.v2,12); close(series.i1,series.i2);
    close(parallel.i1+parallel.i2,parallel.current);
    close(parallel.v1,12);close(parallel.v2,12);
    assert.ok(parallel.resistance<Math.min(r1,r2));
    // Energy delivered by the source equals resistor dissipation.
    for(const r of [series,parallel])close(12*r.current,r.i1*r.v1+r.i2*r.v2);
  }
});
test('enzyme inhibition preserves the correct apparent constants and half-maximal points', () => {
  for(const mode of ['competitive','noncompetitive','uncompetitive']) {
    for(let strength=0;strength<=4;strength+=.5) {
      const r=M.enzyme(2,mode,strength);
      close(M.enzyme(r.km,mode,strength).rate,r.vmax/2);
      close(M.enzyme(0,mode,strength).rate,0);
      if(mode==='competitive')close(r.vmax,100);
      if(mode==='noncompetitive')close(r.km,2);
      if(mode==='uncompetitive')close(r.vmax/r.km,50);
      assert.ok(r.rate<=r.vmax);
    }
    close(M.enzyme(2,mode,0).rate,50);
  }
});
test('glycolysis repays investment at step seven and ends with four gross, two net ATP', () => {
  const expected=[0,-1,-1,-2,-2,-2,-2,0,0,0,2];
  expected.forEach((net,step)=>{
    const r=M.glycolysis(step);assert.equal(r.made-r.spent,net);assert.equal(r.carbons,6);
    assert.equal(r.nadh,step>=6?2:0);assert.equal(r.copies,step>=4?2:1);
  });
  assert.equal(M.glycolysis(10).made,4);
});
test('osmosis conserves trapped solute and converges to the reservoir concentration', () => {
  for(let outside=150;outside<=600;outside+=25) {
    for(let f=0;f<=1;f+=.1) {
      const r=M.osmosis(outside,f);close(r.inside*r.volume,300);
    }
    const final=M.osmosis(outside,1);close(final.inside,outside);close(final.volume,300/outside);
  }
  close(M.osmosis(300,.5).volume,1);
  close(M.osmosis(600,1).volume,.5);
});
test('all parental crosses sum to one and swapping parents preserves the probabilities', () => {
  for(const first of ['AA','Aa','aa'])for(const second of ['AA','Aa','aa']) {
    const r=M.cross(first,second);
    assert.equal(r.cells.length,4);
    assert.equal(r.counts.AA+r.counts.Aa+r.counts.aa,4);
    assert.equal(r.dominant+r.recessive,4);
    assert.deepEqual(r.counts,M.cross(second,first).counts);
  }
  assert.deepEqual(M.cross('Aa','Aa').counts,{AA:1,Aa:2,aa:1});
  assert.deepEqual(M.cross('Aa','aa').counts,{AA:0,Aa:2,aa:2});
});
