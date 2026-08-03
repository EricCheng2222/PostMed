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
                      : pct >= 50 ? 'The concepts are there, but the details will cost you marks. Re-read §01 and §06.'
                      : 'Read the page through once more before attempting questions again.';
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

  document.addEventListener('DOMContentLoaded', function () {
    var root = document.querySelector('[data-quiz]');
    var data = document.getElementById('quiz-data');
    if (!root || !data) return;
    try {
      buildQuiz(root, JSON.parse(data.textContent));
    } catch (e) {
      root.innerHTML = '<p class="callout callout--warn">Failed to load question bank: ' + e.message + '</p>';
    }
  });
})();
