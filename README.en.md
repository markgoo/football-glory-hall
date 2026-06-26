# Football Glory Hall

English | [Chinese README](./README.md)

Football Glory Hall is a football cup simulation and glory-record system. It supports club tournaments, national-team tournaments, real tournament templates, automatic match simulation, dice-based manual matches, knockout brackets, AI match commentary, and historical records.

## Online Demo

Demo URL:

```text
http://146.56.145.201:9300/
```

Demo account:

```text
Username: demo
Password: 123456
```

## Features

- User registration and login with username or email.
- Admin user management: enable/disable users, reset passwords, soft delete users, and manage roles.
- Tournament management for knockout, league, and group-stage plus knockout formats.
- Create club cups or national-team cups.
- Club tournaments include offline candidate clubs, countries, flags, and club crests.
- National-team tournaments use an offline static country list and do not require live country fetching.
- Built-in 2026 FIFA World Cup template:
  - One-click creation of a 48-team tournament skeleton.
  - Real group layout, schedule, venues, and knockout slot structure.
  - Round-of-32 to final bracket placeholders.
  - Group-stage completion resolves knockout teams automatically.
  - Knockout completion resolves winner/loser slots automatically.
  - Lucky draw can replace a selected national team with China while preserving schedule positions.
- Match schedule supports round/stage/group views.
- Matches can be simulated automatically, resolved manually with dice, or played through AI Duel.
- Knockout draws automatically enter penalty shootout logic.
- Group standings, tournament bracket, and team list are collapsible by default.
- Flags and club crests are proxied/cached by the backend for more stable access.
- Docker Compose deployment with default frontend port `9300`.

## Screenshots

Images in `./docs/images` are displayed by GitHub when the paths exist in the repository.

<img src="./docs/images/A1.png" alt="Tournament management" width="800" />
<img src="./docs/images/A2.png" alt="Create 2026 World Cup" width="800" />
<img src="./docs/images/A3.png" alt="Tournament detail" width="800" />
<img src="./docs/images/A4.png" alt="Dice match" width="800" />

## Tech Stack

Frontend:

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- Axios

Backend:

- Node.js
- Express
- TypeScript
- TypeORM
- SQLite
- JWT
- bcryptjs

## Local Development

Install dependencies:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

Create `.env` in the repository root:

```env
JWT_SECRET=change-this-secret
FOOTBALL_API_KEY=
FOOTBALL_API_URL=https://v3.football.api-sports.io
```

Start development servers:

```bash
npm run dev
```

Default URLs:

- Frontend: `http://localhost:9300`
- Backend: `http://localhost:5005`

You can also start them separately:

```bash
npm run client:dev
npm run server:dev
```

## Football API Key

`FOOTBALL_API_KEY` is optional. Without it, the system still works with built-in club, country, and national-team data, but some real club crests or real player data may be unavailable.

The API settings are:

- `FOOTBALL_API_KEY`: API-Football access key, used to fetch real football teams, countries, club crests, and player data.
- `FOOTBALL_API_URL`: API-Football base URL. Default: `https://v3.football.api-sports.io`.

How to get a key:

1. Open the API-Football website: https://www.api-football.com/
2. Register and sign in.
3. Open the Dashboard / API Keys page.
4. Copy your API key.
5. Add it to `.env`:

```env
FOOTBALL_API_KEY=your_api_key
FOOTBALL_API_URL=https://v3.football.api-sports.io
```

6. Restart the backend or rebuild Docker:

```bash
docker compose up -d --build
```

Do not commit real API keys to GitHub. Keep `.env` ignored.

## Docker Deployment

Recommended server command:

```bash
docker compose up -d --build
```

Visit:

```text
http://SERVER_IP:9300
```

Check running status:

```bash
docker compose ps
docker compose logs -f
```

Health check:

```bash
curl http://localhost:9300/api/health
```

## Default Admin

The system creates a default admin user on startup. If `admin` already exists, the existing password is not overwritten.

Default login:

```text
Username: admin
Password: 123456
```

Manually create or reset the admin password in Docker:

```bash
docker compose exec server node -e 'const bcrypt=require("bcryptjs");const sqlite3=require("sqlite3").verbose();const db=new sqlite3.Database("/app/server/data/database.sqlite");const now=new Date().toISOString();const hash=bcrypt.hashSync("123456",10);const id="admin-"+Date.now();db.run("INSERT INTO users(id,username,email,password,isActive,isDeleted,role,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(username) DO UPDATE SET email=excluded.email,password=excluded.password,isActive=1,isDeleted=0,role='\''admin'\'',updatedAt=excluded.updatedAt",[id,"admin","admin@example.com",hash,1,0,"admin",now,now],function(e){if(e){console.error(e);process.exit(1)}console.log("admin ready: admin / 123456");db.close();});'
```

## Reset User Password

Change `TARGET_USER` and `NEW_PASSWORD` as needed:

```bash
docker compose exec -e TARGET_USER=admin -e NEW_PASSWORD=NewPassword123 server node -e 'const bcrypt=require("bcryptjs");const sqlite3=require("sqlite3").verbose();const username=process.env.TARGET_USER;const password=process.env.NEW_PASSWORD;if(!username||!password){console.error("TARGET_USER and NEW_PASSWORD are required");process.exit(1)}const db=new sqlite3.Database("/app/server/data/database.sqlite");const hash=bcrypt.hashSync(password,10);db.run("UPDATE users SET password=?,updatedAt=? WHERE username=? AND isDeleted=0",[hash,new Date().toISOString(),username],function(e){if(e){console.error(e);process.exit(1)}if(this.changes===0){console.error("user not found:",username);process.exit(1)}console.log("password updated:",username);db.close();});'
```

## Useful Commands

Build:

```bash
npm run client:build
npm run server:build
```

Git status:

```bash
git status --short
```

Push to GitHub if the current branch is `master`:

```bash
git push -u origin master
```

If you want to rename the branch to `main`:

```bash
git branch -M main
git push -u origin main
```

## Ports

- Frontend dev port: `9300`
- Docker frontend port: `9300`
- Backend port: `5005`

## Data Notes

- SQLite data is stored at `server/data/database.sqlite` by default.
- `.env`, database files, `node_modules`, and build outputs should not be committed.
- The national-team country list is offline static data, based on UN member states and observer states.
- Real tournament templates are offline static templates. They are not fetched live at runtime.

## Main Pages

- Home: redirects based on login status.
- Tournament management: create tournaments, create the 2026 World Cup template, lucky draw, delete/start/view tournaments.
- Tournament detail: teams, group standings, bracket, schedule, and results.
- Match detail: match status, score, events, statistics, and lineups.
- Admin user management: admins can manage system users.
- LLM management: configure AI provider, global AI settings, prompts, thinking mode, and commentary behavior.

## Notes

The 2026 World Cup template provides the tournament structure, groups, schedule, venues, and knockout skeleton. Match results are still generated by this system through simulation, dice, manual play, AI Duel, or synced real data when configured.
