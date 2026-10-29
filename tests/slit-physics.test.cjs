const { test } = require('node:test');
const assert = require('node:assert/strict');
const { intensity, normalizedIntensity, fringeSpacing, firstMinimum, wavelengthRGB } = require('../slit-physics.js');
const p = { wavelength: 550e-9, separation: 250e-6, screenDistance: 1.5, slitWidth: 40e-6, mode: 'double' };
const near = (a,b,tolerance=1e-10) => assert.ok(Math.abs(a-b)<tolerance, `${a} ≠ ${b}`);
// Convert an exact diffraction angle to a screen position, avoiding small-angle approximations.
const screenY = sin => p.screenDistance * sin / Math.sqrt(1-sin*sin);
test('coherent amplitudes add to four times single-slit central intensity',()=> {
  near(intensity(0,p),4); near(intensity(0,{...p,mode:'single'}),1); near(intensity(0,{...p,mode:'incoherent'}),2);
});
test('baseline fringe spacing is 3.30 mm',()=>near(fringeSpacing(p),.0033));
test('longer wavelength and farther screen increase spacing; separation decreases it',()=> {
  near(fringeSpacing({...p,wavelength:p.wavelength*2}),2*fringeSpacing(p));
  near(fringeSpacing({...p,screenDistance:3}),2*fringeSpacing(p));
  near(fringeSpacing({...p,separation:p.separation*2}),fringeSpacing(p)/2);
});
test('half-wavelength path difference produces destructive interference',()=>near(intensity(screenY(p.wavelength/(2*p.separation)),p),0));
test('integer-wavelength path difference gives the diffraction envelope',()=> {
  const y=screenY(p.wavelength/p.separation);
  near(intensity(y,p),4*intensity(y,{...p,mode:'single'}));
});
test('first single-slit minimum follows a sin(theta) = lambda',()=> {
  near(firstMinimum(p),.020625);
  near(intensity(screenY(p.wavelength/p.slitWidth),{...p,mode:'single'}),0);
});
test('incoherent light removes cross terms but keeps twice the diffraction envelope',()=> {
  for(const y of [.001,.0033,.01]) {
    near(intensity(y,{...p,mode:'incoherent'}),2*intensity(y,{...p,mode:'single'}));
    near(intensity(y,{...p,mode:'incoherent',separation:.0006}),intensity(y,{...p,mode:'incoherent'}));
  }
});
test('screen pattern is symmetric, finite and normalized across parameter extremes',()=> {
  for(const mode of ['double','single','incoherent']) for(const wavelength of [380e-9,750e-9]) for(const slitWidth of [10e-6,80e-6]) {
    const params={...p,mode,wavelength,slitWidth};
    for(let n=0;n<=30;n++) {
      const y=n*.0005, v=normalizedIntensity(y,params);
      assert.ok(Number.isFinite(v)&&v>=0&&v<=1);
      near(v,normalizedIntensity(-y,params));
    }
  }
});
test('visible spectrum uses blue at 450 nm and red at 660 nm',()=> {
  assert.deepEqual(wavelengthRGB(450),[0,51,255]);assert.deepEqual(wavelengthRGB(660),[255,0,0]);
});
