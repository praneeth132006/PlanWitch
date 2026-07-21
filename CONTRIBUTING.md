# Contributing to TravelWitch 🗺️

Thank you for your interest in making TravelWitch better! Whether you're fixing a typo, squashing a bug, or building an entirely new feature — every contribution counts and we truly appreciate it.

This document outlines the guidelines, conventions, and workflows you need to follow to contribute effectively.

---

## Table of Contents

- [Code of Conduct](#-code-of-conduct)
- [Prerequisites](#-prerequisites)
- [Development Setup](#-development-setup)
- [Project Architecture](#-project-architecture)
- [Branching Strategy](#-branching-strategy)
- [Making Changes](#-making-changes)
- [Commit Convention](#-commit-convention)
- [Pull Request Process](#-pull-request-process)
- [Coding Standards](#-coding-standards)
- [Testing Guidelines](#-testing-guidelines)
- [Environment Variables](#-environment-variables)
- [Common Pitfalls](#-common-pitfalls)
- [Need Help?](#-need-help)

---

## 📜 Code of Conduct

We are committed to fostering an open, welcoming, and inclusive environment. All contributors are expected to:

- **Be Respectful** — Treat everyone with dignity. Disagreement is fine; disrespect is not.
- **Be Constructive** — Offer helpful feedback and actionable suggestions in code reviews.
- **Be Collaborative** — Share knowledge freely and help others grow.
- **Be Patient** — Not everyone has the same experience level. Guide, don't gatekeep.

Harassment, discrimination, or any form of toxic behavior will not be tolerated. Violations may result in being removed from the project.

---

## 🔧 Prerequisites

Before you begin, ensure you have the following installed on your machine:

| Tool | Version | Purpose |
| :--- | :--- | :--- |
| [Node.js](https://nodejs.org/) | v18.x or later | JavaScript runtime |
| npm | Included with Node | Package management |
| [Git](https://git-scm.com/) | Latest stable | Version control |
| [Expo Go](https://expo.dev/client) | Latest | Test on physical devices (optional) |
| Xcode | Latest (macOS only) | iOS simulator (optional) |
| Android Studio | Latest | Android emulator (optional) |

> **Note**: We use `npx expo` commands to avoid global Expo CLI installation conflicts. You do **not** need to install Expo CLI globally.

---

## 🚀 Development Setup

### 1. Fork & Clone

```bash
# Fork the repository on GitHub first, then:
git clone https://github.com/<your-username>/TravelWitch.git
cd TravelWitch
```

### 2. Install Dependencies

```bash
npm install
```

> If you encounter peer dependency warnings, they are generally safe to ignore for Expo-managed projects.

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Fill in the required values (see [Environment Variables](#-environment-variables) for details).

### 4. Start the Development Server

```bash
# Web (PWA) — recommended for rapid iteration
npm run web

# Expo development dashboard (all platforms)
npx expo start

# iOS simulator (macOS only, requires Xcode)
npm run ios

# Android emulator (requires Android Studio)
npm run android
```

### 5. Verify Everything Works

- The app should launch without errors
- You should be able to reach the Auth screen
- If you have valid Firebase credentials, you should be able to sign in

---

## 🏗️ Project Architecture

Understanding the codebase structure is essential before making changes. TravelWitch follows a **modular, domain-driven architecture**.

```
/
├── App.js                    # Entry point — wraps all Context providers
├── src/
│   ├── components/           # Reusable UI (GlassCard, BannerAd, Alerts, etc.)
│   ├── config/               # Firebase init, AdMob unit IDs, environment config
│   ├── context/              # Global state via React Context API
│   │   ├── AuthContext.js    # User session, login/logout flows
│   │   ├── TravelContext.js  # Active trip data, budget calculations, sync
│   │   ├── ThemeContext.js   # Dark/Light mode, persisted via AsyncStorage
│   │   ├── PremiumContext.js # RevenueCat subscription entitlements
│   │   └── AlertContext.js   # Global toast/notification system
│   ├── navigation/           # React Navigation stack definitions
│   ├── screens/              # Top-level screen components (one per route)
│   ├── services/             # Business logic & external API abstraction
│   │   ├── aiService.js      # Grok AI prompt construction & response parsing
│   │   ├── databaseService.js# Firebase RTDB CRUD & real-time listeners
│   │   ├── authService.js    # Authentication helpers
│   │   ├── transitService.js # Google Maps routing integration
│   │   ├── calendarService.js# Device calendar export
│   │   ├── couponService.js  # Promotional coupon logic
│   │   ├── loggingService.js # Crashlytics & performance monitoring
│   │   └── AdService.js      # Monetization (banner/interstitial ads)
│   └── utils/                # Shared helpers, formatters, constants
├── assets/                   # Images, icons, fonts
├── functions/                # Firebase Cloud Functions (backend triggers)
├── landing-page/             # Marketing website (static HTML/CSS)
├── ios/                      # Xcode project for native iOS builds
├── web/                      # Web-specific configuration
└── scripts/                  # Build & deployment utilities
```

### Key Architectural Principles

1. **Context-Driven State** — All global state flows through React Context. Never prop-drill more than 2 levels deep.
2. **Service Layer Abstraction** — Screens never call Firebase or external APIs directly. Always go through a `src/services/` module.
3. **Platform-Aware Modules** — Some services have `.native.js` variants (e.g., `AdService.js` vs `AdService.native.js`). React Native's module resolution handles platform switching automatically.
4. **Single Source of Truth** — Firebase Realtime Database is the SSOT for all trip data. Local state is a cached reflection.

---

## 🌿 Branching Strategy

We use a simplified **GitHub Flow** model.

| Branch | Purpose | Protected? |
| :--- | :--- | :---: |
| `main` | Production-ready code. All PRs merge here. | ✅ |
| `feature/*` | New features (e.g., `feature/offline-mode`) | ❌ |
| `fix/*` | Bug fixes (e.g., `fix/expense-rounding`) | ❌ |
| `docs/*` | Documentation changes (e.g., `docs/api-reference`) | ❌ |
| `refactor/*` | Code restructuring without behavior changes | ❌ |
| `hotfix/*` | Critical production fixes requiring fast-track merge | ❌ |

### Creating a Branch

```bash
# Always branch from the latest main
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

> **Important**: Never push directly to `main`. All changes must go through a Pull Request.

---

## ✏️ Making Changes

### Before You Start

1. **Check existing Issues** — Is someone already working on this? Comment on the issue to claim it.
2. **Open an Issue first** (for features) — Discuss your idea before investing significant time.
3. **Keep scope small** — Smaller PRs are reviewed faster and merged sooner.

### While You Work

- Run the app frequently to catch errors early
- Test on both **dark** and **light** themes
- If modifying shared trip logic, test real-time sync with two browser windows
- If touching AI features, verify the "Prompt Copy" fallback works when the API key is missing
- Keep the console clean — address any new warnings your changes introduce

---

## 💬 Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean, machine-readable history.

### Format

```
<type>(<optional-scope>): <short description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to Use | Example |
| :--- | :--- | :--- |
| `feat` | A new feature | `feat(itinerary): add drag-to-reorder for activities` |
| `fix` | A bug fix | `fix(expense): correct currency rounding for JPY` |
| `docs` | Documentation only | `docs: update CONTRIBUTING with branch naming` |
| `style` | Formatting, whitespace (no logic change) | `style(home): fix inconsistent indentation` |
| `refactor` | Restructuring without changing behavior | `refactor(services): extract shared fetch helper` |
| `perf` | Performance improvement | `perf(map): lazy-load markers outside viewport` |
| `test` | Adding or updating tests | `test(auth): add sign-in flow edge cases` |
| `chore` | Build, CI, tooling | `chore(ci): add Node 20 to test matrix` |
| `revert` | Reverting a previous commit | `revert: feat(chat): add voice input` |

### Rules

- Use **imperative mood** in the description: "add feature" not "added feature"
- Keep the first line under **72 characters**
- Reference related issues in the footer: `Closes #42`

---

## 🔀 Pull Request Process

### Checklist Before Submitting

- [ ] Branch is up-to-date with `main` (`git rebase main` or `git merge main`)
- [ ] App builds without errors on Web (`npm run web`)
- [ ] No new console warnings or errors
- [ ] Dark mode and light mode both render correctly
- [ ] Real-time sync tested if relevant changes were made
- [ ] Commits follow the [Conventional Commits](#-commit-convention) format
- [ ] Self-reviewed all changed files in the GitHub diff

### PR Title & Description

Your PR title should follow the same `type: description` format as commits:

```
feat(packing): add weather-based category suggestions
```

In the PR description, include:

1. **What** — A concise summary of the change
2. **Why** — The motivation or problem being solved
3. **How** — The technical approach (if non-obvious)
4. **Screenshots/Recordings** — Required for any UI changes
5. **Testing** — Steps to verify the change works

### Review Process

1. All PRs require **at least 1 approving review** before merge
2. CI checks (lint, build) must pass
3. Reviewers may request changes — iterate promptly
4. Once approved, the PR author merges using **Squash & Merge**
5. Delete the feature branch after merge

---

## 🎨 Coding Standards

### General

- **Language**: JavaScript (ES6+) with JSX
- **Components**: Functional components with hooks exclusively. No class components.
- **File Naming**: PascalCase for components/screens (`HomeScreen.js`), camelCase for services/utils (`aiService.js`)

### Theming

Always use the `useTheme` hook for colors. **Never hardcode hex values**.

```javascript
import { useTheme } from '../context/ThemeContext';

const MyComponent = () => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bg }]}>
      <Text style={{ color: colors.text }}>Hello</Text>
    </View>
  );
};
```

### State Management

| Context | Use For |
| :--- | :--- |
| `useAuth()` | User session, login state, admin checks |
| `useTravelContext()` | Active trip data, expenses, itinerary, collaborators |
| `useTheme()` | Colors, dark/light mode toggle |
| `usePremium()` | Subscription status, entitlement checks |

> **Rule**: If your data relates to the current trip, it belongs in `TravelContext`. If it's UI-only and component-scoped, use local `useState`.

### Services

- All external API calls must go through `src/services/`
- Services should **return parsed data**, not raw responses
- Handle errors gracefully — never let an unhandled promise rejection crash the app
- Use `try/catch` blocks and provide meaningful fallback behavior

```javascript
// ✅ Good — error handled, fallback provided
try {
  const itinerary = await aiService.generateItinerary(params);
  setItinerary(itinerary);
} catch (error) {
  console.error('AI generation failed:', error);
  showFallbackPromptCopy(params);
}

// ❌ Bad — unhandled, will crash on failure
const itinerary = await aiService.generateItinerary(params);
setItinerary(itinerary);
```

### Styling

- Use `StyleSheet.create()` for all styles — avoid inline style objects where possible
- Group related styles logically
- Use responsive values, not fixed pixel widths, for layout

### Linting

Run the linter before committing:

```bash
npm run lint
```

We recommend using [Prettier](https://prettier.io/) alongside ESLint for consistent formatting. Configure your editor to format on save.

---

## 🧪 Testing Guidelines

We currently rely on **manual verification** with plans to introduce automated testing. Follow these checklists rigorously.

### UI Verification

- [ ] Component renders correctly on small screens (375px width)
- [ ] Component renders correctly on large screens (1440px width)
- [ ] Dark mode colors apply correctly (no white text on white bg, etc.)
- [ ] Light mode colors apply correctly
- [ ] Animations and transitions are smooth (no jank)
- [ ] Interactive elements have appropriate touch/hover feedback

### Real-Time Sync Verification

For any changes touching `databaseService.js`, `TravelContext.js`, or shared trip data:

- [ ] Open the app in two browser windows with the same trip
- [ ] Make a change in Window A (e.g., add an expense)
- [ ] Verify Window B reflects the change **without** a manual refresh
- [ ] Verify no data is lost or duplicated

### AI Feature Verification

For changes to `aiService.js` or AI-related screens:

- [ ] Generate an itinerary with valid API key — verify structured JSON response
- [ ] Test with **missing** API key — verify the "Prompt Copy" fallback activates
- [ ] Test with edge-case inputs (1-day trip, 30-day trip, extreme budget values)
- [ ] Verify parsed data matches expected schema before writing to Firebase

### Cross-Platform Verification

If you have access to multiple platforms:

- [ ] Web (Chrome, Safari, Firefox)
- [ ] iOS (Expo Go or simulator)
- [ ] Android (Expo Go or emulator)

---

## 🔐 Environment Variables

The app requires the following environment variables. Create a `.env` file at the project root:

```env
# Required — Google Grok AI
EXPO_PUBLIC_GROK_API_KEY=your_grok_api_key

# Required — Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id

# Optional — Google Maps (for transit features)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=your_maps_api_key
```

### Where to Get Keys

| Key | Source |
| :--- | :--- |
| Grok API Key | [Google AI Studio](https://console.x.ai/) |
| Firebase Config | [Firebase Console](https://console.firebase.google.com/) → Project Settings |
| Google Maps Key | [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services |

> ⚠️ **Security**: Never commit your `.env` file. It is already in `.gitignore`. If you need to share keys with teammates, use a secure channel.

---

## ⚠️ Common Pitfalls

### 1. Native Module Imports on Web

Some packages (Google Sign-In, Crashlytics, AdMob) only work in native builds. Always guard these imports:

```javascript
// ✅ Correct — gracefully handled
let GoogleSignin;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
} catch (e) {
  // Running in Expo Go or Web — Google Sign-In unavailable
}
```

### 2. Firebase Realtime Database Paths

- Always use the trip's unique ID as the database path prefix
- Never write to root-level paths
- Test with the [Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite) when possible

### 3. Expo Go Limitations

Expo Go does not support:
- Native modules (react-native-maps in certain configs, Google Sign-In)
- Push notifications
- Custom native code

For these features, use a **development build** (`npx expo run:ios` or `npx expo run:android`).

### 4. Large Screen Files

Some screens (e.g., `HomeScreen.js`, `TripSetupScreen.js`) are large and complex. When modifying these:
- Make targeted, surgical edits
- Test thoroughly — side effects are more likely in large files
- Consider extracting reusable logic into hooks or sub-components

---

## 🤝 Types of Contributions We Welcome

| Contribution | Examples |
| :--- | :--- |
| 🐛 **Bug Fixes** | Fix expense rounding, theme inconsistencies, sync issues |
| ✨ **Features** | New checklist categories, export to PDF, social sharing |
| 📖 **Documentation** | Improve README, add JSDoc comments, write tutorials |
| 🎨 **Design** | Improve animations, accessibility (a11y), responsive layouts |
| ⚡ **Performance** | Reduce re-renders, optimize Firebase reads, lazy loading |
| 🌍 **Localization** | Add translations for new languages |
| ♿ **Accessibility** | Screen reader support, keyboard navigation, color contrast |

---

## 📬 Need Help?

- **General Questions** — Open a [Discussion](https://github.com/praneeth132006/TravelWitch/discussions) on GitHub
- **Bug Reports** — File an [Issue](https://github.com/praneeth132006/TravelWitch/issues) with reproduction steps
- **Direct Contact** — Reach out to [Praneeth](https://github.com/praneeth132006)

---

<p align="center">
  <strong>Thank you for helping make TravelWitch better! ✨</strong><br>
  Every contribution, no matter how small, makes a difference.
</p>
