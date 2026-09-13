# 💸 splid-web

> Web interface for [Splid](https://splid.app) expense groups. See balances, track expenses, settle debts, all from your browser.

## 💡 What Is This?

A self-hosted web app that connects to your existing [Splid](https://splid.app) groups. Splid is a popular mobile app for splitting expenses with friends, family, or flatmates, but it only runs on iOS and Android. This project gives you a browser-based interface for the same data.

Just enter your group's invite code and you get:

- A full list of all expenses and payments
- Who owes whom and how much (debt simplification)
- The ability to add new expenses or delete existing ones
- Everything syncs back to the Splid app on all group members' phones

All data stays between you and the Splid servers. No account needed, no database, no cloud service.

## 🚀 Quick Start

### 1️⃣ Run

```bash
# Pull from GitHub Container Registry (recommended)
podman run -d -p 3000:3000 --name splid-web ghcr.io/toughiq/splid-web

# Or build locally
podman build -t splid-web .
podman run -d -p 3000:3000 --name splid-web splid-web

# Or with Docker Compose
docker compose up -d
```

### 2️⃣ Open in Browser

Go to `http://localhost:3000` and enter your Splid group invite code (the 8-character code from the app, e.g. `ABC D1E F2G`).

You can also pass the code directly in the URL for a bookmarkable link:

```
http://localhost:3000/?code=ABCD1EF2G
```

### 3️⃣ Done

If you see your group's expenses, you're set. Everything syncs bidirectionally with the Splid mobile app.

## 🛠️ Features

| Feature | Description |
|---------|-------------|
| Expense list | All group expenses with payer, date, amount, category, and participants |
| Balances | Per-member balance overview (who is owed, who owes) |
| Settlement | Optimized payment suggestions with one-click quick-settle button |
| Add expense | Create expenses with category selection and flexible cost splitting |
| Record payment | Settle debts between members (from the balance page) |
| Delete expense | Soft-delete (syncs to all devices via Splid backend) |
| Read-only default | Write operations disabled unless `ENABLE_WRITES=true` is set |
| URL-based access | Bookmarkable links with `?code=` parameter, no login screen |
| Dark mode | Follows system preference |
| PWA-ready | Installable as a home screen app on mobile |

## 🏗️ Architecture

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ Browser  │────▶│ Express.js   │────▶│ Splid Backend │
│ (Vanilla │◀────│ + splid-js   │◀────│ (herokuapp)  │
│  HTML/JS)│     │ CORS Proxy   │     │              │
└──────────┘     └──────────────┘     └──────────────┘
```

- **Backend:** Node.js + Express with [splid-js](https://github.com/LinusBolls/splid-js). Acts as a CORS proxy because the Splid backend does not accept browser requests directly.
- **Frontend:** Single `index.html` with vanilla HTML, CSS, and JavaScript. No framework, no build step.
- **No database.** All data lives on Splid's servers. The backend holds in-memory sessions (30 min TTL) for convenience, but stores nothing on disk.
- **No credentials in the repo.** Authentication happens at runtime via invite codes entered by the user.

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server listen port |
| `ENABLE_WRITES` | not set | The app starts in **read-only mode** by default. Creating and deleting expenses is blocked on both server and UI level. Set to `true` to allow write operations. |

No API keys, no `.env` file, no secrets. The Splid invite code is entered by the user in the browser at runtime.

```bash
# Safe read-only mode (default)
podman run -d -p 3000:3000 ghcr.io/toughiq/splid-web

# Allow creating and deleting expenses
podman run -d -p 3000:3000 -e ENABLE_WRITES=true ghcr.io/toughiq/splid-web
```

## 🔒 Security and Privacy

- **No data stored on your server.** The backend is a stateless proxy. All financial data lives on Splid's infrastructure.
- **No credentials in the code.** The invite code is entered at runtime and held in memory only.
- **No telemetry, no analytics.** This is a local tool.
- **Session auto-expiry.** Server-side sessions expire after 30 minutes of inactivity.
- **MIT licensed.** You can read every line of code.

> **About invite codes:** Anyone with a Splid invite code has full read/write access to that group. Treat your invite code like a password. Do not share it publicly.

## ❓ FAQ

**Q: Does this replace the Splid app?**
A: No. It connects to the same backend. Changes made in the web app appear in the mobile app and vice versa.

**Q: Do I need a Splid account?**
A: No. Splid does not use accounts. You just need a group invite code, the same code you use to add people to a group in the app.

**Q: Can multiple people use the web app?**
A: Yes. Each person enters their group's invite code. The backend handles multiple sessions independently.

**Q: What happens if Splid changes their API?**
A: This project depends on the unofficial [splid-js](https://github.com/LinusBolls/splid-js) SDK. If Splid changes their backend, splid-js needs to be updated first, then this project can pull the new version.

**Q: Can I run this on my home server?**
A: Absolutely. Build the container image once and run it. It needs outbound HTTPS access to `splid.herokuapp.com`, nothing else.

## 🙏 Acknowledgments

- **[splid-js](https://github.com/LinusBolls/splid-js)** by LinusBolls (MIT License). The reverse-engineered TypeScript client that makes this project possible. All Splid API communication, balance calculation, and debt simplification runs through this library.

## ⚖️ Disclaimer

This project is **not affiliated with, endorsed by, or connected to** Splid or TeamTurtle in any way. Splid is a product of TeamTurtle.

This tool accesses the Splid backend as an end user through the unofficial splid-js SDK. The API is undocumented and may change without notice. Use at your own risk and for personal use only.
