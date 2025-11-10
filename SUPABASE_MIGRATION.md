# Supabase Migration Guide

This project has been migrated from a Python FastAPI backend to **Supabase** as the backend infrastructure. All backend logic has been moved to the Next.js frontend using Supabase client libraries and Edge Functions.

## What Changed

### Before (Old Architecture)
- **Backend**: Python FastAPI server running on port 8000
- **Database**: PostgreSQL accessed through SQLAlchemy ORM
- **Authentication**: Custom JWT implementation with refresh tokens
- **API**: REST API endpoints in `/backend/app/routers/`

### After (New Architecture)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **Database**: Supabase PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (built-in JWT, session management)
- **API**: Direct Supabase client calls + Edge Functions for complex operations
- **Frontend**: All business logic in Next.js using Supabase services

## Prerequisites

1. **Supabase Account**: Sign up at [https://supabase.com](https://supabase.com)
2. **Node.js 18+**: For running the Next.js frontend
3. **Supabase CLI** (optional but recommended): Install with `npm install -g supabase`

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Click "New Project"
3. Fill in the project details:
   - **Name**: prompt-version-hub (or your preferred name)
   - **Database Password**: Create a strong password (save it securely!)
   - **Region**: Choose the closest region to your users
4. Wait for the project to be created (takes ~2 minutes)

### 2. Run the Database Migration

1. In your Supabase project dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the contents of `/supabase/migrations/00001_initial_schema.sql`
4. Paste into the SQL Editor
5. Click **Run** to execute the migration

This will create all tables, indexes, RLS policies, and triggers.

### 3. Configure Environment Variables

1. In your Supabase project dashboard, go to **Settings > API**
2. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (safe to use in browser)
   - **service_role** key (NEVER expose in client-side code!)

3. Update the `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Google AI Gemini (for AI features)
GOOGLE_GENAI_API_KEY=your_google_api_key_here
GOOGLE_GENAI_MODEL=gemini-2.0-flash-exp

# App Settings
ENV=development
NEXT_PUBLIC_APP_NAME=Prompt Version Hub
```

### 4. Deploy Edge Functions (Optional - for AI features)

If you want to use AI prompt generation and test generation features:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Link your project:
   ```bash
   supabase link --project-ref your-project-id
   ```

3. Set secrets for Edge Functions:
   ```bash
   supabase secrets set GOOGLE_GENAI_API_KEY=your_api_key
   supabase secrets set GOOGLE_GENAI_MODEL=gemini-2.0-flash-exp
   ```

4. Deploy the Edge Functions:
   ```bash
   supabase functions deploy generate-prompt
   supabase functions deploy generate-test-cases
   supabase functions deploy run-tests
   ```

### 5. Create Admin User

1. Go to **Authentication > Users** in your Supabase dashboard
2. Click **Add User** > **Create new user**
3. Enter email and password for your admin account
4. After creation, go to **SQL Editor** and run:

```sql
UPDATE users
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

### 6. Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:3000`

## Architecture Overview

### Services Layer

All backend logic is in `/frontend/src/lib/services/`:

- **auth.service.ts**: Authentication (register, login, logout)
- **prompts.service.ts**: Prompt management (CRUD, versioning, rollback)
- **deployments.service.ts**: Deployment tracking
- **ab.service.ts**: A/B testing policies and assignments
- **usage.service.ts**: Usage event tracking and analytics
- **kpis.service.ts**: Dashboard metrics and KPIs
- **tests.service.ts**: Test case management and execution
- **ai.service.ts**: AI prompt generation

### Supabase Client

- **client.ts**: Browser client for client components
- **server.ts**: Server client for server components and API routes
- **types.ts**: TypeScript types generated from database schema

### Edge Functions

Located in `/supabase/functions/`:

1. **generate-prompt**: AI-powered prompt template generation
2. **generate-test-cases**: AI-powered test case generation
3. **run-tests**: Execute test cases against prompts

### Row Level Security (RLS)

All tables have RLS enabled with policies that:
- Allow users to view their own data
- Allow users to view public content
- Restrict writes based on user roles (admin, editor, viewer)
- Prevent unauthorized access

## Migration Checklist

- [x] Created Supabase project
- [x] Ran database migration SQL
- [x] Configured environment variables
- [x] Deployed Edge Functions (if using AI features)
- [x] Created admin user
- [x] Tested authentication flow
- [x] Verified CRUD operations work
- [x] Removed old backend folder

## Key Differences from Old Backend

### Authentication

**Old Way (FastAPI)**:
```python
# Login
POST /auth/login
# Returns: { access_token: "...", refresh_token: "..." }
```

**New Way (Supabase)**:
```typescript
import { authService } from '@/lib/services';

// Login
const user = await authService.login({ email, password });
// Supabase handles tokens automatically via cookies
```

### Data Access

**Old Way (FastAPI)**:
```python
# Backend endpoint
@router.get("/prompts")
def list_prompts(db: Session = Depends(get_db)):
    return db.query(Prompt).all()
```

**New Way (Supabase)**:
```typescript
import { promptsService } from '@/lib/services';

// Direct database access with RLS
const { items, total } = await promptsService.listPrompts(userId, {
  limit: 20,
  visibility: 'all'
});
```

### Authorization

**Old**: Checked in Python route decorators
**New**: Enforced by Row Level Security policies in PostgreSQL

## Troubleshooting

### "Failed to fetch" errors
- Check that your Supabase project is running
- Verify environment variables are correct
- Check browser console for CORS errors

### Authentication issues
- Clear browser cookies and localStorage
- Verify the user exists in Supabase Auth
- Check that the user has a corresponding row in the `users` table

### Permission denied errors
- Check RLS policies in Supabase dashboard
- Verify the user's role is set correctly
- Use SQL Editor to debug: `SELECT * FROM users WHERE id = 'user-id'`

### Edge Function errors
- Check function logs in Supabase dashboard
- Verify secrets are set: `supabase secrets list`
- Test locally: `supabase functions serve`

## Performance Considerations

1. **Indexes**: All foreign keys and commonly queried columns are indexed
2. **RLS**: Policies are optimized to use indexes
3. **Edge Functions**: Run on Cloudflare's global network (low latency)
4. **Connection Pooling**: Supabase handles this automatically

## Security Best Practices

1. **Never** commit `.env.local` or expose `SUPABASE_SERVICE_ROLE_KEY`
2. Always use RLS policies instead of relying on client-side checks
3. Use the service role key only in Edge Functions, never in browser
4. Enable MFA for admin accounts
5. Regularly review audit logs in Supabase dashboard

## Cost Optimization

Supabase Free Tier includes:
- 500 MB database space
- 2 GB bandwidth
- 50,000 monthly active users
- 2 million Edge Function invocations

For production, consider:
- **Pro Plan** ($25/month): Better performance, daily backups
- **Team/Enterprise**: For larger teams and custom needs

## Next Steps

1. Test all features thoroughly
2. Set up monitoring and alerts in Supabase dashboard
3. Configure backups (automatic on Pro plan)
4. Set up CI/CD for Edge Function deployments
5. Add error tracking (Sentry, etc.)
6. Implement real-time features using Supabase Realtime

## Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Project Issues**: https://github.com/your-repo/issues

---

**Migration completed**: All backend functionality has been successfully migrated to Supabase!
