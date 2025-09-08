In‑App Google Navigation SDK — Native Setup

Overview
This project now includes a React Native bridge surface `src/native/navigation.ts` that calls a native module `NavigationModule.startNavigation(params)`. To enable full Google turn‑by‑turn in‑app, add the native module on Android and iOS using Google’s Navigation SDKs, then build Dev Clients.

What you’ll implement
- Android (Kotlin)
  - Add Google Navigation SDK + Maps SDK dependencies
  - Add a `NavActivity` hosting the Navigation UI
  - Add a `NavigationModule` NativeModule that launches `NavActivity`

- iOS (Swift)
  - Add Pods for Google Navigation SDK + GoogleMaps
  - Add a `NavViewController` hosting the Navigation UI
  - Add a `NavigationModule` NativeModule that presents `NavViewController`

Prereqs
- Google Maps Platform project with Navigation SDK enabled on your API key
- Expo Dev Client or bare RN build (Navigation SDK requires native build)

Android (Kotlin)
1) After running `expo prebuild` (or `expo run:android` once) you’ll have `android/`.

2) Add dependencies in `android/app/build.gradle`:

```
dependencies {
  implementation 'com.google.android.libraries.navigation:navigation:4.5.0' // example version
  implementation 'com.google.android.gms:play-services-maps:18.2.0'
}
```

3) Add your API key in `android/app/src/main/AndroidManifest.xml` if not already present via app.config:

```
<application>
  <meta-data android:name="com.google.android.geo.API_KEY" android:value="@string/google_maps_api_key" />
</application>
```

4) Create files (package name can be adjusted; update the package at the top accordingly):

- `android/app/src/main/java/com/yourapp/navigation/NavActivity.kt`
- `android/app/src/main/java/com/yourapp/navigation/NavigationModule.kt`
- `android/app/src/main/java/com/yourapp/navigation/NavigationPackage.kt`
- `android/app/src/main/res/layout/activity_nav.xml`

Use the templates in `native/android/` in this repo. Replace `com.yourapp.navigation` with your actual package.

5) Register the package in `MainApplication.kt` if needed (RN 0.71+/auto-link should pick it up if using autolinking). If not auto‑linked, add `NavigationPackage()` to `getPackages()`.

6) Build Dev Client: `expo run:android`

iOS (Swift)
1) After running `expo prebuild` (or `expo run:ios` once) you’ll have `ios/`.

2) In `ios/Podfile`, add:

```
pod 'GoogleMaps'
pod 'GoogleNavigation', :git => 'https://github.com/googlemaps/ios-navigation-sdk-examples.git' # replace with official pod once public listing is available
```

Note: Use Google’s official Navigation SDK pod when available; some orgs distribute via a private spec. If you already have public access, add the official podspec line here.

3) Add your API key in AppDelegate or Info.plist (if not already done via app.config). Ensure NSLocationWhenInUse/Always keys are present (already added in app.config.js).

4) Create files:
- `ios/NavigationModule.swift`
- `ios/NavViewController.swift`

Use the templates in `native/ios/` in this repo.

5) `pod install` inside `ios/` then build Dev Client: `expo run:ios`

React Native side
- Already available: `src/native/navigation.ts`
- ProviderTrip shows a "Start Turn‑by‑Turn" button only when the native module is linked (`isNativeNavigationAvailable()` is true). Without the native module, the in‑app fallback banner+polyline guidance is used.

Templates in this repo
- Android: `native/android/...`
- iOS: `native/ios/...`

These are minimal shells that you can copy into your native tree after prebuild. They illustrate parameter passing and SDK surface; you must fill in Navigation SDK route setup/start with the official APIs you have access to.

