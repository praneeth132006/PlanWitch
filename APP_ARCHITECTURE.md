# PlanWitch Application Architecture

This document provides a comprehensive technical overview of the PlanWitch mobile application architecture. It is designed to help developers, contributors, and technical stakeholders understand the system design, data flow, and core integrations.

## 1. High-Level Architecture Diagram

The following diagram illustrates the high-level architecture of PlanWitch, including the client application, state management, internal services, and external integrations.

```mermaid
flowchart TD
    %% Define Styles
    classDef client fill:#E3F2FD,stroke:#1E88E5,stroke-width:2px,color:#000
    classDef ui fill:#F3E5F5,stroke:#8E24AA,stroke-width:2px,color:#000
    classDef state fill:#E8F5E9,stroke:#43A047,stroke-width:2px,color:#000
    classDef service fill:#FFF3E0,stroke:#FB8C00,stroke-width:2px,color:#000
    classDef backend fill:#FFEBEE,stroke:#E53935,stroke-width:2px,color:#000
    classDef external fill:#ECEFF1,stroke:#546E7A,stroke-width:2px,color:#000

    subgraph Client ["PlanWitch Mobile Client (React Native / Expo)"]
        direction TB
        AppEntry[App.js / Entry Point]:::client --> Navigation[React Navigation (Expo Router)]:::ui
        AppEntry --> Contexts[Context API Providers]:::state

        subgraph Nav ["Navigation Layers"]
            Navigation --> AuthStack[Auth Stack]:::ui
            Navigation --> MainStack[Main Application Stack]:::ui
            MainStack --> TripDash[Active Trip Modules]:::ui
        end

        subgraph StateManagement ["Global State (React Context)"]
            Contexts --> AuthCtx[AuthContext - User Session]
            Contexts --> TravelCtx[TravelContext - Active Trip Data]
            Contexts --> ThemeCtx[ThemeContext - UI/UX Styling]
            Contexts --> PremiumCtx[PremiumContext - IAP State]
        end

        subgraph Services ["Internal Business Logic Services"]
            AuthSvc[authService.js]:::service
            DatabaseSvc[databaseService.js]:::service
            AISvc[aiService.js (Gemini Orchestration)]:::service
            TransitSvc[transitService.js (Google Maps)]:::service
            AdSvc[AdService.js (Monetization)]:::service
        end
    end

    subgraph Firebase ["Firebase Backend (BaaS)"]
        FirebaseAuth[Firebase Authentication]:::backend
        FirebaseDB[(Firebase Realtime Database)]:::backend
        FirebaseCrash[Crashlytics & Performance]:::backend
        
        AuthSvc ==> FirebaseAuth
        DatabaseSvc ==> FirebaseDB
    end

    subgraph ThirdParty ["External APIs & Integrations"]
        RevenueCat[(RevenueCat - Subscriptions)]:::external
        AdMob[Google AdMob]:::external
        Gemini[Google Gemini 1.5/2.0 API]:::external
        GoogleMaps[Google Route/Places API]:::external

        PremiumCtx ==> RevenueCat
        AdSvc ==> AdMob
        AISvc ==> Gemini
        TransitSvc ==> GoogleMaps
    end
```

---

## 2. Technology Stack

PlanWitch is built on a modern, deeply integrated mobile stack optimized for cross-platform performance and AI-driven features.

### Frontend
* **Framework:** React Native running on Expo SDK (currently configuring for v55+).
* **Language:** JavaScript / JSX (incorporating modern ES6+ features).
* **Navigation:** React Navigation (`@react-navigation/native`).
* **State Management:** React Context API (custom hooks for isolated domain states).
* **Styling:** Custom StyleSheet objects with dynamic theming (Dark/Light mode via ThemeContext).

### Backend & Infrastructure
* **BaaS Provider:** Google Firebase.
* **Authentication:** Firebase Auth (Email/Password & Google OAuth).
* **Database:** Firebase Realtime Database (optimized for low-latency collaborative trip syncing).
* **Telemetry:** Firebase Crashlytics & Performance Monitoring.

### Third-Party Integrations
* **Generative AI:** Google Gemini API (used for personalized itinerary generation, smart packing lists, and the conversational Travel Assistant).
* **Monetization (Ads):** Google AdMob (Banner and Interstitial displays).
* **Monetization (IAP):** RevenueCat SDK (handles App Store / Google Play subscription logic and entitlement verification).
* **Mapping & Transit:** Google Maps Platform (Directions API, Places SDK) integrated via `react-native-maps`.

