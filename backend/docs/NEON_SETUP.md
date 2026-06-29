# Neon PostgreSQL Setup Guide

This guide walks you through setting up a Neon PostgreSQL database for the Audit Management System.

## 🚀 Quick Start

### 1. Create a Neon Account

1. Go to [https://neon.tech](https://neon.tech)
2. Sign up with GitHub, Google, or email
3. Verify your email address

### 2. Create a New Project

1. Click **"Create Project"** in the Neon console
2. **Project name**: `audit-management` (or your preferred name)
3. **PostgreSQL version**: Select 16 (latest stable)
4. **Region**: Choose closest to your location:
   - US East (N. Virginia) - `us-east-2`
   - US West (Oregon) - `us-west-2`
   - Europe (Frankfurt) - `eu-central-1`
   - Asia Pacific (Singapore) - `ap-southeast-1`
5. Click **"Create Project"**

### 3. Get Your Connection String

After project creation, Neon will display your connection details:

```
Connection string:
postgresql://[username]:[password]@[hostname]/[database]?sslmode=require
```

Example:
```
postgresql://audit_user:ABC123xyz789@ep-cool-name-12345.us-east-2.aws.neon.tech/audit_management?sslmode=require
```

**Important**: Copy this connection string - you'll need it in the next step!

### 4. Configure Your Backend

1. Open `backend/.env` file
2. Replace the `DATABASE_URL` value with your Neon connection string:

```env
DATABASE_URL="postgresql://audit_user:ABC123xyz789@ep-cool-name-12345.us-east-2.aws.neon.tech/audit_management?sslmode=require"
```

3. Save the file

### 5. Initialize Database

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Create database tables
npm run prisma:migrate

# Seed with sample data
npm run prisma:seed
```

### 6. Verify Setup

```bash
# Open Prisma Studio to browse your data
npm run prisma:studio
```

This will open a browser window at `http://localhost:5555` where you can see:
- 2 Audits
- 4 Audit Phases
- 2 Clients with entities and contacts
- 1 Risk Assessment
- 5 Checklist Items
- 3 Documents with reviews
- 2 Findings with evidence and recommendations

## 🔧 Neon-Specific Features

### Connection Pooling

Neon automatically handles connection pooling. No additional configuration needed!

### Branching (Optional)

Neon supports database branching (like Git for your database):

```bash
# Create a development branch
neonctl branches create --name dev

# Get connection string for dev branch
neonctl connection-string dev
```

Update your `.env` to use the dev branch during development.

### Autoscaling

Neon automatically scales compute up/down based on usage. Free tier includes:
- 0.5 GB storage
- Unlimited queries
- Auto-suspend after 5 minutes of inactivity

## 🛠️ Useful Neon CLI Commands

Install Neon CLI (optional):
```bash
npm install -g neonctl
```

Common commands:
```bash
# List all projects
neonctl projects list

# List all branches
neonctl branches list

# View connection string
neonctl connection-string

# Create a new branch
neonctl branches create --name staging

# Delete a branch
neonctl branches delete staging
```

## 📊 Database Management

### View Database in Neon Console

1. Go to [https://console.neon.tech](https://console.neon.tech)
2. Select your project
3. Click **"SQL Editor"** to run queries directly

### View Database with Prisma Studio

```bash
npm run prisma:studio
```

Browser-based GUI at http://localhost:5555

### View Database Schema

```bash
npm run prisma:migrate status
```

## 🔄 Migration Workflow

### Create a New Migration

After editing `prisma/schema.prisma`:

```bash
npm run prisma:migrate dev --name add_new_field
```

### Reset Database (Development Only!)

```bash
npm run db:reset
```

This will:
1. Drop all tables
2. Re-run all migrations
3. Re-seed data

**⚠️ Warning**: This deletes all data! Only use in development.

### Apply Migrations (Production)

```bash
npx prisma migrate deploy
```

## 🔒 Security Best Practices

### 1. Never Commit `.env` File

The `.env` file is already in `.gitignore`. Never commit database credentials to Git!

### 2. Use Environment Variables in Production

In production (Vercel, Railway, Azure, etc.), set `DATABASE_URL` as an environment variable, not in a file.

### 3. Rotate Passwords Regularly

From Neon console:
1. Go to **Settings** → **Reset Password**
2. Copy new connection string
3. Update your `.env` file

### 4. Use IP Allowlist (Paid Plans)

For production, enable IP allowlisting in Neon console to restrict database access.

## 🐛 Troubleshooting

### Error: "Can't reach database server"

**Cause**: Invalid connection string or network issue

**Solution**:
1. Verify connection string is correct
2. Check internet connection
3. Ensure `?sslmode=require` is at the end of the connection string

### Error: "Prepared statement already exists"

**Cause**: Prisma Client needs regeneration

**Solution**:
```bash
npm run prisma:generate
```

### Error: "Authentication failed"

**Cause**: Incorrect username or password

**Solution**:
1. Go to Neon console
2. Reset password
3. Update `.env` with new connection string

### Slow Queries

**Cause**: Database is in suspended state (auto-suspend after inactivity)

**Solution**: First query after inactivity takes ~1-2 seconds to wake database. Subsequent queries are fast.

## 📚 Additional Resources

- [Neon Documentation](https://neon.tech/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Neon + Prisma Guide](https://neon.tech/docs/guides/prisma)
- [Neon Community Discord](https://discord.gg/neon)

## 💡 Tips

1. **Free Tier**: Perfect for development and POCs
2. **Branching**: Use branches for testing migrations safely
3. **Monitoring**: Check Neon console for query performance metrics
4. **Backups**: Neon automatically backs up your data (Point-in-Time Recovery available on paid plans)

---

Need help? Check the [Neon documentation](https://neon.tech/docs) or reach out to [Neon support](https://neon.tech/docs/introduction/support).
