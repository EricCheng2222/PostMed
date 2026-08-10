/* 後醫筆記 — shared behaviour: theme toggle + reusable quiz engine.
   No dependencies, no network. Every page can opt in by including this file. */
(function () {
  'use strict';

  /* ---------- Theme -------------------------------------------------- */
  var KEY = 'postmed-theme';

  function applyTheme(t) {
    if (t === 'light' || t === 'dark') {
      document.documentElement.setAttribute('data-theme', t);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function currentTheme() {
    var saved = null;
    try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode */ }
    if (saved) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark' : 'light';
  }

  applyTheme((function () {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  })());

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-theme-toggle]');
    if (!btn) return;
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    try { localStorage.setItem(KEY, next); } catch (e) { /* ignore */ }
    btn.setAttribute('aria-label', next === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  });

  /* ---------- Reading pace: Learn vs Reference ------------------------
     Disclosures are authored closed, so switching to Reference only ever
     reveals. That means a no-JS reader still gets a working page, and the
     switch never collapses something out from under you mid-read.
  --------------------------------------------------------------------- */
  var PKEY = 'postmed-pace';

  function currentPace() {
    try {
      var p = localStorage.getItem(PKEY);
      if (p === 'learn' || p === 'reference') return p;
    } catch (e) { /* private mode */ }
    return 'learn';
  }

  function applyPace(p, openDiscs) {
    document.documentElement.setAttribute('data-pace', p);

    if (openDiscs !== false) {
      var discs = document.querySelectorAll('details.disc');
      Array.prototype.forEach.call(discs, function (d) {
        if (p === 'reference') d.setAttribute('open', '');
        else d.removeAttribute('open');
      });
    }

    var btns = document.querySelectorAll('[data-pace-set]');
    Array.prototype.forEach.call(btns, function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-pace-set') === p ? 'true' : 'false');
    });
  }

  /* Set the attribute immediately so [data-pace-only] blocks never flash. */
  document.documentElement.setAttribute('data-pace', currentPace());

  document.addEventListener('click', function (ev) {
    var btn = ev.target.closest && ev.target.closest('[data-pace-set]');
    if (!btn) return;
    var p = btn.getAttribute('data-pace-set');
    if (p !== 'learn' && p !== 'reference') return;
    applyPace(p);
    try { localStorage.setItem(PKEY, p); } catch (e) { /* ignore */ }
  });

  document.addEventListener('DOMContentLoaded', function () {
    applyPace(currentPace());
  });

  /* ---------- Chemical shorthand -------------------------------------
     Any <button class="sh" data-sh="KEY"> expands into one shared panel.
     Where the shorthand contains a phosphate chain the panel draws it and
     marks the alpha / beta / gamma positions, because which phosphate is
     which is the thing the shorthand hides.
  --------------------------------------------------------------------- */
  function nucSVG(n, label) {
    /* n = number of phosphates (1..3). Greek labels run outward from the sugar. */
    var greek = ['α', 'β', 'γ'];
    var x = 118, parts = [
      '<rect x="8" y="30" width="46" height="34" rx="6" fill="none" stroke="var(--ink-soft)" stroke-width="1.5"/>',
      '<text x="31" y="51" text-anchor="middle" font-size="11" fill="var(--ink)">base</text>',
      '<rect x="60" y="30" width="46" height="34" rx="6" fill="none" stroke="var(--ink-soft)" stroke-width="1.5"/>',
      '<text x="83" y="51" text-anchor="middle" font-size="11" fill="var(--ink)">sugar</text>',
      '<line x1="54" y1="47" x2="60" y2="47" stroke="var(--ink-soft)" stroke-width="1.5"/>',
      '<text x="83" y="78" text-anchor="middle" font-size="9" fill="var(--ink-faint)">5′ carbon</text>'
    ];
    for (var i = 0; i < n; i++) {
      var last = (i === n - 1);
      parts.push('<line x1="' + (x - 12) + '" y1="47" x2="' + x + '" y2="47" stroke="var(--ink-soft)" stroke-width="1.5"/>');
      parts.push('<circle cx="' + (x + 17) + '" cy="47" r="17" fill="none" stroke="' +
                 (last ? 'var(--accent)' : 'var(--ink-soft)') + '" stroke-width="' + (last ? 2.2 : 1.5) + '"/>');
      parts.push('<text x="' + (x + 17) + '" y="52" text-anchor="middle" font-size="13" font-weight="700" fill="' +
                 (last ? 'var(--accent)' : 'var(--ink)') + '">P</text>');
      parts.push('<text x="' + (x + 17) + '" y="20" text-anchor="middle" font-size="13" font-weight="700" fill="' +
                 (last ? 'var(--accent)' : 'var(--ink-soft)') + '">' + greek[i] + '</text>');
      x += 46;
    }
    parts.push('<text x="8" y="94" font-size="9.5" fill="var(--ink-faint)">' + label + '</text>');
    return '<svg viewBox="0 0 ' + Math.max(x + 8, 300) + ' 104" role="img" aria-label="' +
           label.replace(/<[^>]+>/g, '') + '">' + parts.join('') + '</svg>';
  }

  var SH = {
    'P':    { name: 'phosphoryl / phosphate group', body: 'Drawn as a circled <b>P</b>, this is –PO₃<sup>2−</sup> esterified to an oxygen. It carries about two negative charges at pH 7.4, which is why a phosphorylated intermediate cannot drift back out through the membrane — phosphorylation is how the cell traps a metabolite inside.' },
    'Pi':   { name: 'inorganic phosphate', body: 'Free HPO₄<sup>2−</sup> / H₂PO₄<sup>−</sup> in solution, not attached to anything. Written Pᵢ to distinguish it from a phosphate already on a molecule.', warn: 'In glycolysis, step 6 is the <b>only</b> place the phosphate comes from free Pᵢ rather than from ATP.' },
    'PPi':  { name: 'pyrophosphate (diphosphate)', body: 'Two phosphates joined by an anhydride bond, P–O–P. Released when a nucleotide is attacked at its <b>α</b> phosphate, and then hydrolysed to 2 Pᵢ by inorganic pyrophosphatase.', warn: 'That second hydrolysis is what makes the reaction irreversible — it is a common exam point in DNA/RNA synthesis and fatty-acid activation.' },
    '~P':   { name: 'high-energy phosphate bond', body: 'The squiggle marks a phosphate whose hydrolysis is strongly exergonic — an acyl phosphate, an enol phosphate, or a phosphoanhydride.', warn: 'The energy is <b>not</b> in the bond itself. It is the difference in stabilisation between reactants and products — resonance and charge separation in the released phosphate.' },
    'ATP':  { name: 'adenosine 5′-triphosphate', phos: 3, plabel: 'adenine + ribose + three phosphates', body: 'The phosphates are named outward from the sugar: <b>α</b> is attached to the 5′ carbon, then <b>β</b>, then <b>γ</b> at the end.', warn: 'A <b>kinase</b> transfers the <b>γ</b> phosphate. Attack at <b>α</b> instead releases PPᵢ and is what happens when a nucleotide is built into DNA or a fatty acid is activated to acyl-CoA.' },
    'ADP':  { name: 'adenosine 5′-diphosphate', phos: 2, plabel: 'adenine + ribose + two phosphates', body: 'ATP minus its γ phosphate. The remaining two keep their names: <b>α</b> nearest the sugar, <b>β</b> at the end.' },
    'AMP':  { name: 'adenosine 5′-monophosphate', phos: 1, plabel: 'adenine + ribose + one phosphate', body: 'One phosphate, on the 5′ carbon — the <b>α</b> position. This is the form built into RNA.', warn: 'Rising AMP is the cell’s low-energy alarm: it activates PFK-1 and AMP-activated protein kinase.' },
    'GTP':  { name: 'guanosine 5′-triphosphate', phos: 3, plabel: 'guanine + ribose + three phosphates', body: 'Same α/β/γ naming as ATP. Made by substrate-level phosphorylation in the citric acid cycle and used by G proteins and in gluconeogenesis.' },
    'NAD+': { name: 'nicotinamide adenine dinucleotide (oxidised)', body: 'Accepts <b>two electrons and one proton</b> as a hydride ion, H<sup>−</sup>, becoming NADH. The second proton goes to the solvent, which is why the equation reads NADH + H<sup>+</sup>.', warn: 'NAD<sup>+</sup> collects electrons for <b>catabolism</b>; NADPH delivers them for <b>biosynthesis</b>. Same chemistry, opposite job — the 2′ phosphate is how enzymes tell them apart.' },
    'NADH': { name: 'nicotinamide adenine dinucleotide (reduced)', body: 'Carries a hydride to the electron-transport chain. Cytosolic NADH cannot cross the inner mitochondrial membrane — it needs the malate–aspartate or glycerol 3-phosphate shuttle.' },
    'FAD':  { name: 'flavin adenine dinucleotide (oxidised)', body: 'Accepts <b>two hydrogen atoms</b> — 2 e<sup>−</sup> plus 2 H<sup>+</sup> — to give FADH₂. Usually tightly bound to its enzyme as a prosthetic group rather than diffusing free.' },
    'CoA':  { name: 'coenzyme A', body: 'The business end is a free <b>thiol</b>, –SH, so it is often written CoA–SH. It forms <b>thioesters</b>, which are high-energy because sulfur stabilises the carbonyl poorly compared with an oxygen ester.', warn: 'That poor stabilisation is the whole point: a thioester holds enough free energy to drive a condensation.' },
    'acetyl-CoA': { name: 'acetyl coenzyme A', body: 'A two-carbon acetyl group on a thioester bond to CoA. The hub metabolite — the entry point to the citric acid cycle and the building block for fatty acids and cholesterol.', warn: 'Acetyl-CoA cannot make net glucose in humans: the two carbons are lost as CO₂ in the cycle. This is why fatty acids are not glucogenic.' },
    'TPP':  { name: 'thiamine pyrophosphate (vitamin B₁)', body: 'Carries an activated aldehyde. Required by every oxidative decarboxylation of an α-keto acid — pyruvate dehydrogenase, α-ketoglutarate dehydrogenase, branched-chain dehydrogenase — and by transketolase.' },
    'PLP':  { name: 'pyridoxal phosphate (vitamin B₆)', body: 'The cofactor of transamination. Forms a Schiff base with the amino group and acts as an electron sink.' },
    'THF':  { name: 'tetrahydrofolate', body: 'Carries <b>one-carbon</b> units at several oxidation levels, on N5, N10 or bridging both.', warn: 'The methyl group for methionine comes from THF but is handed over <b>by B₁₂</b> — the reason B₁₂ deficiency traps folate as methyl-THF.' },
    'SAM':  { name: 'S-adenosylmethionine', body: 'The universal methyl donor. Its sulfonium centre makes the methyl group strongly electrophilic — a much better donor than methyl-THF.' },

    'NADP+':  { name: 'nicotinamide adenine dinucleotide phosphate (oxidised)', body: 'Chemically identical to NAD<sup>+</sup> in the part that does the redox work. The only difference is an extra phosphate on the <b>2′ hydroxyl</b> of the adenosine ribose — a handle that has nothing to do with the chemistry and everything to do with recognition.', warn: 'That one phosphate lets enzymes keep two pools at opposite ratios: NAD<sup>+</sup>/NADH is held <b>oxidised</b> to accept electrons from catabolism, NADP<sup>+</sup>/NADPH is held <b>reduced</b> to donate them to biosynthesis. Same hydride, opposite direction.' },
    'NADPH':  { name: 'nicotinamide adenine dinucleotide phosphate (reduced)', body: 'The reducing power for <b>biosynthesis</b> — fatty-acid and cholesterol synthesis — and for keeping glutathione reduced.', warn: 'Made mainly by the oxidative arm of the pentose phosphate pathway. This is why G6PD deficiency shows up as haemolysis: no NADPH means no reduced glutathione, and the red cell cannot handle oxidative stress.' },
    'FADH2':  { name: 'flavin adenine dinucleotide (reduced)', body: 'Carries its two hydrogens into the chain at <b>complex II</b>, downstream of complex I.', warn: 'Because it skips one proton-pumping complex, FADH₂ yields ~1.5 ATP against NADH’s ~2.5. That difference is the reason the modern ATP count is 30–32 rather than the old 36–38.' },
    'G6P':    { name: 'glucose 6-phosphate', body: 'Glucose with a phosphate on <b>carbon 6</b>. The charge traps it inside the cell and marks the metabolic crossroads: glycolysis, glycogen synthesis, or the pentose phosphate pathway.' },
    'F6P':    { name: 'fructose 6-phosphate', body: 'A <b>ketose</b> with the phosphate still on carbon 6. The isomerisation from G6P moves the carbonyl from C1 to C2 — which is what makes the later aldol cleavage possible.' },
    'F1,6BP': { name: 'fructose 1,6-bisphosphate', body: 'Phosphates on <b>both ends</b>, C1 and C6, so each three-carbon half walks away already tagged. Made by PFK-1, the committed step.', warn: 'Do not confuse with fructose 2,6-bisphosphate. F1,6BP is the pathway <b>intermediate</b>; F2,6BP is a <b>regulator</b> that is not on the pathway at all.' },
    'F2,6BP': { name: 'fructose 2,6-bisphosphate', body: 'Not a glycolytic intermediate — a pure <b>signal</b>. It is the most powerful activator of PFK-1 and an inhibitor of fructose 1,6-bisphosphatase, so it drives glycolysis and blocks gluconeogenesis at the same time.', warn: 'Made and destroyed by one bifunctional enzyme (PFK-2/FBPase-2). Glucagon → PKA → phosphorylation switches it from making to destroying, which is how a hormone reverses the flux.' },
    'G3P':    { name: 'glyceraldehyde 3-phosphate', body: 'The three-carbon aldose that both halves of the hexose funnel into — phosphate on <b>C3</b>, aldehyde at C1. Also written GAP.', warn: 'Do not confuse with <b>glycerol</b> 3-phosphate, which is a different molecule and the carrier in the glycerol phosphate shuttle.' },
    'DHAP':   { name: 'dihydroxyacetone phosphate', body: 'The ketose half of the aldolase cleavage. Isomerised to G3P by triose phosphate isomerase, so <b>both</b> halves continue down the pathway — which is why one glucose yields two pyruvates.' },
    '1,3-BPG':{ name: '1,3-bisphosphoglycerate', body: 'An <b>acyl phosphate</b> at C1 — a mixed anhydride of a carboxylic acid and phosphoric acid. Hydrolysis releases about 49 kJ·mol⁻¹, well above ATP’s 30.5, so the phosphate can be handed downhill to ADP.' },
    'PEP':    { name: 'phosphoenolpyruvate', body: 'An <b>enol phosphate</b>, and the highest-energy phosphate in metabolism (~62 kJ·mol⁻¹).', warn: 'The energy is released not by the bond but by what happens after: the enol tautomerises to the far more stable keto form of pyruvate, and that tautomerisation is irreversible.' },
    'cAMP':   { name: 'cyclic AMP', body: 'AMP whose single phosphate bridges the <b>3′ and 5′</b> hydroxyls of the same ribose, forming a ring. Made by adenylyl cyclase from ATP, destroyed by phosphodiesterase.', warn: 'The classic second messenger: it activates protein kinase A. Caffeine and sildenafil work by inhibiting phosphodiesterases, so the cyclic nucleotide persists.' },
    'UTP':    { name: 'uridine 5′-triphosphate', phos: 3, plabel: 'uracil + ribose + three phosphates', body: 'Same α/β/γ naming as ATP. In glycogen synthesis, glucose 1-phosphate attacks the <b>α</b> phosphate of UTP, releasing PPᵢ and giving UDP-glucose.' }
  };

  var panel = null;
  function ensurePanel() {
    if (panel) return panel;
    panel = document.createElement('div');
    panel.className = 'shpanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Chemical shorthand');
    panel.setAttribute('data-open', 'false');
    document.body.appendChild(panel);
    return panel;
  }

  var openBtn = null;
  function closePanel() {
    if (panel) panel.setAttribute('data-open', 'false');
    if (openBtn) { openBtn.setAttribute('aria-expanded', 'false'); openBtn = null; }
  }

  function showShorthand(btn) {
    var key = btn.getAttribute('data-sh');
    var e = SH[key];
    if (!e) return;
    var p = ensurePanel();
    var html =
      '<div class="shpanel__head"><span class="shpanel__sym">' + key + '</span>' +
      '<span class="shpanel__name">' + e.name + '</span>' +
      '<button type="button" class="shpanel__close" data-sh-close aria-label="Close">×</button></div>';
    if (e.phos) html += nucSVG(e.phos, e.plabel || '');
    html += '<p>' + e.body + '</p>';
    if (e.warn) html += '<p class="shpanel__warn">' + e.warn + '</p>';
    p.innerHTML = html;
    p.setAttribute('data-open', 'true');
    if (openBtn && openBtn !== btn) openBtn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-expanded', 'true');
    openBtn = btn;
  }

  document.addEventListener('click', function (ev) {
    var t = ev.target;
    if (t.closest && t.closest('[data-sh-close]')) { closePanel(); return; }
    var btn = t.closest && t.closest('.sh[data-sh]');
    if (btn) {
      if (openBtn === btn) closePanel(); else showShorthand(btn);
      return;
    }
    if (panel && panel.getAttribute('data-open') === 'true' && !(t.closest && t.closest('.shpanel'))) closePanel();
  });

  document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape') closePanel(); });

  /* ---------- Quiz engine --------------------------------------------
     Usage:
       <section class="quiz" data-quiz></section>
       <script type="application/json" id="quiz-data">[ {stem, options, answer, explain} ]</script>
     `answer` is a 0-based index into `options`.
  --------------------------------------------------------------------- */
  var LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

  function buildQuiz(root, items) {
    var answered = 0, correct = 0, total = items.length;

    var bar = document.createElement('div');
    bar.className = 'quiz__bar';
    bar.innerHTML =
      '<div class="quiz__progress" role="progressbar" aria-label="Quiz progress"' +
      ' aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="0"><span></span></div>' +
      '<div class="quiz__score" data-score>0 / ' + total + ' answered · 0 correct</div>' +
      '<button type="button" class="btn" data-reset>Reset</button>';
    root.appendChild(bar);

    var fill = bar.querySelector('.quiz__progress span');
    var meter = bar.querySelector('.quiz__progress');
    var score = bar.querySelector('[data-score]');

    var result = document.createElement('div');
    result.className = 'quiz__result';
    result.hidden = true;

    items.forEach(function (item, i) {
      var q = document.createElement('article');
      q.className = 'q';

      var head = document.createElement('div');
      head.className = 'q__head';
      head.innerHTML = '<span class="q__idx">Q' + (i + 1) + '</span>';
      var stem = document.createElement('p');
      stem.className = 'q__stem';
      stem.innerHTML = item.stem;
      head.appendChild(stem);
      q.appendChild(head);

      var list = document.createElement('ul');
      list.className = 'q__opts';
      var buttons = [];

      item.options.forEach(function (opt, j) {
        var li = document.createElement('li');
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'q__opt';
        btn.innerHTML = '<span class="q__key">' + LETTERS[j] + '</span><span>' + opt + '</span>';
        btn.addEventListener('click', function () { choose(j); });
        li.appendChild(btn);
        list.appendChild(li);
        buttons.push(btn);
      });
      q.appendChild(list);

      var exp = document.createElement('div');
      exp.className = 'q__exp';
      exp.hidden = true;
      q.appendChild(exp);

      function choose(picked) {
        if (q.dataset.done) return;
        q.dataset.done = '1';
        var right = picked === item.answer;

        buttons.forEach(function (b, k) {
          b.disabled = true;
          if (k === item.answer) b.classList.add('q__opt--right');
          else if (k === picked) b.classList.add('q__opt--wrong');
        });

        exp.innerHTML =
          '<span class="q__verdict ' + (right ? 'q__verdict--ok">✓ Correct' : 'q__verdict--bad">✗ Incorrect') +
          '</span>Answer <b>' + LETTERS[item.answer] + '</b> — ' + item.explain;
        exp.hidden = false;

        answered++;
        if (right) correct++;
        fill.style.width = (answered / total * 100) + '%';
        meter.setAttribute('aria-valuenow', String(answered));
        score.textContent = answered + ' / ' + total + ' answered · ' + correct + ' correct';

        if (answered === total) {
          var pct = Math.round(correct / total * 100);
          var verdict = pct >= 90 ? 'Solid. This topic can move to the "one more pass before the exam" pile.'
                      : pct >= 70 ? 'Good base. Re-read the sections behind the ones you missed.'
                      : pct >= 50 ? 'The concepts are there, but the details will cost you marks. Work back through the sections the missed questions came from.'
                      : 'Read the page through once more before attempting the questions again.';
          result.innerHTML = '<p style="margin:0 0 .3rem">Score</p><strong>' + correct +
            ' / ' + total + '</strong><p style="margin:.4rem 0 0">' + pct + '% — ' + verdict + '</p>';
          result.hidden = false;
          result.scrollIntoView({ block: 'nearest' });
        }
      }

      root.appendChild(q);
    });

    root.appendChild(result);

    bar.querySelector('[data-reset]').addEventListener('click', function () {
      answered = 0; correct = 0;
      fill.style.width = '0%';
      meter.setAttribute('aria-valuenow', '0');
      score.textContent = '0 / ' + total + ' answered · 0 correct';
      result.hidden = true;
      root.querySelectorAll('.q').forEach(function (q) {
        delete q.dataset.done;
        q.querySelectorAll('.q__opt').forEach(function (b) {
          b.disabled = false;
          b.classList.remove('q__opt--right', 'q__opt--wrong');
        });
        q.querySelector('.q__exp').hidden = true;
      });
      root.scrollIntoView({ block: 'start' });
    });
  }

  /* A page may carry more than one quiz. Each [data-quiz] element reads its
     bank from data-quiz-src="#id", falling back to the shared #quiz-data. */
  document.addEventListener('DOMContentLoaded', function () {
    var roots = document.querySelectorAll('[data-quiz]');
    Array.prototype.forEach.call(roots, function (root) {
      var sel = root.getAttribute('data-quiz-src');
      var data = sel ? document.querySelector(sel) : document.getElementById('quiz-data');
      if (!data) {
        root.innerHTML = '<p class="callout callout--warn">Question bank not found' +
          (sel ? ' for selector <code>' + sel + '</code>' : '') + '.</p>';
        return;
      }
      try {
        var items = JSON.parse(data.textContent);
        if (!Array.isArray(items) || !items.length) throw new Error('bank is empty');
        buildQuiz(root, items);
      } catch (e) {
        root.innerHTML = '<p class="callout callout--warn">Failed to load question bank: ' + e.message + '</p>';
      }
    });
  });
})();
