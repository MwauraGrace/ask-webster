import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

function loginPage(invalid = false) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Ask Webster - Sign in</title><style>
  *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:#eef2f7;font:16px system-ui;color:#12376b;padding:24px}main{width:100%;max-width:400px;background:white;padding:32px;border-radius:16px;box-shadow:0 8px 30px #12376b18}h1{margin-top:0}label{display:block;margin-top:20px}input,button{width:100%;padding:12px;margin-top:8px;border-radius:8px;font:inherit}input{border:1px solid #aab8cc}button{background:#12376b;color:white;border:0;margin-top:24px;cursor:pointer}.error{color:#a11919}
  </style></head><body><main><h1>Ask Webster</h1><p>Sign in to the class demo.</p>${invalid ? '<p class="error" role="alert">Incorrect username or password. Please try again.</p>' : ''}<form method="post" action="/demo-login"><label for="username">Username</label><input id="username" name="username" value="demo" autocomplete="username" required><label for="password">Class password</label><input id="password" name="password" type="password" autocomplete="current-password" required><button type="submit">Sign in</button></form></main></body></html>`;
}

export function demoGate(password) {
  const digest = value => createHash('sha256').update(value).digest();
  const expected = digest(`demo:${password}`);
  const session = randomBytes(32).toString('hex');
  const matches = value => timingSafeEqual(digest(value), expected);
  return (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    if (req.path === '/demo-login' && req.method === 'POST') {
      if (typeof req.body?.username !== 'string' || typeof req.body?.password !== 'string' ||
          !matches(`${req.body.username}:${req.body.password}`)) return res.status(401).send(loginPage(true));
      const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
      res.setHeader('Set-Cookie', `ask_webster_demo=${session}; Path=/; HttpOnly; SameSite=Lax${secure}`);
      return res.redirect(303, '/');
    }
    const cookie = (req.headers.cookie || '').split(';').map(part => part.trim())
      .find(part => part.startsWith('ask_webster_demo='))?.slice('ask_webster_demo='.length);
    if (cookie && timingSafeEqual(digest(cookie), digest(session))) return next();
    // Retain compatibility with existing signed-in browsers and API checks.
    const header = req.headers.authorization || '';
    if (header.startsWith('Basic ') && matches(Buffer.from(header.slice(6), 'base64').toString('utf8'))) return next();
    if (req.path === '/api' || req.path?.startsWith('/api/')) {
      return res.status(401).json({ error: 'Refresh the demo page and sign in with username demo and your class password.' });
    }
    return res.status(401).send(loginPage());
  };
}
