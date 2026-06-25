# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Football Glory Hall** is a full-stack web application for managing and simulating football tournaments. It features:
- React frontend with TypeScript and Tailwind CSS
- Node.js/Express backend with TypeORM and SQLite
- JWT authentication system
- AI-powered match simulation engine
- Historical records preservation (Glory Hall)

## Architecture & Key Technologies

### Frontend (client/)
- **React 18** + TypeScript + Vite
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Axios** for API calls
- **Context API** for state management (AuthContext, TournamentContext)

### Backend (server/)
- **Node.js** + Express + TypeScript
- **TypeORM** with SQLite (dev) / PostgreSQL (prod)
- **JWT** authentication with bcryptjs
- **RESTful API** architecture

### Database Models
- User (authentication)
- Team (tournament participants)
- Tournament (competition structure)
- Match (individual games)
- MatchStatistics (detailed game data)
- HistoricalRecord (completed tournaments)

## Development Commands

### Package Management
```bash
# Install all dependencies
npm install && cd client && npm install && cd ../server && npm install

# Or from root directory
npm install
npm run server:dev  # starts backend
npm run client:dev  # starts frontend
```

### Development Workflow
```bash
# Start everything (frontend + backend)
npm run dev

# Individual services
npm run server:dev    # Backend on :5000
npm run client:dev    # Frontend on :9300

# Build for production
npm run build         # Builds both client and server
```

### Database Operations
```bash
cd server
npm run db:init       # Initialize database schema
npm run db:seed       # Populate with test data
```

### Linting & Type Checking
```bash
cd client
npm run lint          # ESLint for frontend
npm run build         # TypeScript check + build

cd server
npm run build         # TypeScript compilation
```

## API Structure

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get current user

### Tournament Management
- `GET /api/tournaments` - List all tournaments
- `POST /api/tournaments` - Create new tournament
- `GET /api/tournaments/:id` - Get tournament details
- `PUT /api/tournaments/:id` - Update tournament
- `DELETE /api/tournaments/:id` - Delete tournament

### Match Operations
- `GET /api/matches` - List all matches
- `GET /api/matches/:id` - Get match details
- `POST /api/matches/:id/simulate` - Simulate match
- `GET /api/matches/:id/statistics` - Get match statistics

### Historical Records
- `GET /api/historical` - List all historical records
- `GET /api/historical/user` - Get user-specific records
- `POST /api/historical` - Create historical record

## Key Service Files

### Match Simulation Engine
- **Location**: `server/src/services/matchEngine.ts`
- **Purpose**: AI-powered football match simulation
- **Features**: Team strength calculation, event generation, commentary, statistics

### Database Configuration
- **Location**: `server/src/config/database.ts`
- **Purpose**: TypeORM configuration and initialization
- **Models**: User, Team, Tournament, Match, MatchStatistics, HistoricalRecord

### Frontend API Service
- **Location**: `client/src/services/api.ts`
- **Purpose**: Centralized API client with auth interceptors
- **Features**: Token management, error handling, type-safe requests

## Environment Setup

### Backend Environment Variables (server/.env)
```
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
DB_PATH=./data/database.sqlite
CLIENT_URL=http://localhost:9300
```

### Frontend Environment Variables (client/.env)
```
VITE_API_URL=http://localhost:5000/api
```

## Development Tips

### Database Schema Changes
1. Modify entity files in `server/src/models/`
2. Run `npm run db:init` to rebuild schema
3. Run `npm run db:seed` to repopulate test data

### Adding New API Endpoints
1. Create controller in `server/src/controllers/`
2. Add route in `server/src/routes/`
3. Import route in `server/src/index.ts`
4. Add frontend service in `client/src/services/api.ts`

### State Management Pattern
- Global state: Use Context API (AuthContext, TournamentContext)
- Local state: React useState/useReducer
- API calls: Use custom hooks or direct service calls

### Testing Match Simulation
- Use `POST /api/matches/:id/simulate` endpoint
- Check generated events, commentary, and statistics
- All simulations are deterministic based on team strengths

## Common Development Tasks

### Creating a New Tournament
1. User registers/logs in via frontend
2. POST to `/api/tournaments` with tournament details
3. System auto-generates teams based on tournament type
4. Creates initial matches based on tournament structure

### Starting a Match Simulation
1. GET tournament details to see available matches
2. POST to `/api/matches/:id/simulate` to run simulation
3. GET match details to see results with events and commentary
4. System auto-updates tournament progress

### Viewing Historical Records
1. Completed tournaments are automatically archived
2. GET `/api/historical` to view all historical tournaments
3. GET `/api/historical/user` for user-specific history
4. Records include full tournament data and final results
