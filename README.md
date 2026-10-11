# Wattora

**Personalized solar and household-energy insights.**

Wattora is a React/Vite and FastAPI application for exploring solar generation,
household demand, and energy-use recommendations. Signed-in users have private
profiles, preferences, sites, and devices. Forecasts use trained models together
with the selected user's site capacity, configured usage, and enabled devices.

> Forecasts are estimates: the application currently does not connect to live
> weather services, smart meters, or inverter telemetry.

## Project overview

| Area | What it does |
| --- | --- |
| Dashboard | Combines the selected site's solar and demand estimates. |
| Solar | Displays a solar-generation estimate scaled to site capacity. |
| Energy | Estimates demand using the selected site's usage and enabled devices. |
| Optimization | Compares site solar output with enabled device load and uses the account's saved optimization preferences. |
| Sites and devices | Stores private site and appliance configuration for each account. |
| Account | Registration, Gmail email verification, sign-in, password reset, profile, and preferences. |

## Architecture

```text
Browser
  └── React/Vite static frontend
        └── FastAPI REST API
              ├── PostgreSQL on Neon: accounts, profiles, preferences
              ├── SQLite on the backend host: owner-scoped sites and devices
              └── shared trained solar and demand model files
```

For the single-instance EC2 deployment in this guide, Nginx serves the static
frontend and forwards `/api` requests to FastAPI on localhost. Neon remains the
PostgreSQL provider; AWS is used for hosting the application. The site/device
SQLite database is on the EC2 instance's attached disk. This is appropriate
only for a single-instance demo: back it up, and do not scale the API to
multiple instances while using this local SQLite store.

## Run locally

### Requirements

- Node.js and npm
- Python 3.14 (the tested backend environment) and pip
- PostgreSQL credentials for a Neon database
- Gmail SMTP credentials if testing verification or password-reset emails

### Start the backend

From the repository root in PowerShell:

```powershell
Copy-Item backend\.env.example backend\.env
if (!(Test-Path backend\.venv)) {
  py -3.14 -m venv backend\.venv
}
```

Edit `backend\.env` with the Neon settings, a random `JWT_SECRET_KEY` of at
least 32 characters, and Gmail SMTP settings. Do not commit or share this file.

Then install dependencies and start FastAPI:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

If Python 3.14 is unavailable, replace `py -3.14` with the installed Python
version supported by your project environment.

### Start the frontend

In a second terminal from the repository root:

```powershell
npm install
npm run dev
```

The local frontend uses `http://127.0.0.1:8000` for the API by default.
`VITE_API_BASE_URL` can override this in the root `.env.local` file.

## Email configuration

In the Google Account used to send app email, enable 2-Step Verification and
create an App Password. Set `SMTP_USERNAME` and `EMAIL_FROM` to that Gmail
address, and put the generated App Password—not the regular Google password—in
`SMTP_PASSWORD`. Gmail SMTP uses `smtp.gmail.com` on port `587`.

Keep all email credentials on the backend. Never put SMTP credentials in a
`VITE_*` variable, frontend build, public repository, or chat message.

## Deploy a demo on one AWS EC2 instance

This walkthrough keeps Neon as PostgreSQL and uses one Ubuntu EC2 instance for
the frontend and API. It is a simple hackathon/demo topology, not a
high-availability production architecture.

### 1. Check eligibility, costs, and repository contents

1. Confirm the specific hackathon permits this deployment approach and that
   your project was started within that hackathon's allowed build window. The
   rules you shared say a project started before the event opens does not
   qualify.
2. Check the AWS account's current Free Tier eligibility and credit terms.
   Eligible instance types, account duration, and included usage depend on
   account creation date and current offers. See [EC2 Free Tier usage](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html).
3. Create an AWS Budget alert before launching. EC2 storage, IP addresses, data
   transfer, and other resources can have costs; do not assume every resource
   is free.
