# Swiftly - On-Demand Services Platform

A modern, world-class mobile application built with React Native and Expo that connects customers with service providers for tasks, shopping, and deliveries in South Africa.

## 🚀 Features

### For Customers
- **Order Anything**: Request groceries, essentials, or any items with smart pricing
- **Get Tasks Done**: Handyman services, cleaning, assembly, and more
- **Real-time Tracking**: Live updates on your order status
- **Secure Payments**: Two-step payment system with commute fees
- **Transparent Pricing**: Clear breakdown of all costs upfront

### For Service Providers
- **Earn on Your Schedule**: Flexible working hours with guaranteed income
- **Wallet System**: Immediate commute fee payments + task completion earnings
- **Smart Matching**: Get matched with tasks in your area
- **Reputation Building**: Rating system and performance tracking
- **Easy Payouts**: Withdraw earnings directly to your bank account

### Platform Features
- **Role-Based Experience**: Single app with seamless customer/provider switching
- **Modern UI/UX**: World-class design with Poppins typography
- **South African Focus**: Localized for SA market with ZAR currency
- **Security First**: Secure authentication and payment processing
- **Offline Support**: Core functionality works without internet

## 🛠️ Tech Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: React Navigation v6
- **State Management**: React Hooks + Context
- **Storage**: AsyncStorage
- **Styling**: Custom design system with consistent spacing, colors, and typography
- **Font**: Poppins (Google Fonts)
- **Icons**: Expo Vector Icons
- **CI/CD**: Codemagic (see `codemagic.yaml`)
- **Build Tool**: Expo Application Services (EAS)

## 🚀 Deployment & CI/CD

### Codemagic Setup
1. Connect your repository to [Codemagic](https://codemagic.io)
2. Add the `codemagic.yaml` file to your project root
3. Set up environment variables in Codemagic dashboard:
   - `REACT_APP_SUPABASE_URL`
   - `REACT_APP_SUPABASE_ANON_KEY`
   - `GOOGLE_MAPS_API_KEY`
4. Push and let Codemagic detect the configuration automatically

See `CODEMAGIC_README.md` for detailed setup instructions.

## 📱 Design System

### Colors
- **Primary**: Soft Blue (#6CA0DC)
- **Secondary**: Sunny Yellow (#FFC857)
- **Semantic**: Success, Warning, Error states
- **Neutrals**: Comprehensive gray scale

### Typography
- **Font Family**: Poppins (Regular, Medium, SemiBold, Bold)
- **Scale**: Consistent font sizes from xs to 5xl
- **Line Heights**: Optimized for readability

### Spacing & Layout
- **Consistent Scale**: 4px increments (xs: 4, sm: 8, md: 16, lg: 24, xl: 32)
- **Border Radius**: From none to full (rounded corners)
- **Shadows**: Layered shadow system for depth

## 🏗️ Project Structure

```
Swiftly/
├── App.tsx                    # Main app component with navigation
├── app.json                   # Expo configuration
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── assets/
│   ├── fonts/               # Poppins font files
│   └── images/              # App icons and splash screens
└── src/
    ├── components/          # Reusable UI components
    ├── screens/             # Screen components
    │   ├── auth/           # Authentication screens
    │   ├── customer/       # Customer-specific screens
    │   └── provider/       # Provider-specific screens
    ├── types/               # TypeScript type definitions
    ├── constants/           # App constants and theme
    ├── utils/               # Utility functions
    ├── hooks/               # Custom React hooks
    └── navigation/          # Navigation configuration
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (macOS) or Android Emulator/device

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Swiftly
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Download Poppins Fonts**
   - Visit [Google Fonts - Poppins](https://fonts.google.com/specimen/Poppins)
   - Download the following weights:
     - Poppins-Regular.ttf
     - Poppins-Medium.ttf
     - Poppins-SemiBold.ttf
     - Poppins-Bold.ttf
   - Place them in `assets/fonts/`

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Run on device/emulator**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android

   # Web
   npm run web
   ```

## 📋 Development

### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Code linting and formatting
- **Prettier**: Code formatting
- **Import Order**: Logical grouping of imports

### Key Scripts
```bash
npm start          # Start Expo development server
npm run android    # Run on Android device/emulator
npm run ios        # Run on iOS simulator
npm run web        # Run on web browser
npm run lint       # Run ESLint
npm run format     # Format code with Prettier
```

### Environment Variables
Create a `.env` file in the root directory:
```env
# Development
API_URL=http://localhost:3000/api
FIREBASE_CONFIG=your_firebase_config_here

# Production
NODE_ENV=production
```

## 🔧 Configuration

### App Configuration
The app configuration is in `app.json`:
- **Name**: "Swiftly"
- **Bundle ID**: com.swifty.app
- **Fonts**: Poppins font loading
- **Splash Screen**: Custom splash with logo
- **Permissions**: Location, camera, notifications

### Theme Configuration
All design tokens are in `src/constants/index.ts`:
- Colors, typography, spacing, shadows
- App constants (fees, limits, etc.)
- Validation rules and patterns

## 🧪 Testing

### Unit Tests
```bash
npm run test
```

### E2E Tests
```bash
npm run test:e2e
```

## 📦 Build & Deploy

### Build for Production
```bash
# Build for iOS
expo build:ios

# Build for Android
expo build:android

# Build for web
expo build:web
```

### Deployment
- **iOS**: Submit to App Store
- **Android**: Submit to Google Play Store
- **Web**: Deploy to Vercel, Netlify, or any static hosting

## 🔒 Security

- **Authentication**: Firebase Auth with email/password
- **Data Storage**: Encrypted AsyncStorage for sensitive data
- **Payments**: Secure payment processing with validation
- **Location**: User permission-based location access
- **Privacy**: GDPR and POPIA compliant data handling

## 📊 Business Logic

### Payment Flow
1. **Commute Fee**: R40 upfront (non-refundable for provider time)
2. **Task Completion**: Full amount charged after service
3. **Platform Fee**: 15% commission on task completion
4. **Provider Payout**: 85% of task amount + commute fee

### Task Matching
- **Radius-based**: Tasks within provider's service area
- **Rating-weighted**: Higher rated providers get priority
- **Response Time**: Faster acceptance gets preference
- **Specialization**: Task type matching

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **Email**: support@swifty.app
- **Issues**: GitHub Issues
- **Documentation**: [Wiki](https://github.com/your-repo/wiki)

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ Basic app structure and navigation
- ✅ Authentication system
- ✅ Role-based dashboards
- ✅ Wallet system for providers
- ✅ Task creation and acceptance

### Phase 2 (Next)
- 🔄 Real-time notifications
- 🔄 Location services integration
- 🔄 Payment gateway integration
- 🔄 Rating and review system
- 🔄 Advanced task filtering

### Phase 3 (Future)
- 📋 AI-powered task matching
- 📋 Advanced analytics dashboard
- 📋 Multi-language support
- 📋 Premium provider features
- 📋 Enterprise solutions

---

**Built with ❤️ for the South African gig economy**


Add Cursor CLI:

```bash
curl https://cursor.com/install -fsS | bash cursor cli
```









