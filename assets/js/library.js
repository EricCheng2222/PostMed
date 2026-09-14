/* Offline catalog filtering and the personal study desk. */
(function () {
  'use strict';
  var lessons = window.POSTMED_LESSONS, study = window.PostMed;
  if (!lessons || !study) return;
  var search = document.getElementById('lesson-search');
  var status = document.getElementById('lesson-status');
  var filters = document.querySelectorAll('[data-filter]');
  var subject = 'all';
  var params = new URLSearchParams(location.search);
  search.value = params.get('q') || '';
  if (Array.from(status.options).some(function (option) { return option.value === params.get('status'); })) status.value = params.get('status');
  if (Array.from(filters).some(function (button) { return button.dataset.filter === params.get('subject'); })) subject = params.get('subject');
  document.getElementById('library-controls').hidden = false;

  function normalized(text) { return text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); }
  var rows = lessons.map(function (lesson) {
    var row = document.querySelector('[data-lesson="' + lesson.id + '"]');
    var actions = document.createElement('div');
    actions.className = 'lesson-actions';
    var state = document.createElement('a');
    state.className = 'lesson-state';
    var save = document.createElement('button');
    save.className = 'save-lesson';
    save.type = 'button';
    save.setAttribute('aria-label', 'Save for later: ' + lesson.title);
    save.addEventListener('click', function () { study.update(lesson.id, { saved: !study.get(lesson.id).saved }); });
    actions.append(state, save);
    row.appendChild(actions);
    var match = document.createElement('a');
    match.className = 'lesson-match';
    match.hidden = true;
    row.querySelector('h3').parentNode.appendChild(match);
    return { lesson: lesson, row: row, state: state, save: save, match: match,
      text: normalized([lesson.title, lesson.description, lesson.subject, lesson.number || '', lesson.sections.map(function (section) { return section.title; }).join(' ')].join(' ')) };
  });
  function matchesStatus(progress, summary) {
    switch (status.value) {
      case 'new': return !progress.visited && !progress.read && !summary.complete;
      case 'started': return !!progress.visited && !progress.read;
      case 'read': return !!progress.read;
      case 'review': return summary.missed > 0;
      case 'saved': return !!progress.saved;
      default: return true;
    }
  }
  function render() {
    var terms = normalized(search.value.trim()).split(/\s+/).filter(Boolean);
    var visible = 0;
    rows.forEach(function (item) {
      var lesson = item.lesson, progress = study.get(lesson.id), summary = study.quizSummary(progress);
      item.row.hidden = !((subject === 'all' || lesson.subject.toLowerCase() === subject) && terms.every(function (term) { return item.text.includes(term); }) && matchesStatus(progress, summary));
      if (!item.row.hidden) visible++;
      item.state.textContent = summary.missed ? summary.missed + ' to revisit' : progress.read ? 'Read' : summary.complete ? 'Test complete' : progress.visited ? 'In progress' : 'Not started';
      item.state.className = 'lesson-state' + (summary.missed ? ' lesson-state--review' : '');
      if (summary.missed) item.state.href = lesson.href + '#quiz';
      else item.state.removeAttribute('href');
      item.save.textContent = progress.saved ? '✓ Saved' : 'Save';
      item.save.setAttribute('aria-pressed', String(!!progress.saved));
      item.save.setAttribute('aria-label', (progress.saved ? 'Remove saved lesson: ' : 'Save for later: ') + lesson.title);
      var section = terms.length && lesson.sections.find(function (section) { return terms.every(function (term) { return normalized(section.title).includes(term); }); });
      item.match.hidden = !section;
      if (section) { item.match.href = lesson.href + '#' + section.id; item.match.textContent = 'Go to section: ' + section.title; }
    });
    filters.forEach(function (button) { button.setAttribute('aria-pressed', String(button.dataset.filter === subject)); });
    document.getElementById('library-count').textContent = visible + ' of ' + lessons.length + ' lessons and guides';
    document.getElementById('library-empty').hidden = visible !== 0;
    var core = lessons.filter(function (lesson) { return lesson.number; });
    document.getElementById('read-count').textContent = core.filter(function (lesson) { return study.get(lesson.id).read; }).length;
    document.getElementById('quiz-count').textContent = core.filter(function (lesson) { return study.quizSummary(study.get(lesson.id)).complete; }).length;
    document.getElementById('review-count').textContent = lessons.filter(function (lesson) { return study.quizSummary(study.get(lesson.id)).missed > 0; }).length;
    var recent = lessons.filter(function (lesson) { return study.get(lesson.id).visited; }).sort(function (a, b) { return study.get(b.id).visited - study.get(a.id).visited; })[0];
    if (recent) {
      var progress = study.get(recent.id);
      var section = recent.sections.find(function (section) { return '#' + section.id === progress.section; });
      document.getElementById('session-label').textContent = 'Pick up where you left off';
      document.getElementById('session-title').textContent = recent.title;
      document.getElementById('session-copy').textContent = section ? 'Your last section: ' + section.title : recent.subject + ' · Read a section, try an example, then check your recall.';
      document.getElementById('session-link').textContent = 'Continue learning →';
      document.getElementById('session-link').href = recent.href + (section ? '#' + section.id : '');
    } else {
      document.getElementById('session-label').textContent = 'A good place to begin';
      document.getElementById('session-title').textContent = 'One lesson. One clear next step.';
      document.getElementById('session-copy').textContent = 'Choose a subject below, or begin with motion: position, velocity and acceleration.';
      document.getElementById('session-link').textContent = 'Start with kinematics →';
      document.getElementById('session-link').href = 'pages/physics-01-kinematics.html';
    }
    document.getElementById('storage-note').textContent = study.persistent() ? 'Your progress stays in this browser. No account needed.' : 'Browser storage is unavailable. Progress will not survive navigation.';
  }
  function filterChanged() {
    var next = new URLSearchParams();
    if (search.value.trim()) next.set('q', search.value.trim());
    if (subject !== 'all') next.set('subject', subject);
    if (status.value !== 'all') next.set('status', status.value);
    try { history.replaceState(null, '', location.pathname + (next.size ? '?' + next.toString() : '') + location.hash); } catch (e) { /* file:// may disallow history updates */ }
    render();
  }
  search.addEventListener('input', filterChanged);
  status.addEventListener('change', filterChanged);
  filters.forEach(function (button) { button.addEventListener('click', function () { subject = button.dataset.filter; filterChanged(); }); });
  document.getElementById('clear-filters').addEventListener('click', function () { search.value = ''; status.value = 'all'; subject = 'all'; filterChanged(); search.focus(); });
  window.addEventListener('postmed:progress', render);
  window.addEventListener('pageshow', render);
  render();
})();