---

## 3. Directory Structure Layout

The project follows a modular, feature-based architecture design within the `src/` directory.

```text
/
├── App.js                   # Application entry point, wraps global providers
├── app.json                 # Expo configuration (bundle IDs, native permissions)
├── firebase.json            # Firebase CLI configuration
├── src/
│   ├── components/          # Reusable UI components (Buttons, GlassCards, Alerts, BannerAds)
│   ├── config/              # Environment variables, Firebase init, AdMob unit IDs
│   ├── context/             # Global React Context providers
│   │   ├── AuthContext.js   # Manages user session and login flows
│   │   ├── TravelContext.js # Manages active trip data, syncing, and budget math
│   │   ├── ThemeContext.js  # Manages visual theming and local storage persistence
│   │   ├── PremiumContext.js# Interfaces with RevenueCat for entitlements
│   │   └── AlertContext.js  # Global toast/notification system
│   ├── navigation/          # React Navigation stack definitions (MainNavigator.js)
│   ├── screens/             # Top-level screen components
│   │   ├── [Auth Screens]   # AuthScreen, OnboardingScreen, ForgotPassword
│   │   ├── [Hub Screens]    # WelcomeScreen, JoinSelectionScreen
│   │   ├── [Trip Screens]   # HomeScreen, MapScreen, ExpenseScreen, AIChatScreen
│   │   ├── [Setup Screens]  # TripSetupScreen, TripPreferencesScreen, AIPersonalizedPlan
│   │   └── [Profile Screens]# ProfileScreen, SubscriptionScreen, AdminScreen
│   ├── services/            # Controller layer for abstracting external API calls
│   │   ├── aiService.js     # Prompts and parses Gemini AI responses
│   │   ├── databaseService.js # Firebase RTDB CRUD operations
│   │   └── transitService.js # Connects to Google Maps routing
│   └── utils/               # Helper functions, formatting, constants
```

---

## 4. Core System Workflows

### 4.1 State Management & Data Flow
PlanWitch relies heavily on the React Context API to prevent prop-drilling and maintain modularity.
1. `AuthContext` determines the root navigation state (Auth Stack vs Main Stack).
2. When a user selects a trip on the `WelcomeScreen`, `TravelContext` pulls the trip data from Firebase RTDB and sets it as the "Active Trip" (`currentTrip`).
3. Modules inside the active trip (like `ExpenseScreen` or `PackingScreen`) mutate local state and dispatch updates via `databaseService.js` to Firebase.
4. Firebase listeners update the local state in real-time, allowing collaborators on the same trip to see immediate changes (e.g., checking off a packing list item).

### 4.2 AI Itinerary Generation Engine
1. User inputs constraints (Destination, Dates, Budget, Vibe, Pace, Diet).
2. The UI pushes these constraints to `aiService.js`.
3. `aiService.js` constructs a highly structured, system-instructed prompt for the Gemini API, requiring a synthesized JSON response.
4. `AIPersonalizedPlanScreen` parses the generative stream.
5. Once complete, the parsed JSON is heavily validated, converted into local data models, pushed to Firebase, and the user is dropped into their newly generated dashboard.

### 4.3 Revenue Operations Layer
* **Free Tier:** Evaluated by `PremiumContext`. Renders `BannerAd.js` at the bottom of standard screens. Periodically triggers UI blockers via `AdService` (Interstitial ads) after specific actions (e.g., viewing an itinerary).
* **Premium Tier:** RevenueCat confirms the `pro` entitlement. The app strips all ad components, bypasses Interstitial triggers, and removes usage limits on the `AIChatScreen` and generative engines.

## 5. Security & Administration
* **Admin Roles:** `AuthContext` validates specific email addresses against an admin boolean. Admins gain access to the `AdminScreen`, routing to custom Firebase functions for generating promotional coupons, reading user crash logs, and managing platform feedback.
* **Separation of Concerns:** Native module imports (like Google Sign-In and Crashlytics) are gracefully wrapped in try/catch blocks within the source code to ensure the app continues to boot in `Expo Go` during rapid prototyping while activating cleanly in production builds.
