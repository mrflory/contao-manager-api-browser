# Phase 1 Database Setup Guide

This guide walks you through setting up PostgreSQL with Neon.tech for Phase 1 of the SaaS transformation.

## Prerequisites

1. **Neon.tech Account**: Sign up at [neon.tech](https://neon.tech)
2. **Node.js Environment**: Ensure you have Node.js 18+ installed

## Step 1: Create Neon.tech Database

1. **Sign up/Login** to Neon.tech
2. **Create a new project**:
   - Project name: `contao-manager` (or your preferred name)
   - Region: Choose the region closest to your users
   - PostgreSQL version: 15 (recommended)
3. **Get your connection string**:
   - Go to your project dashboard
   - Navigate to "Connection Details"
   - Copy the connection string (it looks like):
     ```
     postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/database?sslmode=require
     ```

## Step 2: Environment Configuration

1. **Update your `.env` file** with your Neon.tech connection string:
   ```env
   # Database Configuration (Phase 1 - Neon.tech PostgreSQL)
   STORAGE_TYPE=database
   DATABASE_URL="postgresql://username:password@ep-xxx-xxx.us-east-1.aws.neon.tech/database?sslmode=require"

   # Keep existing configuration
   TOKEN_MASTER_KEY=your_existing_token_master_key
   PORT=3000
   NODE_ENV=development
   ```

2. **Important**: Replace the placeholder DATABASE_URL with your actual Neon.tech connection string

## Step 3: Database Migration and Setup

### Option A: Fresh Database Setup (Recommended)

```bash
# 1. Run Prisma migration to create tables
npm run db:migrate:dev

# 2. Generate Prisma client
npm run db:generate

# 3. Seed the database with sample data (optional for testing)
npm run seed:database

# 4. Start the application
npm run dev
```

### Option B: Migrate from Existing JSON File Storage

If you have existing data in JSON file storage that you want to migrate:

```bash
# 1. Ensure your existing data is in the data/ directory
# 2. Run the migration script
npm run migrate:database

# 3. Update STORAGE_TYPE in .env to 'database'
# 4. Start the application
npm run dev
```

## Step 4: Verification

1. **Check Database Connection**:
   ```bash
   # Open Prisma Studio to browse your database
   npm run db:studio
   ```

2. **Test Application**:
   - Start the application: `npm run dev`
   - Open http://localhost:3000
   - Try adding a site and verify it's stored in the database

## Development Commands

```bash
# Database management
npm run db:migrate:dev      # Create and apply new migration
npm run db:migrate:deploy   # Apply migrations in production
npm run db:generate         # Generate Prisma client
npm run db:studio          # Open Prisma Studio (database GUI)
npm run db:reset           # Reset database (WARNING: deletes all data)

# Data migration and seeding
npm run migrate:database    # Migrate from JSON file to database
npm run seed:database      # Seed with fresh sample data
npm run seed:database:append # Add sample data without clearing existing

# Application
npm run dev                # Start development server
npm run build             # Build for production
npm run start             # Start production server
```

## Troubleshooting

### Common Issues

1. **"Database does not exist"**:
   - Verify your DATABASE_URL is correct
   - Ensure the database exists in your Neon.tech project

2. **Connection timeout**:
   - Check your internet connection
   - Verify Neon.tech service status
   - Ensure your connection string includes `?sslmode=require`

3. **Migration fails**:
   - Check if your DATABASE_URL is properly set
   - Ensure you have write permissions to the database
   - Try running `npm run db:reset` to start fresh (WARNING: deletes all data)

4. **Token encryption errors**:
   - Ensure TOKEN_MASTER_KEY is set correctly
   - It should be 64 hex characters (32 bytes)
   - Generate new one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Getting Help

1. Check the application logs for detailed error messages
2. Use Prisma Studio (`npm run db:studio`) to inspect database state
3. Verify environment variables with `echo $DATABASE_URL` (be careful not to expose in logs)

## Security Notes

- **Never commit** your `.env` file with real credentials
- **Use different databases** for development, staging, and production
- **Regularly backup** your production data using Neon.tech's backup features
- **Monitor usage** through Neon.tech dashboard to stay within plan limits

## Next Steps (Phase 2)

Once Phase 1 is working:
- User authentication system will be added
- Multi-tenant user isolation will be activated
- Subscription management will be implemented
- Usage analytics will be enhanced

## Support

For issues specific to this implementation, check:
1. Application logs
2. Neon.tech dashboard for database status
3. Prisma documentation for database operations