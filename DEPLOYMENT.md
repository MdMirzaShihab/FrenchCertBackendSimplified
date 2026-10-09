# FrenchCert Deployment

| Part | Repo | Host | URL |
|---|---|---|---|
| Backend (this repo) | `FrenchCertBackendSimplified` (`main`) | cPanel (Node.js app) | https://api.frenchcert.org |
| Public site | `FrenchCertStaticFrontend` (`master`) | Cloudflare Pages | https://frenchcert.org |
| Admin panel | `FrenchcertFrontend` (`master`) | Cloudflare Pages | https://admin.frenchcert.org |

Database: MongoDB Atlas (cluster `9evw8pk`, database `FrenchCertv1`).

## Progress

- [x] Subdomain `api.frenchcert.org` created in cPanel (document root `/public_html/api.frenchcert.org`; app code does **not** go there)
- [x] First admin account created (`admin@frenchcert.org`; password kept outside git, rotate it after first login)
- [ ] Hosting provider enables **Setup Node.js App** + outbound port 27017 (see [Ask the host](#0-ask-the-host-if-nodejs-is-missing))
- [ ] Cloudflare DNS record for `api`
- [ ] Node.js app created and running
- [ ] Atlas Network Access allows the server IP
- [ ] SSL issued, Cloudflare proxy on
- [ ] Public site and admin panel on Cloudflare Pages

## What you need before starting

- **`MONGO_URI`**: copy it from the `.env` on the original machine, or Atlas → Database → **Connect** → Drivers (add `/FrenchCertv1` before the `?`). Never commit it.
- **`JWT_SECRET`**: a new random value: `openssl rand -hex 48`. Changing it later only logs everyone out.
- **The server IP**: cPanel right sidebar → General Information → **Shared IP Address**.

---

## Backend on cPanel

### 0. Ask the host (if Node.js is missing)

If **Software** has no **Setup Node.js App** (or **Application Manager**), send support:

> Hi, please enable **Setup Node.js App** (CloudLinux Node.js Selector) for my cPanel account. I need to run a Node.js 20 application on the subdomain api.frenchcert.org. It also needs outbound access to MongoDB Atlas on port 27017 (`*.mongodb.net`). Please confirm both. Thanks!

If Node.js is not available on the plan at all, upgrade the plan or host the backend on Render/Railway instead. The frontends don't change; only the `api` DNS record moves.

### 1. Cloudflare DNS

Cloudflare → frenchcert.org → **DNS → Add record**

- Type `A`, Name `api`, IPv4 = server IP
- Proxy status: **DNS only (grey cloud)** for now. AutoSSL can't issue a certificate through the proxy.

### 2. Get the code onto the server

**Option A: Git (preferred).** cPanel → Files → **Git Version Control → Create**

- Clone URL: `git@github.com:MdMirzaShihab/FrenchCertBackendSimplified.git`
- Repository Path: `frenchcert-api`
- The repo is private, so cPanel needs access first: cPanel → **SSH Access → Manage SSH Keys → Generate a New Key**, then add the **public** key to GitHub → repo → Settings → **Deploy keys** (read-only).

**Option B: Zip.** On GitHub: **Code → Download ZIP**. cPanel **File Manager** → create `frenchcert-api` → Upload → Extract. Make sure `package.json` and `src/` sit directly inside `frenchcert-api`, not in a subfolder.

### 3. Create the Node.js app

cPanel → Software → **Setup Node.js App → Create Application**

| Field | Value |
|---|---|
| Node.js version | **20.x** (minimum 18; `helmet` 8 needs it) |
| Application mode | Production |
| Application root | `frenchcert-api` |
| Application URL | `api.frenchcert.org` (path empty) |
| Application startup file | `src/server.js` |
| Passenger log file | `/home/<cpanel-user>/logs/frenchcert-api.log` |

**Environment variables.** These are the only ones the code reads:

| Name | Value |
|---|---|
| `MONGO_URI` | from [before starting](#what-you-need-before-starting) |
| `JWT_SECRET` | new random value |
| `NODE_ENV` | `production` |

Do **not** set `PORT`; cPanel assigns it.

Click **Create**. If cPanel created a placeholder `app.js` in `frenchcert-api`, delete it. Then click **Run NPM Install**, and **Restart** when it finishes.

### 4. MongoDB Atlas

Atlas → Security → **Network Access → Add IP Address** → the server IP.

### 5. SSL

1. cPanel → Security → **SSL/TLS Status** → tick `api.frenchcert.org` → **Run AutoSSL**.
2. Once the certificate is valid: Cloudflare DNS → switch `api` to **Proxied (orange cloud)**.
3. Cloudflare → SSL/TLS → Overview → **Full (strict)**.

### 6. Test

- `https://api.frenchcert.org/` should show `FrenchCert Backend Running`
- `https://api.frenchcert.org/api/fields` should return JSON
- Writes without a login must be refused:
  `curl -X POST https://api.frenchcert.org/api/fields` should return `401`
- Admin panel against the live API, from a local checkout of `FrenchcertFrontend`:
  ```
  npm ci
  VITE_API_URL=https://api.frenchcert.org npx vite --port 5174
  ```
  Then log in at http://localhost:5174.

### Troubleshooting

Check the Passenger log file first.

| Symptom | Fix |
|---|---|
| 503 / "Incomplete response received" | Read the log; usually a Mongo connection failure or a missing env var |
| `MongoDB connection error` / whitelist / timeout | Server IP not in Atlas. Some hosts use a different outbound IP; ask support |
| Mongo still times out after allowing the IP | Host blocks outbound 27017; ask support to open it for `*.mongodb.net` |
| `SyntaxError` / unsupported engine | Node version below 18; choose 20 in the app settings |
| Cloudflare error 526 | No valid certificate yet; switch back to grey cloud and rerun AutoSSL |

### Updating the backend later

- Git: cPanel → Git Version Control → **Manage → Pull or Deploy → Update from Remote**, then **Restart** the app.
- Zip: extract the new zip over the old files, then **Restart**.
- Run **NPM Install** again only if `package.json` changed.

---

## Frontends on Cloudflare Pages

Do this once the backend test above passes. If the public repo is already connected to Cloudflare Pages, it may have auto-deployed after the last push. Check **Deployments**, and roll back if needed until the API is live.

Cloudflare → **Workers & Pages → Create → Pages → Connect to Git**

| Setting | Public site | Admin panel |
|---|---|---|
| Repo / branch | `FrenchCertStaticFrontend` / `master` | `FrenchcertFrontend` / `master` |
| Build command | `npm run build` | `npm run build` |
| Output directory | `dist` | `dist` |
| Env var | `NODE_VERSION=20` | `NODE_VERSION=20` |
| Custom domain | `frenchcert.org` (+ `www.frenchcert.org`) | `admin.frenchcert.org` |

- `VITE_API_URL=https://api.frenchcert.org` is already committed in each repo's `.env.production`. Override it in Cloudflare env vars only if the API moves.
- `public/_redirects` is already in both repos, so deep links like `/certifications` work.
- `frenchcert.org` is currently served from somewhere. Attach the custom domain only after the Pages build works. Leave cPanel's `/public_html` alone until the new site is live.

## Admin accounts

From any machine with this repo, `npm ci`, and a `.env` containing `MONGO_URI`:

```
npm run create-admin -- admin@frenchcert.org 'new-strong-password'
```

This creates the admin, or resets the password if the account exists. All create/edit/delete API calls need an admin login; reads and `/api/auth/login` are public.

## Local development

Port 5000 is taken by macOS AirPlay Receiver, so the backend runs on 5001 locally (both frontends' `.env.development` expect that):

```
# backend
PORT=5001 npm run dev
# public site (FrenchCertStaticFrontend)
npx vite --port 5173
# admin panel (FrenchcertFrontend)
npx vite --port 5174
```

The local `.env` points at the **live** Atlas database, so admin edits made locally are real.
