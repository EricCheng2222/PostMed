/* Pure teaching models, shared by the visual lessons and regression tests. */
(function (root) {
  'use strict';
  var models = {
    motion: function (v0, a, t) { return { x: v0 * t + 0.5 * a * t * t, v: v0 + a * t, a: a }; },
    circuit: function (voltage, r1, r2, parallel) {
      var resistance = parallel ? 1 / (1 / r1 + 1 / r2) : r1 + r2;
      var current = voltage / resistance;
      var i1 = parallel ? voltage / r1 : current, i2 = parallel ? voltage / r2 : current;
      return { resistance: resistance, current: current, i1: i1, i2: i2, v1: i1 * r1, v2: i2 * r2 };
    },
    enzyme: function (substrate, mode, strength) {
      var alpha = 1 + strength, vmax = 100, km = 2;
      if (mode === 'competitive') km *= alpha;
      if (mode === 'noncompetitive') vmax /= alpha;
      if (mode === 'uncompetitive') { km /= alpha; vmax /= alpha; }
      return { rate: vmax * substrate / (km + substrate), vmax: vmax, km: km };
    },
    osmosis: function (outside, fraction) {
      // Fixed intracellular nonpenetrating solute, infinite external reservoir.
      var finalVolume = 300 / outside;
      var volume = 1 + (finalVolume - 1) * fraction;
      return { volume: volume, inside: 300 / volume, finalVolume: finalVolume, direction: outside < 300 ? 'in' : outside > 300 ? 'out' : 'balanced' };
    },
    cross: function (parent1, parent2) {
      var cells = [], counts = { AA: 0, Aa: 0, aa: 0 };
      parent1.split('').forEach(function (first) {
        parent2.split('').forEach(function (second) {
          var genotype = [first, second].sort().join('');
          cells.push({ first: first, second: second, genotype: genotype });
          counts[genotype]++;
        });
      });
      return { cells: cells, counts: counts, dominant: counts.AA + counts.Aa, recessive: counts.aa };
    },
    glycolysis: function (step) {
      return { spent: step >= 3 ? 2 : step >= 1 ? 1 : 0, made: (step >= 7 ? 2 : 0) + (step >= 10 ? 2 : 0), nadh: step >= 6 ? 2 : 0, carbons: 6, copies: step >= 4 ? 2 : 1 };
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = models;
  else root.PostMedVisualModels = models;
})(typeof window === 'undefined' ? globalThis : window);
