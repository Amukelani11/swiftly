# 🚀 Swiftly - Complete Setup Guide

## 📋 Overview

Swiftly is a comprehensive service marketplace platform built with React Native, Supabase, and PostgreSQL. This guide will help you set up the complete backend infrastructure and connect your app to real data.

## 🛠️ Prerequisites

- Node.js 16+ installed
- Supabase CLI installed (`npm install -g supabase`)
- A Supabase project (create one at [supabase.com](https://supabase.com))

## 📁 Project Structure

```
Swiftly/
├── database_schema.sql          # Complete PostgreSQL schema
├── supabase/
│   ├── config.toml             # Supabase configuration
│   └── edge-functions/
│       └── auth/
│           └── index.ts        # Authentication Edge Function
├── src/
│   ├── lib/
│   │   └── supabase.ts         # Supabase client & API functions
│   └── screens/
│       └── auth/
│           ├── AuthScreen.tsx  # Sign up/Sign in screen
│           └── WelcomeScreen.tsx # Updated welcome screen
├── deploy-edge-function.sh     # Deployment script
└── SWIFTY_SETUP_README.md      # This file
```

## ⚙️ Step 1: Environment Setup

### 1.1 Create Environment Variables

Create a `.env` file in your project root:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Example:
# EXPO_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
# EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 1.2 Install Dependencies

```bash
# Install Supabase client (already done)
npm install @supabase/supabase-js

# Install Supabase CLI globally
npm install -g supabase
```

## 🗄️ Step 2: Database Setup

### 2.1 Run Database Schema

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the entire contents of `database_schema.sql`
4. Paste and run the SQL script

**What gets created:**
- ✅ 10 core tables (profiles, tasks, bids, payments, etc.)
- ✅ Complete Row Level Security (RLS) policies
- ✅ Database functions and triggers
- ✅ Performance indexes
- ✅ Default categories

### 2.2 Verify Tables

After running the schema, you should see these tables in your Supabase dashboard:
- `profiles` - User profiles
- `tasks` - Service requests
- `bids` - Provider offers
- `payments` - Payment records
- `reviews` - Ratings and feedback
- `messages` - Chat system
- `notifications` - Push notifications
- `categories` - Service categories

## 🔐 Step 3: Authentication Setup

### 3.1 Deploy Edge Function

Run the deployment script:

```bash
# Make script executable
chmod +x deploy-edge-function.sh

# Deploy the auth function
./deploy-edge-function.sh
```

Or deploy manually:

```bash
# Login to Supabase
supabase login

# Deploy auth function
supabase functions deploy auth
```

### 3.2 Configure Supabase Auth

In your Supabase Dashboard:

1. Go to **Authentication > Settings**
2. Configure these settings:
   - ✅ Enable email signups
   - ✅ Disable email confirmations (for development)
   - ✅ Set site URL to your app URL

## 📱 Step 4: Connect Your App

### 4.1 Update App Configuration

The Supabase client is already configured in `src/lib/supabase.ts` with:
- ✅ Custom React Native storage adapter
- ✅ Authentication functions
- ✅ Database operation functions
- ✅ Real-time subscription helpers

### 4.2 Update Navigation

Add the new AuthScreen to your navigation in `App.tsx`:

```typescript
import AuthScreen from './src/screens/auth/AuthScreen';

// Add to your Stack Navigator:
<Stack.Screen name="Auth" component={AuthScreen} />
```

### 4.3 Test Authentication

1. Run your app: `npm start`
2. Navigate to the AuthScreen
3. Test sign up and sign in
4. Check that user profiles are created in the database

## 🔄 Step 5: Replace Mock Data

### 5.1 Update Welcome Screen

The WelcomeScreen is already configured to use the new design with your SVG logo. To add real data fetching:

```typescript
// Example: Fetch available tasks
const [tasks, setTasks] = useState([]);

useEffect(() => {
  const fetchTasks = async () => {
    const { data, error } = await db.tasks.getAll();
    if (!error) setTasks(data);
  };
  fetchTasks();
}, []);
```

### 5.2 Update Other Screens

Replace mock data in your existing screens with real Supabase calls:

```typescript
// Instead of mock data like:
const mockTasks = [...];

// Use real data:
const { data: tasks, error } = await db.tasks.getAll();
```

## 🎯 Step 6: Available API Functions

### Authentication
```typescript
import { auth } from '../lib/supabase';

// Sign up
await auth.signUp(email, password, userData);

// Sign in
await auth.signIn(email, password);

// Sign out
await auth.signOut();

// Get current user
const { user } = await auth.getCurrentUser();
```

### Database Operations
```typescript
import { db } from '../lib/supabase';

// Tasks
await db.tasks.create(taskData);
await db.tasks.getAll();
await db.tasks.getById(taskId);

// Bids
await db.bids.create(bidData);
await db.bids.getForTask(taskId);

// Messages
await db.messages.send(messageData);
await db.messages.getForTask(taskId);
```

### Real-time Subscriptions
```typescript
import { realtime } from '../lib/supabase';

// Subscribe to new bids
const subscription = realtime.subscribeToBids(taskId, (payload) => {
  console.log('New bid received:', payload);
});

// Don't forget to unsubscribe when component unmounts
subscription.unsubscribe();
```

## 🧪 Step 7: Testing

### 7.1 Test Authentication
- ✅ Sign up new users
- ✅ Sign in existing users
- ✅ Profile creation
- ✅ Role assignment

### 7.2 Test Core Features
- ✅ Create tasks
- ✅ Submit bids
- ✅ Send messages
- ✅ Real-time updates

### 7.3 Test Data Flow
- ✅ Tasks appear in database
- ✅ Bids are associated with tasks
- ✅ Messages are stored
- ✅ Notifications are created

## 🚨 Troubleshooting

### Common Issues

**"Functions in index expression must be marked IMMUTABLE"**
- This was fixed in the database schema
- If you encounter it, the schema includes error handling

**"Supabase client not configured"**
- Check your `.env` file has the correct Supabase URL and keys
- Make sure the environment variables are loaded

**Authentication not working**
- Verify your Supabase Auth settings
- Check that email confirmations are disabled for development
- Ensure the Edge Function is deployed

**Database connection issues**
- Verify your database schema was executed successfully
- Check RLS policies are enabled
- Ensure your user has the correct permissions

## 📊 Database Schema Overview

### Core Tables:
- **`profiles`** - User profiles with location and verification
- **`tasks`** - Service requests with location and pricing
- **`bids`** - Provider offers on tasks
- **`payments`** - Payment processing (15% platform fee)
- **`reviews`** - 5-star ratings system
- **`messages`** - Real-time chat system
- **`notifications`** - Push notification system

### Security Features:
- ✅ Row Level Security on all tables
- ✅ User-specific data access
- ✅ Secure payment processing
- ✅ Private messaging
- ✅ Location-based access control

## 🎉 You're Ready!

Your Swiftly app now has:
- ✅ Complete authentication system
- ✅ Real-time database operations
- ✅ Secure data access
- ✅ Professional UI with your logo
- ✅ Scalable backend infrastructure

Start building features and connecting your screens to real data! 🚀

## 📞 Support

If you encounter any issues:
1. Check the troubleshooting section above
2. Verify your Supabase configuration
3. Test with the provided example code
4. Check Supabase logs for detailed error messages

---

**Happy coding! 🎯**








