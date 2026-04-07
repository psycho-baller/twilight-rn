# Twilight RN

Android-first React Native clone of the Swift Twilight sleep tracker, built with Expo Router, Uniwind, Zustand, and SQLite.

## Phase 1 scope

Implemented in this repo:

- onboarding flow
- tab shell for Home, Metrics, Logs, and Settings
- manual sleep session start, stop, and break handling
- SQLite-backed persistence for profiles, sessions, appearance, settings, emergency state, and demo restore state
- metrics and chart data generation in TypeScript
- sleep log creation, editing, and deletion
- JSON backup export/import, CSV export, and Markdown export
- demo mode import and restore flow
- deferred Android-core placeholders for NFC, QR, Health Connect, blocking enforcement, widgets, and shortcuts

Not implemented in phase 1:

- app blocking enforcement
- NFC and QR execution paths
- Health Connect sync
- widgets, quick settings tiles, and launcher shortcuts
- donations / in-app purchases

## Project layout

- [src/app](/Users/rami/Documents/code/swift/simple-sleep-tracker/twilight-rn/src/app): Expo Router routes
- [src/components](/Users/rami/Documents/code/swift/simple-sleep-tracker/twilight-rn/src/components): shared UI primitives
- [src/lib](/Users/rami/Documents/code/swift/simple-sleep-tracker/twilight-rn/src/lib): domain logic, storage, exports, notifications, theming
- [assets](/Users/rami/Documents/code/swift/simple-sleep-tracker/twilight-rn/assets): app icons, splash art, demo backup payload

## Commands

```sh
npm install
npm test -- --runInBand
npx expo-doctor
npx expo export --platform android
npm run android
```

For device work, use a development build rather than Expo Go.

## Notes

- Expo Router is rooted at `src/app`.
- Uniwind reads styles from [src/global.css](/Users/rami/Documents/code/swift/simple-sleep-tracker/twilight-rn/src/global.css).
- The app name, slug, and Android package are configured as Twilight / `twilight` / `studio.orbitlabs.twilight`.
