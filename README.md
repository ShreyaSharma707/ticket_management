# Helpdesk API

[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-jest-brightgreen)](tests/)

Production-ready **Helpdesk / Ticket Management API** — a simplified Jira/Zendesk-style backend demonstrating authentication, RBAC, business logic, testing, Docker, and CI/CD deployment.

## Live endpoints (local)

| URL | Purpose |
|-----|---------|
| `http://localhost:3000/` | API discovery |
| `http://localhost:3000/health` | Health check |
| `http://localhost:3000/api` | Route catalog |
| `http://localhost:3000/api/docs` | Swagger UI |

## Features

- JWT authentication (register / login)
- Ticket CRUD with priority and status workflow
- Assign tickets to agents
- Comments on tickets
- Role-based access (`user`, `agent`, `admin`)
- Search and filter tickets
- Rate limiting and security headers
- OpenAPI / Swagger documentation
- Seed script with demo data
- Docker + GitHub Actions CI/CD → Docker Hub → AWS EC2

## Quick start

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env

# 3. Seed demo data (optional)
npm run seed

# 4. Start dev server (hot reload)
npm run dev

# 5. Run tests
npm test
```

### Demo accounts (after `npm run seed`)

| Role  | Email               | Password      |
|-------|---------------------|---------------|
| Admin | admin@helpdesk.dev  | password123   |
| Agent | agent@helpdesk.dev  | password123   |
| User  | user@helpdesk.dev   | password123   |

## API endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/register` | — | Register user |
| POST | `/api/login` | — | Login, get JWT |
| GET | `/api/me` | ✓ | Current user profile |
| GET | `/api/tickets` | ✓ | List tickets |
| POST | `/api/tickets` | ✓ | Create ticket |
| GET | `/api/tickets/:id` | ✓ | Get ticket + comments |
| PUT | `/api/tickets/:id` | ✓ | Update ticket |
| DELETE | `/api/tickets/:id` | ✓ | Delete ticket |
| PUT | `/api/tickets/:id/status` | ✓ | Change status |
| PUT | `/api/tickets/:id/assign` | agent/admin | Assign ticket |
| POST | `/api/tickets/:id/comments` | ✓ | Add comment |

### Example: create a ticket

```bash
# Login
curl -s -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@helpdesk.dev","password":"password123"}'

# Create ticket (replace TOKEN)
curl -X POST http://localhost:3000/api/tickets \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Unable to login","description":"HTTP 500 on login","priority":"HIGH"}'
```

## Ticket workflow

```
User creates ticket → OPEN
        ↓
Agent assigned      → IN_PROGRESS
        ↓
Agent resolves      → RESOLVED
        ↓
Closed              → CLOSED
```

## Roles & permissions

| Action | user | agent | admin |
|--------|:----:|:-----:|:-----:|
| Create ticket | ✓ | ✓ | ✓ |
| View own tickets | ✓ | ✓ | ✓ |
| View all tickets | — | ✓ | ✓ |
| Assign tickets | — | ✓ | ✓ |
| Change status | own | ✓ | ✓ |
| Delete ticket | own | — | ✓ |

## Project structure

```
helpdesk-api/
├── .github/
│   ├── workflows/ci-cd.yml    # Test → Docker → EC2
│   └── pull_request_template.md
├── postman/                   # Postman collection
├── scripts/
│   └── seed.js                # Demo data seeder
├── src/
│   ├── config/                # Environment config
│   ├── controllers/           # Route handlers
│   ├── db/                    # SQLite (sql.js)
│   ├── docs/openapi.js        # Swagger spec
│   ├── middleware/            # Auth, security, logging
│   ├── models/                # Data access
│   ├── routes/                # API routes
│   ├── validators/            # Input validation
│   ├── app.js
│   └── server.js
├── tests/
│   ├── api.test.js
│   └── helpers.js
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start production server |
| `npm run dev` | Dev server with hot reload |
| `npm run seed` | Populate demo users & tickets |
| `npm test` | Run test suite |
| `npm run test:coverage` | Tests with coverage report |
| `npm run docker:run` | Build & run via Docker Compose |

## Docker

```bash
# Local container
docker compose up --build

# Manual build
docker build -t helpdesk-api .
docker run -p 3000:3000 \
  -e JWT_SECRET=your-production-secret \
  -v helpdesk-data:/app/data \
  helpdesk-api
```

## CI/CD pipeline

```
GitHub Push → GitHub Actions → npm test → Docker Build → Docker Hub → AWS EC2
```

### GitHub secrets (for full pipeline)

| Secret | Description |
|--------|-------------|
| `DOCKERHUB_USERNAME` | Docker Hub username |
| `DOCKERHUB_TOKEN` | Docker Hub access token |
| `EC2_HOST` | EC2 public IP |
| `EC2_USER` | SSH user (e.g. `ubuntu`) |
| `EC2_SSH_KEY` | Private SSH key |
| `JWT_SECRET` | Production JWT secret |

Set repository variable `EC2_DEPLOY_ENABLED=true` to activate EC2 deployment.

## Testing

```bash
npm test
```

Coverage includes:

- User can create ticket
- Unauthorized user cannot delete ticket
- Admin can assign ticket
- Ticket status changes correctly
- Invalid ticket ID returns 404

## Tech stack

- **Runtime:** Node.js 20+
- **Framework:** Express 4
- **Database:** SQLite (sql.js)
- **Auth:** JWT + bcrypt
- **Security:** Helmet, rate limiting
- **Docs:** Swagger UI + OpenAPI 3
- **Testing:** Jest + Supertest
- **CI/CD:** GitHub Actions, Docker, AWS EC2

## Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Helpdesk Ticket Management API"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/helpdesk-api.git
git push -u origin main
```

## License

[MIT](LICENSE)
