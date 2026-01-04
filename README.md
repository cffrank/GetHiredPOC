# JobMatch AI - POC

A proof-of-concept job matching application with AI-powered recommendations, built with RW SDK (RedwoodSDK), React 19, and Cloudflare infrastructure.

## Features

- **Authentication**: Secure user signup/login with bcrypt password hashing and HttpOnly session cookies
- **User Profiles**: Manage personal information, bio, location, and skills for AI matching
- **Job Discovery**: Browse and search jobs with filtering by title, location, and remote status
- **AI-Powered Matching**: Get personalized job match scores based on your skills and experience
- **Saved Jobs**: Bookmark interesting positions for later review
- **Application Tracking**: Manage your job applications with status tracking (Applied, Screening, Interview, Offer, Rejected)
- **100% Local Development**: No external services required - everything runs locally with Miniflare

## Tech Stack

- **Framework**: RW SDK (RedwoodSDK) - Server-first React with RSC
- **Runtime**: Cloudflare Workers (local development with Miniflare)
- **Database**: D1 (SQLite) - Cloudflare's SQL database
- **Storage**: R2 (local filesystem) - Cloudflare's object storage
- **Cache/Sessions**: KV (local storage) - Cloudflare's key-value store
- **Auth**: bcryptjs for password hashing, KV-based sessions
- **Styling**: Tailwind CSS with shadcn/ui component patterns
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Project Structure

```
gethiredpoc/
├── src/
│   ├── app/
│   │   ├── api/          # API route handlers
│   │   │   ├── auth.ts   # Authentication endpoints
│   │   │   ├── jobs.ts   # Job listing endpoints
│   │   │   ├── applications.ts
│   │   │   └── profile.ts
│   │   ├── components/
│   │   │   ├── Navigation.tsx
│   │   │   └── ui/       # Reusable UI components (Button, Card, etc.)
│   │   ├── lib/          # Utility libraries
│   │   │   ├── auth.ts   # Auth utilities
│   │   │   ├── db.ts     # Database queries
│   │   │   ├── env.ts    # Environment access
│   │   │   ├── storage.ts # File upload utilities
│   │   │   ├── ai-mock.ts # Mock AI analysis
│   │   │   └── utils.ts  # General utilities
│   │   ├── pages/        # Page components
│   │   │   ├── Home.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Signup.tsx
│   │   │   ├── Jobs.tsx
│   │   │   ├── JobDetail.tsx
│   │   │   ├── Profile.tsx
│   │   │   └── Applications.tsx
│   │   ├── styles/
│   │   │   └── globals.css # Global styles and Tailwind
│   │   └── Document.tsx
│   └── worker.tsx        # Main entry point & routes
├── migrations/           # Database migrations
│   ├── 0001_initial_schema.sql
│   └── 0002_seed_jobs.sql
├── types/                # TypeScript type definitions
├── wrangler.jsonc        # Cloudflare configuration
├── tailwind.config.js
└── package.json
```

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- No Docker, no external services needed!

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Create and seed the database**:
   ```bash
   # Create the database
   npx wrangler d1 create gethiredpoc

   # Run migrations
   npm run migrations:apply

   # Verify data
   npx wrangler d1 execute gethiredpoc --local --command="SELECT * FROM jobs LIMIT 5"
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Build for production
- `npm run types` - Run TypeScript type checking
- `npm run generate` - Regenerate TypeScript types from database
- `npm run migrations:apply` - Apply database migrations

## Database Schema

The application uses the following tables:

- **users**: User accounts with profile information
- **sessions**: Authentication sessions
- **jobs**: Job listings with details and requirements
- **saved_jobs**: User's bookmarked jobs
- **applications**: Job applications with status tracking

## User Flow

1. **Sign Up**: Create an account at `/signup`
2. **Complete Profile**: Add skills and experience at `/profile` for better AI matching
3. **Browse Jobs**: View available positions at `/jobs`
4. **View Details**: Click any job to see full details and requirements
5. **Get AI Analysis**: Click "Get AI Match Analysis" to see how well you match
6. **Save Jobs**: Bookmark interesting positions for later
7. **Track Applications**: Manage your applications at `/applications`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Create new account
- `POST /api/auth/login` - Sign in
- `POST /api/auth/logout` - Sign out
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - List jobs (with optional filters)
- `GET /api/jobs/:id` - Get job details
- `POST /api/jobs/:id/save` - Save job
- `DELETE /api/jobs/:id/unsave` - Unsave job
- `GET /api/jobs/saved` - Get saved jobs
- `POST /api/jobs/:id/analyze` - Get AI match analysis

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

## Mock AI Analysis

The AI matching feature uses a mock implementation that:
- Calculates match scores based on skill overlap
- Identifies matching and missing skills
- Provides personalized recommendations
- Caches results in KV for 7 days

In a production app, this would connect to actual AI services like OpenAI or Anthropic Claude.

## Security Features

- Password hashing with bcryptjs (10 rounds)
- HttpOnly session cookies with SameSite protection
- 7-day session expiration
- No passwords stored in plain text
- SQL injection protection via prepared statements

## Development Notes

- **100% Local**: Everything runs locally via Miniflare - no cloud accounts needed
- **Hot Reloading**: Code changes update instantly
- **Type Safe**: Full TypeScript coverage
- **Component Library**: shadcn/ui-inspired components with Tailwind
- **RW SDK**: Leverages React Server Components for optimal performance

## Seeded Data

The database comes pre-populated with 15 sample jobs across various tech roles including:
- Senior Full Stack Engineer
- DevOps Engineer
- Frontend React Developer
- Backend Python Developer
- Product Manager
- And more...

## License

This is a proof-of-concept demonstration project.
