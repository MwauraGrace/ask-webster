import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { documentsFrom, retrieve, answerQuestion, FALLBACK } from './rag.js';
const entries = JSON.parse(fs.readFileSync(new URL('./campusData.json', import.meta.url)));
const docs = documentsFrom(entries);
test('placeholder entries and fields never become evidence', () => {
  assert.equal(docs.length, entries.length);
  assert.ok(docs.every(doc => !doc.text.includes('TODO')));
  assert.deepEqual(documentsFrom([{ description: 'hello', url: 'https://webster.edu.evil.com' }]), []);
});
test('retrieves relevant evidence and rejects unknown topics', () => {
  assert.equal(retrieve('resume interview', docs)[0].id, 'career-planning');
  assert.equal(retrieve('contact admissions phone', docs)[0].id, 'admissions');
  assert.deepEqual(retrieve('dinosaur astronomy', docs), []);
});
function mockClient(outputs, calls) {
  return { messages: { create: async args => {
    calls.push(args);
    return { content: [{ type: 'text', text: outputs.shift() }], stop_reason: 'end_turn' };
  } } };
}
test('follow-up history goes to query reformulation and answer generation', async () => {
  const calls = [];
  const history = [{ role: 'user', content: 'Who reviews resumes?' }];
  const result = await answerQuestion({ message: 'Where are they?', history, entries, model: 'test',
    client: mockClient(['career resume office location', 'The center is at 568 Garden Avenue. [1]'], calls) });
  assert.equal(result.sources[0].id, 'career-planning');
  assert.deepEqual(JSON.parse(calls[0].messages[0].content).history, history);
  assert.ok(!calls[1].messages[0].content.includes('TODO'));
});
test('unknown question skips generation', async () => {
  const calls = [];
  const result = await answerQuestion({ message: 'dinosaurs', history: [], entries, model: 'test', client: mockClient(['dinosaurs'], calls) });
  assert.equal(result.reply, FALLBACK);
  assert.equal(calls.length, 0);
});
test('invalid or missing citations fail closed', async () => {
  for (const answer of ['Unsupported answer.', 'Wrong source [99]']) {
    const result = await answerQuestion({ message: 'resume', history: [], entries, model: 'test', client: mockClient([answer], []) });
    assert.equal(result.reply, FALLBACK);
    assert.deepEqual(result.sources, []);
  }
});

test('ordinary questions use one model call, including local synonyms', async () => {
  for (const message of ['Who can review my resume?', 'Who can review my CV?', 'Help finding employment']) {
    const calls = [];
    const result = await answerQuestion({ message, history: [], entries, model: 'test',
      client: mockClient(['The Career Planning center can help. [1]'], calls) });
    assert.equal(calls.length, 1);
    assert.equal(result.sources[0].id, 'career-planning');
    assert.equal(calls[0].max_tokens, 350);
  }
});
test('a new explicit topic does not trigger a rewrite just because history exists', async () => {
  const calls = [];
  const result = await answerQuestion({ message: 'How can I contact admissions by phone?',
    history: [{ role: 'user', content: 'Who reviews my resume?' }], entries, model: 'test',
    client: mockClient(['The Office of Admissions handles applications. [1]'], calls) });
  assert.equal(calls.length, 1);
  assert.equal(result.sources[0].id, 'admissions');
  assert.deepEqual(JSON.parse(calls[0].messages[0].content).history, []);
});
test('short follow-ups still rewrite before answering', async () => {
  for (const message of ['Where is that office?', 'What are the hours?', 'And the phone number?']) {
    const calls = [];
    await answerQuestion({ message, history: [{ role: 'user', content: 'Who reviews resumes?' }], entries, model: 'test',
      client: mockClient(['career resume office hours phone', 'Contact the career center. [1]'], calls) });
    assert.equal(calls.length, 2);
  }
});

test('empty or truncated answers return labeled source excerpts without another model call', async () => {
  for (const [text, stop_reason] of [['Made-up partial answer [1]', 'max_tokens'], ['', 'end_turn']]) {
    let calls = 0;
    const client = { messages: { create: async () => {
      calls++;
      return { content: [{ type: 'text', text }], stop_reason };
    } } };
    const result = await answerQuestion({ message: 'resume', history: [], entries, model: 'test', client });
    assert.equal(calls, 1);
    assert.equal(result.mode, 'source-excerpts');
    assert.match(result.reply, /matching source excerpts/);
    assert.ok(result.reply.includes(docs.find(doc => doc.id === 'career-planning').text));
    assert.ok(!result.reply.includes('Made-up partial answer'));
    assert.ok(!result.reply.includes('TODO'));
    assert.equal(result.sources[0].id, 'career-planning');
  }
});

test('new source topics retrieve specific evidence', () => {
  assert.equal(retrieve('test optional transcripts personal statement', docs)[0].id, 'first-year-test-optional');
  assert.equal(retrieve('Handshake login jobs', docs)[0].id, 'handshake-access');
  assert.equal(retrieve('IT technology support', docs)[0].id, 'it-support');
  assert.match(docs.find(doc => doc.id === 'career-planning').text, /NOT currently available/);
});

test('remaining campus topics retrieve the right source', () => {
  for (const [question, id] of [
    ['How do I apply for housing?', 'housing-application'],
    ['What is the FAFSA school code?', 'financial-aid-fafsa'],
    ['What are the library hours?', 'library'],
    ['How do I reserve a library study room?', 'library-study-rooms'],
    ['Who helps international students with I-20 documents?', 'international-students'],
    ['How do I report housing maintenance?', 'housing'],
  ]) assert.equal(retrieve(question, docs)[0].id, id, question);
  assert.match(docs.find(doc => doc.id === 'library').text, /Fall 2026/);
  assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
});
