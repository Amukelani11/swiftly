# Codemagic Setup Guide

## Prerequisites

1. **Codemagic Account**: Sign up at [codemagic.io](https://codemagic.io)
2. **Connect Repository**: Link your GitHub/GitLab/Bitbucket repository
3. **Environment Variables**: Set these in Codemagic dashboard:

### Required Environment Variables

Add these to your Codemagic project settings:

```
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key
EAS_PROJECT_ID=your_eas_project_id
```

### Optional (for publishing)

For Google Play Store:
```
GCLOUD_SERVICE_ACCOUNT_CREDENTIALS=your_service_account_json
```

For Apple App Store:
```
APP_STORE_CONNECT_PRIVATE_KEY=your_private_key
APP_STORE_CONNECT_KEY_IDENTIFIER=your_key_id
APP_STORE_CONNECT_ISSUER_ID=your_issuer_id
```

## Quick Start

1. **Add the files**:
   ```bash
   git add codemagic.yaml
   git add CODEMAGIC_README.md
   git commit -m "Add Codemagic CI/CD configuration"
   git push
   ```

2. **Configure in Codemagic**:
   - Go to your Codemagic dashboard
   - Select your project
   - Click "Check for configuration file" (should find `codemagic.yaml`)
   - Set up environment variables as listed above

3. **Run a build**:
   - Click "Start new build"
   - Select the workflow (e.g., "android-development")
   - Click "Start build"

## Workflows

### Development Builds
- **android-development**: Creates Android APK for testing
- **ios-development**: Creates iOS app for testing

### Production Builds
- **android-production**: Creates production AAB for Google Play Store
- **ios-production**: Creates production IPA for App Store

## Troubleshooting

### Build Fails
1. Check build logs for specific errors
2. Ensure all environment variables are set correctly
3. Verify your Google Maps API key has the right permissions
4. Make sure your Supabase keys are valid

### Environment Variables Not Working
- Environment variables are case-sensitive
- Make sure there are no extra spaces
- Some variables might need to be marked as "Secret"

### EAS Build Issues
- Ensure your `eas.json` is configured correctly
- Check that your Expo account has the right permissions
- Verify your project ID matches the one in EAS

## Alternative: Simpler Workflow

If you want a simpler setup, you can modify `codemagic.yaml` to use basic Expo builds:

```yaml
workflows:
  simple-android:
    scripts:
      - npm install
      - npx expo build:android --type apk
    artifacts:
      - "*.apk"
```

## Support

- [Codemagic Documentation](https://docs.codemagic.io/)
- [Expo EAS Documentation](https://docs.expo.dev/build/introduction/)
- [React Native Documentation](https://reactnative.dev/docs/environment-setup)
