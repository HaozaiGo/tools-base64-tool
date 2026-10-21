const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function app() {
  const options = {'opt-urlsafe': {checked: false}, 'opt-wrap': {checked: false}};
  const context = vm.createContext({ TextEncoder, TextDecoder, atob, btoa, document: {documentElement: {lang:'en'}, addEventListener() {}, getElementById: id => options[id]} });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../js/app.js'), 'utf8'), context);
  return {context, options};
}
test('Unicode round trips with standard, URL-safe and wrapped Base64', () => {
  const {context:c, options} = app();
  const value = 'Hello 中文 🌊 + / =\n'.repeat(20);
  assert.equal(c.decodeBase64(c.encodeBase64(value)), value);
  options['opt-urlsafe'].checked = true; options['opt-wrap'].checked = true;
  assert.equal(c.decodeBase64(c.encodeBase64(value)), value);
});
test('Data URI accepts MIME parameters and does not truncate wrapped data', () => {
  const {context:c} = app();
  assert.equal(c.decodeBase64('data:text/plain;charset=utf-8;base64,SGVs\nbG8='), 'Hello');
  assert.equal(c.decodeBase64('data:;base64,SGVsbG8='), 'Hello');
});
test('invalid input fails explicitly', () => {
  const {context:c} = app();
  for (const input of ['%%%', 'A', 'data:text/plain,hello']) assert.throws(() => c.decodeBase64(input));
});
