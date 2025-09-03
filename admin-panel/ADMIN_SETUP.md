# Admin Panel Setup Instructions

## 🔐 **Service Role Configuration**

### **Why Service Role?**
- **Full database access** - Can read/write all tables
- **Bypass RLS policies** - Access user data without restrictions
- **Admin operations** - Approve/reject applications, view all user info

### **How to Get Service Role Key**

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your Swiftly project

2. **Navigate to API Settings**
   - Go to **Settings** → **API**
   - Scroll to **Project API keys**

3. **Copy Service Role Key**
   - Copy the `service_role` key (starts with `eyJ...`)
   - **⚠️ Keep this secret** - Never expose in client-side code

### **Environment Setup**

1. **Create `.env.local` file** in the admin-panel directory:
```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://akqwnbrikxryikjyyyov.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFrcXduYnJpa3hyeWlranl5eW92Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwMzQ1NzcsImV4cCI6MjA3MTYxMDU3N30.B0Vr3ZzYYBmY6I18hzwBSzln68R6DSy777wJJnGiMug

# Service Role Key - Replace with your actual service role key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

2. **Replace `your_service_role_key_here`** with your actual service role key

### **Security Best Practices**

✅ **Do:**
- Use service role only in server-side/admin applications
- Keep service role key in environment variables
- Add `.env.local` to `.gitignore`
- Use RLS policies for client applications

❌ **Don't:**
- Expose service role key in client-side code
- Commit service role key to version control
- Use service role in mobile app or public web app

### **Installation & Running**

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

### **Access Admin Panel**

Once running, visit: `http://localhost:3000`

The admin panel will now have full access to:
- All user profiles and data
- Verification status management
- Document URLs and vehicle information
- Complete onboarding details

### **Database Permissions**

With service role, the admin panel can:
- **Read all profiles** without RLS restrictions
- **Update verification_status** to approve/reject
- **View all user data** including documents and vehicle info
- **Access auth.users** table for additional user details

This gives you complete admin control over the provider onboarding process! 🎯




## Recommended public view & RLS guidance for live preview

To safely expose store data to the preview (anon client) without leaking sensitive columns, create a view and grant SELECT to `anon`.

SQL to run in Supabase SQL editor:

```sql
-- Create a safe public view with only the columns needed for preview
create view public.store_public as
select id, name, logo_url, banner_image_url, category, latitude, longitude, address, city, province, rating, review_count, delivery_fee, delivery_time_min, delivery_time_max, is_open, is_featured, sort_order
from public.stores
where is_active = true;

grant select on public.store_public to anon;
```

Use `public.store_public` in client queries instead of `public.stores`. This keeps base tables protected while allowing the admin preview and mobile clients to subscribe to realtime safely.

If you prefer policies instead of a view, create RLS policies limiting columns and requiring appropriate checks for select.
