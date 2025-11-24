# Database Setup (Vercel Postgres)

## 🎯 Overview

This guide will help you set up **Vercel Postgres** for CyberDamus fortune storage. Vercel Postgres is powered by Neon and integrated directly into Vercel - no separate account needed!

---

## 🚀 Quick Start (30 seconds)

```bash
# 1. Create database in Vercel Dashboard
# (see Step 1 below)

# 2. Pull environment variables locally
vercel link
vercel env pull .env.local

# 3. Push schema to database
npm run db:push

# 4. (Optional) View database
npm run db:studio
```

That's it! You're ready to develop locally and deploy! ✅

---

## 📋 Step-by-Step Guide

### Step 1: Create Vercel Postgres Database (2 clicks)

1. Go to your **Vercel project dashboard**
2. Click **Storage** tab in the top menu
3. Click **Create Database**
4. Select **Postgres**
5. Configure:
   - **Database Name**: `cyberdamus` (or leave default)
   - **Region**: Choose closest to your users (e.g., US East, EU West)
   - **Pricing**: Free tier is fine for development
6. Click **Create**

**What happens automatically:**
- ✅ Neon Postgres database created
- ✅ `DATABASE_URL` added to all environments (Production, Preview, Development)
- ✅ Connection pooling configured
- ✅ SSL enabled

**View your database:**
- Vercel Dashboard → Storage → Postgres → Your Database
- See connection string, usage stats, and queries

---

### Step 2: Pull Environment Variables Locally

**Install Vercel CLI** (if not already installed):
```bash
npm i -g vercel
```

**Link your project:**
```bash
vercel link
```

Follow prompts:
- Scope: Your Vercel account/team
- Link to existing project? **Yes**
- Project name: `cyberdamus-client` (or your project name)

**Pull environment variables:**
```bash
vercel env pull .env.local
```

This creates `.env.local` with `DATABASE_URL` from Vercel Postgres!

**Verify:**
```bash
cat .env.local
```

You should see:
```env
DATABASE_URL="postgresql://..."
```

---

### Step 3: Generate Prisma Client & Push Schema

**Generate Prisma Client:**
```bash
npx prisma generate
```

**Push schema to database:**
```bash
npm run db:push
```

This creates the `fortunes` table in your Vercel Postgres database.

**Success output:**
```
✔ Generated Prisma Client
Environment variables loaded from .env.local
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database

Your database is now in sync with your Prisma schema. Done in 1.2s
```

---

### Step 4: Verify Setup (Optional)

**Open Prisma Studio:**
```bash
npm run db:studio
```

Opens at http://localhost:5555 to view your database tables.

**Or check Vercel Dashboard:**
- Go to Storage → Postgres → Your Database
- Click **Query** tab to run SQL queries
- Click **Usage** to see storage and connection stats

---

## 🚀 Deploy to Vercel

**Good news:** DATABASE_URL is already configured! 🎉

**Just deploy:**
```bash
git add .
git commit -m "feat: add database integration for fortune storage"
git push
```

Vercel will automatically:
1. Install Prisma dependencies
2. Run `prisma generate` (via `postinstall` script)
3. Connect to Vercel Postgres database
4. Set up daily cron job (via `vercel.json`)

**No manual environment variable setup needed!**

---

## 🔐 Optional: Secure Cron Endpoint

To prevent unauthorized access to your cleanup endpoint:

**Generate a secret:**
```bash
openssl rand -base64 32
```

**Add to Vercel:**
1. Go to Project Settings → Environment Variables
2. Add variable:
   - **Name**: `CRON_SECRET`
   - **Value**: (paste generated secret)
   - **Environments**: Production
3. Click **Save**

**Redeploy** to activate the secret.

The cleanup endpoint (`/api/cron/cleanup`) will check this secret.

---

## 📊 Database Schema

Your Vercel Postgres database has the following structure:

```sql
CREATE TABLE fortunes (
  id SERIAL PRIMARY KEY,

  -- Blockchain data (NULL until mint succeeds)
  mint_address VARCHAR(44) UNIQUE,
  wallet_address VARCHAR(44) NOT NULL,
  fortune_number INTEGER,
  signature VARCHAR(88),

  -- User input
  user_query TEXT,

  -- Cards (stored as JSONB)
  cards JSONB,  -- [{id: 19, inverted: true}, ...]

  -- AI interpretation (Phase 2)
  interpretation TEXT,

  -- Status tracking
  status VARCHAR(30) NOT NULL,  -- pending_mint | pending_interpretation | completed | failed
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_wallet ON fortunes(wallet_address);
CREATE INDEX idx_mint ON fortunes(mint_address);
CREATE INDEX idx_status ON fortunes(status);
```

---

## 🔍 Testing API Routes Locally

Start your dev server:
```bash
npm run dev
```

### 1. Create Draft

```bash
curl -X POST http://localhost:3000/api/fortune/draft \
  -H "Content-Type: application/json" \
  -d '{
    "walletAddress": "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin",
    "userQuery": "Will I succeed in my crypto journey?"
  }'
```

**Response:**
```json
{
  "success": true,
  "draftId": 1
}
```

### 2. Update Draft (After Mint)

```bash
curl -X PATCH http://localhost:3000/api/fortune/update \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": 1,
    "mintAddress": "ABC123xyz...",
    "fortuneNumber": 1,
    "cards": [
      {"id": 19, "inverted": true},
      {"id": 20, "inverted": false},
      {"id": 7, "inverted": true}
    ],
    "signature": "5J8xyz...",
    "status": "pending_interpretation"
  }'
```

### 3. Get Fortune by Mint Address

```bash
curl http://localhost:3000/api/fortune/ABC123xyz...
```

