import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const password = randomBytes(24).toString('hex');
const child = spawn(process.execPath, ['start-demo.mjs'], {env:{...process.env, PORT:'3901', DEMO_PASSWORD:password}, stdio:['ignore','pipe','pipe']});
try {
  await new Promise((resolve,reject) => {
    const timer=setTimeout(()=>reject(new Error('Startup timed out')),10000);
    child.stdout.on('data',chunk=>{if(chunk.toString().includes('Server running')) {clearTimeout(timer);resolve();}});
    child.on('exit',code=>{clearTimeout(timer);reject(new Error('Server exited: '+code));});
  });
  const base='http://127.0.0.1:3901';
  assert.equal((await fetch(base)).status,401);
  assert.equal((await fetch(base+'/api/chat',{method:'POST'})).status,401);
  const login=await fetch(base+'/demo-login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:'demo',password}),redirect:'manual'});
  assert.equal(login.status,303);
  const headers={Cookie:login.headers.get('set-cookie').split(';')[0]};
  const page=await fetch(base,{headers});assert.equal(page.status,200);assert.match(await page.text(),/id="root"/);
  const api=await fetch(base+'/api/chat',{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{}'});assert.equal(api.status,400);
  assert.equal((await fetch(base+'/.env',{headers})).status,404);
  console.log('Demo smoke check passed.');
} finally {child.kill();}