4. The event requires a public repository. Before making it public, scan for
   secrets and confirm `.env`, `.env.local`, private keys, and credentials are
   not included. The repository `.gitignore` excludes `.env*` files other than
   `.env.example`; verify the actual Git-tracked file list before publishing.

### 2. Launch EC2

In the AWS Console:

1. Open **EC2 → Launch instance**.
2. Choose an Ubuntu LTS AMI and an instance type that the console explicitly
   marks **Free tier eligible** for your account.
3. Create a key pair and download the private key. Keep it private and backed
   up safely.
4. Configure the instance's security group:
   - SSH, TCP `22`, source **My IP** only.
   - HTTP, TCP `80`, source `0.0.0.0/0` for a temporary HTTP setup or a tunnel
     that connects to this port.
   - Do not expose FastAPI port `8000` publicly.
5. Launch the instance and note its public IPv4 address.

For entering real passwords, use HTTPS. Without a domain, a temporary HTTPS
tunnel can be used for a demo; a plain HTTP IP address is not suitable for
collecting real credentials. A Quick Tunnel URL may change, so the backend
frontend-origin settings must be updated when it does.

### 3. Connect and install server packages

From Windows PowerShell, replace the key path and IP with your values:

```powershell
ssh -i "C:\path\to\your-key.pem" ubuntu@YOUR_EC2_PUBLIC_IP
```

In the EC2 shell:

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip build-essential nginx git
git clone https://github.com/YOUR_USERNAME/YOUR_PUBLIC_REPOSITORY.git ~/wattora
cd ~/wattora/backend
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

The trained model files under `backend/models` must be present in the cloned
repository. If installation runs out of memory on the selected instance, stop
and review instance eligibility and capacity rather than silently upgrading to
a paid size.

### 4. Configure backend environment on EC2

On EC2:

```bash
cd ~/wattora/backend
cp .env.example .env
nano .env
chmod 600 .env
```

