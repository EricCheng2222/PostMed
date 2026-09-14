const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../assets/js/study.js'), 'utf8');
function load(storage = {}, blocked = false) {
  const listeners = {};
  const context = vm.createContext({
    window: { addEventListener(name, fn) { listeners[name] = fn; }, dispatchEvent() {} },
    document: { addEventListener() {} },
    location: { pathname: '/pages/physics-01-kinematics.html' },
    localStorage: { getItem(k) { if (blocked) throw Error('blocked'); return storage[k] || null; }, setItem(k,v) { if (blocked) throw Error('blocked'); storage[k] = v; } },
    Event: class { constructor(type) { this.type = type; } }
  });
  vm.runInContext(source, context);
  return { study: context.window.PostMed, listeners };
}
const items = [
  { stem:'First', options:['A','B'], answer:0, explain:'A is right.' },
  { stem:'Second', options:['A','B'], answer:1, explain:'B is right.' },
  { stem:'Third', options:['A','B'], answer:0, explain:'A is right.' }
];
const plain = value => JSON.parse(JSON.stringify(value));

test('read, saved and section progress survive navigation without overwriting each other', () => {
  const storage = {};
  let {study} = load(storage);
  study.update(study.pageId, {read:true, saved:true, section:'#s4'});
  study.update(study.pageId, {visited:123});
  study = load(storage).study;
  assert.deepEqual(plain(study.get(study.pageId)), {read:true, saved:true, section:'#s4', visited:123});
});
test('invalid and unavailable storage leave a working in-memory session', () => {
  for (const [storage, blocked] of [[{'postmed-study-v1':'broken'},false], [{},true], [{'postmed-study-v1':'{"lessons":[]}'},false]]) {
    const {study} = load(storage, blocked);
    study.update('lesson', {read:true});
    assert.equal(study.get('lesson').read, true);
    assert.equal(study.persistent(), !blocked);
  }
});
test('storage changes in another tab refresh progress, including clearing it', () => {
  const storage = {};
  const {study, listeners} = load(storage);
  storage['postmed-study-v1'] = '{"lessons":{"lesson":{"read":true}}}';
  listeners.storage({key:'postmed-study-v1'});
  assert.equal(study.get('lesson').read, true);
  delete storage['postmed-study-v1'];
  listeners.storage({key:null});
  assert.deepEqual(plain(study.get('lesson')), {});
});
test('quiz saves partial answers, rejects duplicate choices, and resumes correctly', () => {
  const {study} = load();
  const q = study.quiz;
  let model = q.create(items);
  assert.equal(q.choose(model,items,0,1), true);
  assert.equal(q.choose(model,items,0,0), false);
  assert.equal(q.retry(model,items), false);
  model = q.create(items, plain(model));
  assert.deepEqual(plain(model.answers), [1,null,null]);
  q.choose(model,items,1,1);
  q.choose(model,items,2,0);
  assert.equal(model.best, 2);
  assert.equal(model.answered, 3);
  assert.deepEqual(plain(model.missed), [0]);
});
test('retry corrects only mistakes and never inflates the best full-attempt score', () => {
  const q = load().study.quiz;
  let model = q.create(items);
  [1,0,0].forEach((a,i) => q.choose(model,items,i,a));
  assert.equal(model.best, 1);
  assert.equal(q.retry(model,items), true);
  model = q.create(items, plain(model));
  assert.equal(model.mode, 'review');
  assert.deepEqual(plain(model.answers), [null,null,0]);
  assert.equal(q.choose(model,items,2,0), false);
  q.choose(model,items,0,0);
  q.choose(model,items,1,0);
  assert.deepEqual(plain(model.missed), [1]);
  q.retry(model,items);
  q.choose(model,items,1,1);
  assert.equal(model.best, 1);
  assert.deepEqual(plain(model.missed), []);
  assert.equal(q.summary(model,items).correct, 3);
  q.reset(model,items);
  [0,1,0].forEach((a,i) => q.choose(model,items,i,a));
  assert.equal(model.best, 3);
});
test('new attempts retain unresolved mistakes until answered correctly', () => {
  const q = load().study.quiz;
  const model = q.create(items);
  [1,1,0].forEach((a,i) => q.choose(model,items,i,a));
  q.reset(model,items);
  assert.deepEqual(plain(model.missed), [0]);
  assert.equal(model.best, 2);
  q.choose(model,items,0,0);
  assert.deepEqual(plain(model.missed), []);
});
test('edited question banks discard stale answers and corrupt selections are sanitized', () => {
  const q = load().study.quiz;
  const model = q.create(items);
  q.choose(model,items,0,0);
  const changed = plain(items); changed[0].answer = 1;
  assert.deepEqual(plain(q.create(changed,model).answers), [null,null,null]);
  model.answers = [99,-2,'0']; model.missed = [100,'0',1,1]; model.best = 50;
  const clean = q.create(items,model);
  assert.deepEqual(plain(clean.answers), [null,null,null]);
  assert.deepEqual(plain(clean.missed), [1]);
  assert.equal(clean.best, null);
});
test('independent question banks contribute review counts without mixing answers', () => {
  const {study} = load();
  const first = study.quiz.create(items), second = study.quiz.create(items);
  [0,1,0].forEach((a,i) => study.quiz.choose(first,items,i,a));
  study.quiz.choose(second,items,0,1);
  assert.deepEqual(plain(study.quizSummary({quizzes:{first,second}})), {complete:true, missed:1});
});
