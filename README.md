# Splid Web

A web interface for [Splid](https://splid.app) groups, built on the unofficial [splid-js](https://github.com/LinusBolls/splid-js) SDK.

## Features

- View group expenses and transaction history
- See balances and suggested settlement payments
- Create new expenses with flexible cost splitting
- Delete expenses (soft-delete, syncs to all devices)
- Dark/light mode, PWA-ready

## Quick Start

```bash
# Build and run with Docker/Podman
podman build -t splid-web .
podman run -d -p 3000:3000 splid-web

# Or use docker-compose
docker compose up -d
```

Open `http://localhost:3000` and enter your Splid group invite code.

## Architecture

- **Backend:** Node.js + Express, proxies requests to the Splid API via splid-js (required for CORS)
- **Frontend:** Vanilla HTML/CSS/JS, single-page application
- **No database:** all data lives on Splid's servers, the backend is stateless (in-memory sessions with 30min TTL)

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT`   | `3000`  | Server port |

No API keys or credentials needed. Authentication is handled per-group via Splid invite codes at runtime.

## Disclaimer

This project uses an unofficial, reverse-engineered API. It is not affiliated with or endorsed by Splid. The API may change without notice.