Set the Neon `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, and `DB_PASSWORD`;
create a fresh random `JWT_SECRET_KEY`; and set Gmail `EMAIL_FROM`,
`SMTP_USERNAME`, and `SMTP_PASSWORD`. Keep the SMTP app password and database
password private.

Set `FRONTEND_URL` to the public HTTPS site URL that users will open. Set
`FRONTEND_ORIGINS` to that exact origin (scheme and host, with no path). For
example:

```env
FRONTEND_URL=https://your-demo.example
FRONTEND_ORIGINS=https://your-demo.example
```

Do not leave the local-development origins in production. If Nginx serves the
frontend and proxies the API on the same host, browser API requests are
same-origin and CORS is not required for those requests. The API still has
explicit CORS support for a separately hosted frontend; in that case, list
only the exact frontend origin in `FRONTEND_ORIGINS`.

### 5. Build and upload the frontend

On your Windows computer, from the repository root, make the production frontend
use same-origin `/api` requests:

```powershell
Set-Content -NoNewline -Path .env.production -Value 'VITE_API_BASE_URL='
npm ci
npm run build
scp -i "C:\path\to\your-key.pem" -r .\dist ubuntu@YOUR_EC2_PUBLIC_IP:/home/ubuntu/wattora/
```

Vite embeds `VITE_*` values into the browser bundle. Never place secrets in
frontend environment variables.

### 6. Run FastAPI as a system service

On EC2:

```bash
sudo tee /etc/systemd/system/wattora.service >/dev/null <<'EOF'
[Unit]
Description=Wattora FastAPI
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/wattora/backend
EnvironmentFile=/home/ubuntu/wattora/backend/.env
ExecStart=/home/ubuntu/wattora/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now wattora
sudo systemctl status wattora
```

If it fails, check the service output:

```bash
sudo journalctl -u wattora -n 100 --no-pager
```

### 7. Configure Nginx

On EC2:

```bash
sudo tee /etc/nginx/sites-available/wattora >/dev/null <<'EOF'
server {
    listen 80;
    server_name _;

    root /home/ubuntu/wattora/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8000;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF

sudo ln -s /etc/nginx/sites-available/wattora /etc/nginx/sites-enabled/wattora
sudo nginx -t
sudo systemctl reload nginx
```

The SPA fallback serves React routes such as `/dashboard` on browser refresh.
`/api` stays behind Nginx; Uvicorn listens only on the local machine.

### 8. HTTPS, CORS, and public URL

For a stable HTTPS address, use a domain and configure TLS. If you do not have a
domain for a temporary demo, a Quick Tunnel can provide a temporary HTTPS URL;
follow [Cloudflare Quick Tunnel documentation](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/).
Run the tunnel on the EC2 host and point it to `http://localhost:80`.

After obtaining the public URL, set `FRONTEND_URL` to that URL and
`FRONTEND_ORIGINS` to its origin in the backend `.env`, then restart the
backend:

```bash
sudo systemctl restart wattora
```

The React router fallback and same-origin `/api` proxy mean the production
frontend does not need to hard-code a separate backend URL. If the frontend is
instead deployed on a different origin, rebuild with
`VITE_API_BASE_URL=https://YOUR_API_HOST` and allow that exact frontend origin
in `FRONTEND_ORIGINS`.

### 9. Smoke-test before recording

From a signed-out browser, open the HTTPS URL and check:

- `/health` responds with a healthy status.
- Signup sends a Gmail verification code; verify it and sign in.
- Create two sites and devices, and confirm only that account sees them.
- Check dashboard, solar, energy, and optimization on a selected site.
- Test password reset and its email link.
- Refresh nested routes such as `/dashboard` and `/optimization`.
- Check FastAPI logs and confirm the browser console has no CORS or mixed
  content errors.

For later frontend changes, run `npm run build` locally and upload the new
`dist` directory. For backend changes, update the server source and restart
`wattora`. Back up `backend/wattora.db`; those site/device records currently
live on the EC2 disk, not Neon.

## CORS and environment variables

The FastAPI app already has CORS middleware. It reads
`FRONTEND_ORIGINS` as a comma-separated allowlist and permits the API methods
and headers needed by the browser client. Local development defaults to the two
Vite localhost origins. In deployment, replace those with the exact public
frontend origin(s), never `*`. Same-origin Nginx proxying avoids CORS for the
normal production setup.

Backend configuration belongs in `backend/.env` locally and private server
configuration on EC2. The frontend's only deployment setting is
`VITE_API_BASE_URL`; it is public and must not contain credentials.

## Hackathon submission checklist

- [ ] Confirm eligibility, event timing, team registration, and project rules
  on the specific hackathon page.
- [ ] Make the source repository public only after reviewing tracked files and
  removing all secrets.
- [ ] Credit every dataset, model, library, and asset not written by your team,
  and verify that its license permits your use.
- [ ] Confirm the exact source and license for the training data and solar
  images. The current code repository does not record complete source/license
  information for these assets; add verified attributions before submitting.
- [ ] List AI coding tools used in the writeup (GitHub Copilot was used during
  development).
- [ ] Deploy the project and record the real AWS-hosted demo; the rules require
  the video to show AWS usage, not only mention it in text.
- [ ] Keep the YouTube video under three minutes and verify the public/unlisted
  link while signed out.
- [ ] Submit the public repository URL, demo video, and a short writeup before
  the event's deadline.

### Writeup outline

1. **Problem:** Household energy decisions are difficult without a clear view
   of solar generation and demand.
2. **Build:** Explain Wattora's dashboard, solar/demand estimates, private
   sites/devices, and optimization workflow.
3. **AWS:** Name the actual AWS service(s) used and show the running deployment
   in the demo video. State that PostgreSQL is hosted by Neon if it remains
   there.
4. **Credits and AI:** List datasets, models, third-party assets and their
   licenses, plus the AI coding tools used.

## API and health endpoints

When the backend is running:

- API root: `/`
- Health check: `/health`
- OpenAPI docs: `/docs`
