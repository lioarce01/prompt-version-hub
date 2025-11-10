# Prompt Version Hub

**The platform to version, test, and deploy prompts with confidence**

> 🚀 **Now powered by Supabase** - Scalable, serverless backend with built-in auth and real-time capabilities

## What it does

- **Versioning**: Centralizes your prompts with automatic versioning, Git-style diffs, and one-click rollback
- **AI Generator**: Includes an AI Prompt Generator to bootstrap structured templates fast using Google Gemini
- **Deployments**: Deploy across environments (dev/staging/prod) with a clear release history
- **Access Control**: Scopes prompts and deployments per user with public/private visibility controls and cloning
- **A/B Testing**: Run deterministic A/B testing by segments and track performance per version
- **Analytics**: Trace usage and outcomes (success, latency, cost) to optimize quality and spending
- **Security**: Role-based permissions (admin/editor/viewer) with Supabase Auth
- **Testing**: Generate and run AI-powered test cases for your prompts

## Architecture

### Tech Stack

- **Frontend**: Next.js 15 + React 19 + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Database**: Supabase PostgreSQL with Row Level Security
- **Authentication**: Supabase Auth (JWT-based)
- **AI**: Google Gemini 2.0 Flash for prompt generation
- **State Management**: Redux Toolkit with RTK Query
- **UI Components**: Radix UI + shadcn/ui

### Why Supabase?

- ✅ **Fully managed**: No server infrastructure to maintain
- ✅ **Built-in auth**: Secure authentication out of the box
- ✅ **Row Level Security**: Database-level authorization
- ✅ **Edge Functions**: Serverless functions at the edge
- ✅ **Real-time**: Built-in real-time subscriptions (future feature)
- ✅ **Scalable**: Auto-scales from 0 to millions of users
- ✅ **Developer-friendly**: Excellent DX with TypeScript support

## Quick Start

### Prerequisites

- Node.js 18 or higher
- A Supabase account (free tier works great!)
- Google AI API key (optional, for AI features)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/prompt-version-hub.git
cd prompt-version-hub
```

### 2. Set Up Supabase

1. Create a project at [https://supabase.com](https://supabase.com)
2. Go to **SQL Editor** in your Supabase dashboard
3. Copy and run the migration from `supabase/migrations/00001_initial_schema.sql`
4. Go to **Settings > API** and copy your project URL and keys

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google AI (optional - for AI features)
GOOGLE_GENAI_API_KEY=your_google_api_key_here
GOOGLE_GENAI_MODEL=gemini-2.0-flash-exp

# App Settings
NEXT_PUBLIC_APP_NAME=Prompt Version Hub
ENV=development
```

### 4. Install Dependencies & Run

```bash
cd frontend
npm install
npm run dev
```

The app will be available at **http://localhost:3000**

### 5. Create Admin User

1. Sign up through the app UI at http://localhost:3000
2. In your Supabase dashboard, go to **SQL Editor**
3. Run this query to promote your user to admin:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### 6. Deploy Edge Functions (Optional)

For AI prompt generation and test case generation:

```bash
# Install Supabase CLI
npm install -g supabase

# Link your project
supabase link --project-ref your-project-id

# Set secrets
supabase secrets set GOOGLE_GENAI_API_KEY=your_key
supabase secrets set GOOGLE_GENAI_MODEL=gemini-2.0-flash-exp

# Deploy functions
supabase functions deploy
```

## Project Structure

```
prompt-version-hub/
├── frontend/                 # Next.js application
│   ├── src/
│   │   ├── app/             # Next.js app router pages
│   │   ├── components/      # React components
│   │   ├── lib/
│   │   │   ├── services/    # Supabase services layer
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── prompts.service.ts
│   │   │   │   ├── deployments.service.ts
│   │   │   │   ├── ab.service.ts
│   │   │   │   ├── usage.service.ts
│   │   │   │   ├── kpis.service.ts
│   │   │   │   ├── tests.service.ts
│   │   │   │   └── ai.service.ts
│   │   │   └── supabase/    # Supabase client setup
│   │   │       ├── client.ts
│   │   │       ├── server.ts
│   │   │       └── types.ts
│   │   ├── hooks/           # Custom React hooks
│   │   └── types/           # TypeScript types
│   └── package.json
├── supabase/                # Supabase configuration
│   ├── migrations/          # Database schema
│   │   └── 00001_initial_schema.sql
│   └── functions/           # Edge Functions
│       ├── generate-prompt/
│       ├── generate-test-cases/
│       └── run-tests/
├── .env.local               # Environment variables
├── docker-compose.yml       # Optional Docker setup
├── SUPABASE_MIGRATION.md    # Detailed migration guide
└── README.md                # This file
```

