# Swiftly Admin Panel

A Next.js admin panel for managing Swiftly users and their onboarding applications.

## Features

- **Dashboard Overview**: View statistics and user applications at a glance
- **User Management**: View detailed user information and onboarding data
- **Application Review**: Approve or reject provider applications
- **Real-time Updates**: Connected to Supabase for live data

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables (optional - uses hardcoded values by default):
```bash
# Create .env.local file
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Run the development server:
```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Pages

### Dashboard (`/`)
- Overview of all users and applications
- Statistics cards showing total, pending, approved, and rejected applications
- Table with user information and quick actions

### User Details (`/users/[id]`)
- Detailed view of individual user information
- Onboarding application details
- Vehicle information (for personal shoppers)
- Document verification status
- Approve/Reject actions

## Database Schema

The admin panel connects to the `profiles` table in Supabase with the following key fields:

- `id`: User ID
- `email`: User email
- `full_name`: User's full name
- `phone`: Phone number
- `user_role`: 'customer' | 'provider' | 'admin'
- `provider_type`: 'personal_shopper' | 'tasker' | null
- `verification_status`: 'pending' | 'approved' | 'rejected'
- `documents_verified`: boolean
- `vehicle_*`: Vehicle-related fields for personal shoppers
- `hourly_rate`: Provider's hourly rate

## Technologies Used

- **Next.js 14**: React framework with App Router
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Supabase**: Database and authentication
- **Lucide React**: Icons

## Deployment

The admin panel can be deployed to Vercel, Netlify, or any other Next.js-compatible hosting platform.

```bash
# Build for production
pnpm build

# Start production server
pnpm start
```




