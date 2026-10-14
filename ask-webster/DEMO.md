# Class demo

Ollama stays on your laptop. The built React site and Express API share port 3001; only this port goes through the HTTPS tunnel. The demo username is `demo`, and the password is the value you enter. One AI request is allowed at a time.

Open Ollama. Stop any existing backend on port 3001 with Ctrl+C.

In PowerShell:

```powershell
cd ask-webster
npm run build:demo
$env:DEMO_PASSWORD = Read-Host "Choose a class demo password"
npm run demo
```

Open http://localhost:3001 and enter the username and password in the login form. Restarting the backend signs everyone out; refresh and sign in again. You do not need `npm run dev` for this setup. Rebuild after frontend changes. Refresh after data changes and restart the backend.

Install the Windows cloudflared executable or MSI from https://developers.cloudflare.com/tunnel/downloads/. If using the executable directly, rename it cloudflared.exe and run it using its full path or from its folder.

In a second PowerShell window, run the installed executable:

```powershell
cloudflared tunnel --url http://127.0.0.1:3001
```

Share the printed HTTPS trycloudflare.com link plus username `demo` and your chosen password. Leave Ollama, the demo server and tunnel running; keep your laptop awake and online. Stop the tunnel with Ctrl+C to end public access. Each new tunnel gets a new URL. This does not make CPU answers faster. Do not tunnel Ollama's port 11434.

Reference: https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/

Validation: `npm test`, frontend lint/build, and `node check-demo.mjs` (starts and stops a temporary demo server on port 3901).
