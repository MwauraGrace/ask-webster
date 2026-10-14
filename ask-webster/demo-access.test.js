import test from 'node:test';
import assert from 'node:assert/strict';
import { demoGate } from './demo-access.js';
test('demo gate protects the website and API with the configured password', () => {
  for (const [authorization, allowed] of [
    ['', false],
    ['Basic ' + Buffer.from('demo:wrong').toString('base64'), false],
    ['Basic ' + Buffer.from('other:test-secret').toString('base64'), false],
    ['Basic ' + Buffer.from('demo:test-secret').toString('base64'), true],
  ]) {
    let next = false;
    const response = { headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code=code; return this; }, send() {} };
    demoGate('test-secret')({ headers: { authorization } }, response, () => { next = true; });
    assert.equal(next, allowed);
    if (!allowed) assert.equal(response.code, 401);
    assert.equal(response.headers['Cache-Control'], 'no-store');
  }
});

test('unauthenticated API requests return JSON rather than a sign-in text body', () => {
  let body;
  const response = { setHeader() {}, status(code) { assert.equal(code,401); return this; }, json(value) { body=value; } };
  demoGate('secret')({path:'/api/chat',headers:{}},response,()=>assert.fail('must not bypass authentication'));
  assert.match(body.error,/sign in/);
});

test('login form issues a cookie that authenticates page and API; invalid cookies fail', () => {
  const gate = demoGate('secret');
  const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(code) { this.code=code; return this; }, send(body) { this.body=body; }, json(body) { this.body=body; }, redirect(code,to) { this.code=code; this.to=to; } });
  const initial=response();gate({path:'/',headers:{}},initial,()=>assert.fail());
  assert.match(initial.body, /form method="post" action="\/demo-login"/);
  assert.equal(initial.headers['WWW-Authenticate'], undefined);
  const bad=response();gate({path:'/demo-login',method:'POST',headers:{},body:{username:'demo',password:'wrong'}},bad,()=>assert.fail());
  assert.equal(bad.code,401);assert.equal(bad.headers['Set-Cookie'],undefined);
  const login=response();gate({path:'/demo-login',method:'POST',headers:{'x-forwarded-proto':'https'},body:{username:'demo',password:'secret'}},login,()=>assert.fail());
  assert.equal(login.code,303);assert.equal(login.to,'/');
  assert.match(login.headers['Set-Cookie'], /HttpOnly; SameSite=Lax; Secure/);
  const cookie=login.headers['Set-Cookie'].split(';')[0];
  for(const path of ['/', '/api/chat']) {
    let allowed=false;gate({path,headers:{cookie}},response(),()=>{allowed=true;});assert.equal(allowed,true);
  }
  const rejected=response();gate({path:'/api/chat',headers:{cookie:'ask_webster_demo=fake'}},rejected,()=>assert.fail());assert.equal(rejected.code,401);
});
