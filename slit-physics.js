/* Uniform-aperture Fraunhofer model. All inputs use SI units. */
(function (root) {
  'use strict';
  const sinc = x => Math.abs(x) < 1e-8 ? 1 : Math.sin(x) / x;
  function intensity(y, { wavelength, separation, screenDistance, slitWidth, mode }) {
    const sinTheta = y / Math.hypot(screenDistance, y);
    const envelope = sinc(Math.PI * slitWidth * sinTheta / wavelength) ** 2;
    if (mode === 'single') return envelope;
    if (mode === 'incoherent') return 2 * envelope;
    return 4 * envelope * Math.cos(Math.PI * separation * sinTheta / wavelength) ** 2;
  }
  function normalizedIntensity(y, p) {
    return intensity(y, p) / (p.mode === 'single' ? 1 : p.mode === 'incoherent' ? 2 : 4);
  }
  const fringeSpacing = p => p.wavelength * p.screenDistance / p.separation;
  const firstMinimum = p => p.wavelength * p.screenDistance / p.slitWidth;
  function wavelengthRGB(nm) {
    let r = 0, g = 0, b = 0;
    if (nm < 440) { r = (440 - nm) / 60; b = 1; }
    else if (nm < 490) { g = (nm - 440) / 50; b = 1; }
    else if (nm < 510) { g = 1; b = (510 - nm) / 20; }
    else if (nm < 580) { r = (nm - 510) / 70; g = 1; }
    else if (nm < 645) { r = 1; g = (645 - nm) / 65; }
    else r = 1;
    return [r, g, b].map(x => Math.round(255 * Math.max(0, Math.min(1, x))));
  }
  const api = { intensity, normalizedIntensity, fringeSpacing, firstMinimum, wavelengthRGB };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.YoungPhysics = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