### 4. Test Cleanup Cron (Manual)

```bash
curl http://localhost:3000/api/cron/cleanup
```

**Response:**
```json
{
  "success": true,
  "deleted": 3,
  "cutoffTime": "2025-01-29T12:00:00.000Z"
}
```

---

## 📈 Monitoring & Management

### Vercel Dashboard (Recommended)

**View Database:**
- Go to **Storage** → **Postgres** → Your Database

**Tabs available:**
- **Data**: Browse tables and records
- **Query**: Run SQL queries directly
- **Usage**: View storage, compute hours, connections
- **Settings**: Connection strings, region, backups

**View Logs:**
- Go to **Deployments** → Latest → **Functions**
- Filter by function name (e.g., `/api/fortune/draft`)
- Search for `[Fortune Draft]` or `[Fortune Update]` logs

### Prisma Studio (Local Development)

```bash
npm run db:studio
```

Opens GUI at http://localhost:5555:
- View all tables and records
- Edit data directly
- Filter and sort records
- Great for debugging!

### SQL Queries (Advanced)

In Vercel Dashboard → Storage → Postgres → **Query** tab:

```sql
-- View all fortunes
SELECT * FROM fortunes ORDER BY created_at DESC LIMIT 10;

-- Count by status
SELECT status, COUNT(*) FROM fortunes GROUP BY status;

-- Failed fortunes with errors
SELECT id, wallet_address, error_message, created_at
FROM fortunes
WHERE status = 'failed'
ORDER BY created_at DESC;

-- Pending interpretation (ready for AI)
SELECT id, mint_address, user_query, cards
FROM fortunes
WHERE status = 'pending_interpretation'
ORDER BY created_at ASC;
```

---

## 🛠️ Troubleshooting

### Error: "Can't reach database server"

**Solutions:**
1. Check if `DATABASE_URL` exists in `.env.local`:
   ```bash
   cat .env.local | grep DATABASE_URL
   ```

2. Pull latest env vars:
   ```bash
   vercel env pull .env.local
   ```

3. Verify database is active in Vercel Dashboard:
   - Storage → Postgres → Check status

### Error: "Prisma Client not generated"

**Solution:**
```bash
npx prisma generate
```

Or reinstall dependencies:
```bash
rm -rf node_modules
npm install
```

### Error: "Table 'fortunes' does not exist"

**Solution:**
```bash
npm run db:push
```

This pushes your Prisma schema to the database.

### Cron Job Not Running

**Possible causes:**
1. **Free plan limitation**: Vercel Cron requires **Pro plan** ($20/month)
   - Upgrade at: https://vercel.com/pricing

2. **vercel.json not in repo root**:
   ```bash
   ls vercel.json  # Should exist
   ```

3. **Check logs**:
   - Vercel Dashboard → Cron Jobs → View Executions
   - Look for errors or missing runs

### Slow Queries

**Check indexes:**
```sql
-- List all indexes
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE tablename = 'fortunes';
```

**Should see:**
- `idx_wallet` on `wallet_address`
- `idx_mint` on `mint_address`
- `idx_status` on `status`

If missing, run:
```bash
npm run db:push
```

---

## 💰 Pricing & Limits

### Vercel Postgres Free Tier

**Included with Hobby plan:**
- **Storage**: 256 MB
- **Compute**: 60 hours/month
- **Data Transfer**: 256 MB/month
- **Connections**: Up to 20 concurrent

**Perfect for:**
- Development
- Small MVPs
- Testing

**Upgrade when:**
- Storage > 256 MB
- Need more compute hours
- High traffic (many connections)

**Pro plan** ($20/month):
- 512 MB storage
- 100 compute hours
- Priority support
- **Cron jobs enabled** ✅

**View current usage:**
- Vercel Dashboard → Storage → Postgres → **Usage** tab

---

## 🎯 Next Steps

### Phase 2: AI Interpretation (Not Implemented)

When ready to add AI interpretation:

1. **Add OpenAI/Claude API key** to Vercel env vars:
   ```bash
   vercel env add OPENAI_API_KEY
   ```

2. **Create interpretation endpoint**:
   - `POST /api/fortune/interpret`
   - Takes `draftId`, calls AI with `cards` + `userQuery`
   - Updates record: `interpretation` field, status → `completed`

3. **Auto-trigger after mint**:
   - In `page.tsx` after step 5 (save to records)
   - Call `/api/fortune/interpret` asynchronously
   - Show loading state or toast when complete

4. **Cron job for retry**:
   - Add endpoint `/api/cron/process-pending`
   - Process fortunes where `status = 'pending_interpretation'`
   - Run every hour

### Future Enhancements

**Analytics:**
- Add `/api/fortune/stats` endpoint
- Show total fortunes, most common cards, etc.

**History Page:**
- Add `/api/fortune/history/[walletAddress]` endpoint
- Query user's fortunes from database + blockchain
- Show query + interpretation (if available)

**Admin Panel:**
- View all fortunes
- Manually trigger AI interpretation
- Delete spam/test records

---

## 📚 Resources

- **Vercel Postgres Docs**: https://vercel.com/docs/storage/vercel-postgres
- **Prisma Docs**: https://www.prisma.io/docs
- **Vercel Cron Jobs**: https://vercel.com/docs/cron-jobs
- **Neon (underlying tech)**: https://neon.tech/docs

---

## 🆘 Need Help?

1. **Check Vercel Dashboard logs** (most issues show up here)
2. **Run Prisma Studio** to inspect database state
3. **Review CLAUDE.md** for project context
4. **Check README.md** for overall architecture

---

**Happy fortune telling! 🔮✨**
