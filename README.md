# Tiny Tonkean

## Run

Requirements: Docker with Docker Compose.

```bash
docker compose up --build
```

Stop with `docker compose down`.

After changing `docker-compose.yml`, run `docker compose up -d`. It recreates only the services whose configuration changed. `docker compose restart` does not pick up changes to the file.

## Log in

Open the frontend and log in with **`interviewee@tonkean.com`** / **`Tonkean2026!`**.

## Access

| Service                    | URL                   |
| -------------------------- | --------------------- |
| Frontend                   | http://localhost:5173 |
| Backend API                | http://localhost:4000 |
| Tickets (ticketing system) | http://localhost:4200 |
| Chatter (Slack-like app)   | http://localhost:4100 |

## Tickets error logs

The Tickets service keeps its most recent error logs in memory (webhook delivery failures included). They reset when that container restarts. Fetch them with the Tickets API token (`tickets-dev-token` unless `TICKETS_API_TOKEN` is set):

```bash
curl -s -H "Authorization: Bearer tickets-dev-token" http://localhost:4200/api/logs/errors
```