## Features

### 1. Prompt Management

- Create and version prompts with automatic version tracking
- View diffs between versions
- Rollback to previous versions
- Clone prompts (public or private)
- Search and filter prompts

### 2. AI Prompt Generator

- Generate prompts using Google Gemini AI
- Customize by industry, tone, output format
- Automatic variable extraction
- Get improvement suggestions

### 3. Deployments

- Deploy prompts to different environments
- Track deployment history
- View current deployments per environment

### 4. A/B Testing

- Create A/B testing policies with weighted variants
- Automatically assign users to variants
- Track assignment statistics
- View experiment results

### 5. Analytics & KPIs

- Dashboard with key metrics
- Usage trends over time
- Version release velocity
- Top prompts by usage
- Success rates and performance metrics

### 6. Test Cases

- Create manual test cases
- Generate AI-powered test cases
- Run tests against prompts
- View test results and history

### 7. Access Control

- Three roles: Admin, Editor, Viewer
- Admin: Full access, can delete prompts
- Editor: Can create/edit prompts and deployments
- Viewer: Read-only access
- Row-level security enforced at database level

## API Documentation

The application uses Supabase services instead of REST APIs. See the services in `frontend/src/lib/services/` for available methods.

Example usage:

```typescript
import { promptsService } from '@/lib/services';

// List prompts
const { items, total } = await promptsService.listPrompts(userId, {
  limit: 20,
  visibility: 'all',
  latest_only: true,
});

// Create a prompt
const prompt = await promptsService.createPrompt(userId, {
  name: 'customer-greeting',
  template: 'Hello {{name}}, welcome to {{company}}!',
  variables: ['name', 'company'],
  is_public: false,
});

// Get AI-generated prompt
const result = await aiService.generatePrompt({
  goal: 'Generate product descriptions for e-commerce',
  tone: 'professional',
  output_format: 'text',
});
```

## Security

- **Row Level Security**: All database access is controlled by RLS policies
- **Authentication**: Managed by Supabase Auth with secure JWT tokens
- **Authorization**: Role-based permissions enforced at database level
- **Environment Variables**: Never commit sensitive keys to Git
- **Service Role Key**: Only used in Edge Functions, never exposed to client

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to GitHub
2. Import project to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy!

### Deploy Edge Functions

```bash
supabase functions deploy
```

## Migration from Old Backend

This project was migrated from a Python FastAPI backend to Supabase. See **[SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md)** for:

- Detailed migration guide
- Architecture comparison
- Breaking changes
- Troubleshooting tips

## Development

### Run Frontend

```bash
cd frontend
npm run dev
```

### Run Tests

```bash
cd frontend
npm test
```

### Lint Code

```bash
cd frontend
npm run lint
```

### Format Code

```bash
cd frontend
npm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Troubleshooting

### "Failed to fetch" errors

- Verify your Supabase URL and keys in `.env.local`
- Check that your Supabase project is running
- Clear browser cache and cookies

### Authentication issues

- Ensure RLS policies are enabled
- Verify user exists in both `auth.users` and `public.users` tables
- Check browser console for detailed errors

### Edge Function errors

- View logs in Supabase dashboard > Edge Functions
- Verify secrets are set: `supabase secrets list`
- Test locally: `supabase functions serve`

See **[SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md)** for more troubleshooting tips.

## License

MIT License - see LICENSE file for details

## Support

- **Documentation**: See [SUPABASE_MIGRATION.md](./SUPABASE_MIGRATION.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/prompt-version-hub/issues)
- **Supabase Docs**: [https://supabase.com/docs](https://supabase.com/docs)
- **Supabase Discord**: [https://discord.supabase.com](https://discord.supabase.com)

---

**Built with ❤️ using Next.js and Supabase**
