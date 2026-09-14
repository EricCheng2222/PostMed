/* Browser-local study state. All pages work without storage or an account. */
(function () {
  'use strict';
  var KEY = 'postmed-study-v1';
  var data = { lessons: {} };
  var persistent = true;
  function read() {
    try {
      var saved = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (saved && saved.lessons && typeof saved.lessons === 'object' && !Array.isArray(saved.lessons)) data = saved;
    } catch (e) { /* Keep a usable in-memory session for invalid or unavailable storage. */ }
  }
  read();
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch (e) { persistent = false; }
  function get(id) {
    var value = Object.prototype.hasOwnProperty.call(data.lessons, id) && data.lessons[id];
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  }
  function update(id, patch) {
    if (!id || id === '__proto__' || id === 'constructor') return;
    data.lessons[id] = Object.assign({}, get(id), patch);
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { persistent = false; }
    window.dispatchEvent(new Event('postmed:progress'));
  }
  function quizSummary(lesson) {
    var banks = lesson.quizzes && typeof lesson.quizzes === 'object' ? Object.values(lesson.quizzes) : [];
    return {
      complete: banks.some(function (bank) { return bank && bank.total > 0 && bank.answered === bank.total; }),
      missed: banks.reduce(function (sum, bank) { return sum + (bank && Array.isArray(bank.missed) ? bank.missed.length : 0); }, 0)
    };
  }
  // A bank fingerprint prevents stale answers from being applied to edited questions.
  function fingerprint(items) {
    var text = JSON.stringify(items), hash = 2166136261;
    for (var i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
    return (hash >>> 0).toString(16);
  }
  function quizCreate(items, saved) {
    var signature = fingerprint(items);
    var valid = saved && saved.signature === signature && Array.isArray(saved.answers) && saved.answers.length === items.length;
    var answers = items.map(function (item, i) {
      var answer = valid ? saved.answers[i] : null;
      return Number.isInteger(answer) && answer >= 0 && answer < item.options.length ? answer : null;
    });
    function indices(value) {
      return Array.isArray(value) ? Array.from(new Set(value.filter(function (i) { return Number.isInteger(i) && i >= 0 && i < items.length; }))) : [];
    }
    var missed = valid ? indices(saved.missed) : [];
    answers.forEach(function (answer, i) {
      if (answer !== null && answer !== items[i].answer && !missed.includes(i)) missed.push(i);
      if (answer === items[i].answer) missed = missed.filter(function (index) { return index !== i; });
    });
    var review = valid ? indices(saved.review) : [];
    // A review must contain every unanswered question, otherwise it could never finish.
    var mode = valid && saved.mode === 'review' && review.length && answers.every(function (answer, i) { return answer !== null || review.includes(i); }) ? 'review' : 'full';
    var model = { signature: signature, answers: answers, missed: missed, mode: mode, review: review,
      best: valid && Number.isInteger(saved.best) && saved.best >= 0 && saved.best <= items.length ? saved.best : null, total: items.length, answered: 0 };
    quizSummaryState(model, items);
    return model;
  }
  function quizSummaryState(model, items) {
    var answered = 0, correct = 0;
    model.answers.forEach(function (answer, i) { if (answer !== null) { answered++; if (answer === items[i].answer) correct++; } });
    model.answered = answered;
    if (answered === items.length && model.mode === 'full') model.best = Math.max(model.best || 0, correct);
    return { answered: answered, correct: correct };
  }
  function quizChoose(model, items, index, picked) {
    if (!items[index] || model.answers[index] !== null || !Number.isInteger(picked) || picked < 0 || picked >= items[index].options.length) return false;
    if (model.mode === 'review' && !model.review.includes(index)) return false;
    model.answers[index] = picked;
    if (picked === items[index].answer) model.missed = model.missed.filter(function (i) { return i !== index; });
    else if (!model.missed.includes(index)) model.missed.push(index);
    quizSummaryState(model, items);
    return true;
  }
  function quizRetry(model, items) {
    if (!model.missed.length || quizSummaryState(model, items).answered !== items.length) return false;
    model.mode = 'review';
    model.review = model.missed.slice();
    model.review.forEach(function (i) { model.answers[i] = null; });
    quizSummaryState(model, items);
    return true;
  }
  function quizReset(model, items) {
    model.answers = items.map(function () { return null; });
    model.review = [];
    model.mode = 'full';
    quizSummaryState(model, items);
  }
  var filename = location.pathname.split('/').pop() || 'index.html';
  var pageId = /^(physics|biochem|biology)-.+\.html$/.test(filename) ? filename.replace(/\.html$/, '') : null;
  window.PostMed = { quiz: { create: quizCreate, choose: quizChoose, summary: quizSummaryState, retry: quizRetry, reset: quizReset }, get: get, update: update, quizSummary: quizSummary, pageId: pageId, persistent: function () { return persistent; } };
  window.addEventListener('storage', function (event) {
    if (event.key !== KEY && event.key !== null) return;
    data = { lessons: {} };
    read();
    window.dispatchEvent(new Event('postmed:progress'));
  });

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.querySelector('.topbar nav');
    if (nav && pageId) {
      var library = document.createElement('a');
      library.href = '../index.html#library';
      library.textContent = 'Find a lesson';
      nav.insertBefore(library, nav.firstChild);
    }
    // Shelf rows carry the same progress as the study desk.
    var entries = document.querySelectorAll('a.entry');
    function updateShelf() {
      entries.forEach(function (entry) {
        var id = entry.getAttribute('href').split('/').pop().replace(/\.html$/, '');
        var lesson = get(id), summary = quizSummary(lesson);
        var badge = entry.querySelector('[data-study-badge]');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'tag';
          badge.setAttribute('data-study-badge', '');
          (entry.querySelector('.entry__tags') || entry).appendChild(badge);
        }
        badge.textContent = summary.missed ? summary.missed + ' to revisit' : lesson.read ? 'Read' : lesson.visited ? 'In progress' : 'Not started';
      });
    }
    updateShelf();
    window.addEventListener('postmed:progress', updateShelf);
    if (!pageId) return;
    var head = document.querySelector('.article-head');
    var toc = document.querySelector('.toc');
    if (!head || !toc) return;
    update(pageId, { visited: Date.now() });
    var toolbar = document.createElement('div');
    toolbar.className = 'reading-tools';
    toolbar.id = 'reading-tools';
    toolbar.innerHTML = '<label for="section-jump">Jump to a section<select id="section-jump"><option value="">Choose a section…</option></select></label>' +
      '<button type="button" class="btn" data-read aria-pressed="false">Mark as read</button>' +
      '<button type="button" class="btn" data-save aria-pressed="false">Save for later</button>' +
      '<p class="reading-status" role="status" aria-live="polite"></p>';
    toc.before(toolbar);
    var select = toolbar.querySelector('select');
    var links = Array.from(toc.querySelectorAll('a[href^="#"]')).filter(function (link) {
      return document.getElementById(decodeURIComponent(link.hash.slice(1)));
    });
    links.forEach(function (link) {
      var option = document.createElement('option');
      option.value = link.hash;
      option.textContent = link.textContent;
      select.appendChild(option);
    });
    function remember(hash) {
      if (links.some(function (link) { return link.hash === hash; })) {
        update(pageId, { section: hash, visited: Date.now() });
      }
    }
    select.addEventListener('change', function () {
      if (select.value) { location.hash = select.value; remember(select.value); }
    });
    window.addEventListener('hashchange', function () { remember(location.hash); });
    var resume = document.createElement('a');
    resume.className = 'btn';
    toolbar.insertBefore(resume, toolbar.querySelector('.reading-status'));
    function render() {
      var lesson = get(pageId);
      var read = toolbar.querySelector('[data-read]'), save = toolbar.querySelector('[data-save]');
      read.setAttribute('aria-pressed', String(!!lesson.read));
      read.textContent = lesson.read ? '✓ Read · undo' : 'Mark as read';
      save.setAttribute('aria-pressed', String(!!lesson.saved));
      save.textContent = lesson.saved ? '✓ Saved · remove' : 'Save for later';
      toolbar.querySelector('.reading-status').textContent = persistent
        ? 'Progress saved in this browser. Learn opens the essentials; Reference expands every explanation.'
        : 'Browser storage is unavailable. Progress lasts for this page only.';
      var target = links.find(function (link) { return link.hash === lesson.section; });
      resume.hidden = !target;
      if (target) { resume.href = target.hash; resume.textContent = 'Resume: ' + target.textContent; }
    }
    toolbar.querySelector('[data-read]').addEventListener('click', function () { update(pageId, { read: !get(pageId).read }); });
    toolbar.querySelector('[data-save]').addEventListener('click', function () { update(pageId, { saved: !get(pageId).saved }); });
    window.addEventListener('postmed:progress', render);
    render();
    // Record the section nearest the reading line, throttled to one animation frame.
    var targets = links.map(function (link) { return { hash: link.hash, node: document.getElementById(decodeURIComponent(link.hash.slice(1))) }; });
    var scheduled = false;
    function savePosition() {
      scheduled = false;
      var header = document.querySelector('.topbar');
      var line = (header ? header.getBoundingClientRect().height : 80) + 100;
      var current = null;
      targets.forEach(function (target) { if (target.node.getBoundingClientRect().top <= line) current = target; });
      if (current && get(pageId).section !== current.hash) {
        remember(current.hash);
        select.value = current.hash;
      }
    }
    window.addEventListener('scroll', function () {
      if (!scheduled) { scheduled = true; requestAnimationFrame(savePosition); }
    }, { passive: true });
    if (location.hash) remember(location.hash);
    var back = document.createElement('a');
    back.href = '#reading-tools';
    back.className = 'btn reading-return';
    back.textContent = '↑ Lesson tools';
    back.hidden = true;
    document.body.appendChild(back);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) { back.hidden = entries[0].isIntersecting || toolbar.getBoundingClientRect().top > 0; }).observe(toolbar);
    }
  });
})();
