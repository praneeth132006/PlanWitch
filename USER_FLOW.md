# PlanWitch User Flow Documentation

This document maps out the specific paths and journeys a user can take through the PlanWitch application. It details edge cases, transition triggers, and core user-facing loops.

## 1. Complete Application Flowchart

The following Mermaid diagram maps every single tap, conditional logic check, and screen state in the application, from launch to administration.

```mermaid
flowchart TD
    classDef start fill:#E3F2FD,stroke:#1E88E5,stroke-width:2px,color:#000
    classDef auth fill:#FFF3E0,stroke:#FB8C00,stroke-width:2px,color:#000
    classDef hub fill:#F3E5F5,stroke:#8E24AA,stroke-width:2px,color:#000
    classDef setup fill:#E8F5E9,stroke:#43A047,stroke-width:2px,color:#000
    classDef dash fill:#FFEBEE,stroke:#E53935,stroke-width:2px,color:#000
    classDef feature fill:#E0F7FA,stroke:#00ACC1,stroke-width:2px,color:#000

    Launch([App Launch & Check Auth]):::start --> IsAuth{"Is User Logged In?"}
    
    %% Auth Flow
    IsAuth -- No --> AuthScreen[Unified Auth Screen (Login/Signup)]:::auth
    AuthScreen --> |Google OAuth / Email| IsNewUSer{"Is New Registration?"}
    IsNewUSer -- Yes --> Onboarding[Onboarding UI Walkthrough]:::auth
    Onboarding --> WelcomeScreen
    IsNewUSer -- No --> WelcomeScreen

    IsAuth -- Yes --> WelcomeScreen[Welcome Hub Screen 🏠]:::hub

    %% Hub Routing
    WelcomeScreen --> |Has Active Trip| LoadTrip[Load Current Trip Data]:::hub
    LoadTrip --> TripDash[Trip Dashboard (HomeScreen)]:::dash
    
    WelcomeScreen --> |Tap 'Plan Trip'| TripSetup[Trip Setup Constraints]:::setup
    WelcomeScreen --> |Tap 'Join Trip'| JoinTrip[Enter 6-Digit Trip Code]:::setup
    WelcomeScreen --> |Tap Avatar| Profile[Profile Menu]:::auth

    %% AI Creation Flow
    TripSetup --> Preferences[Select Vibe, Pace, Diet]:::setup
    Preferences --> AILoading[Generative Magic Loading Screen]:::setup
    AILoading --> |Parsed JSON Saved| LoadTrip
    
    %% Collaborative Join Flow
    JoinTrip --> ValidateCode{"Code Valid in RTDB?"}
    ValidateCode -- Yes --> IdentifyTraveler[Map User to Traveler Profile]:::setup
    IdentifyTraveler --> LoadTrip

    %% Trip Dashboard Subsystems
    TripDash --> |Timeline Toggle| MapScreen[Map & Itinerary View]:::feature
    TripDash --> |Finance Toggle| BudgetScreen[Expenses & Split Math]:::feature
    TripDash --> |Lists Toggle| PackingScreen[Synced Packing List]:::feature
    TripDash --> |Food Toggle| FoodScreen[Synced Restaurant List]:::feature
    TripDash --> |Wand Icon| AIChat[Conversational Travel AI]:::feature
    
    TripDash --> |Tap 'End Trip'| MoveHistory[Clear Active State, Save to History]:::hub
    MoveHistory --> WelcomeScreen

    %% Administrative Layer
    Profile --> |View History| PastTrips[Completed Trips (Read-Only Dash)]:::feature
    Profile --> |View Upgrades| Subscription[RevenueCat Paywall]:::feature
    Profile --> |If Admin| AdminPanel[Admin Dash & Promo Coupons]:::feature
    Profile --> |Log Out| ClearCache([Clear Session & Reset]):::start
    ClearCache --> AuthScreen
```

---

## 2. Granular User Journeys

The application features several highly distinct pathways depending on user intent.

### A. The Onboarding & Discovery Journey
1. **First Launch:** The user opens the app and is greeted by Firebase initialization. No session token exists, so they are routed to `AuthScreen.js`.
2. **Registration:** The user selects Google Sign-In or registers via Email/Password. `AuthContext` flags them as a new user.
3. **Introduction:** They are transitioned to the `OnboardingScreen.js` carousel, explaining the AI itinerary generation, budget tracking, and real-time collaboration.
4. **Hub Entry:** User lands on `WelcomeScreen.js`. It is empty, prompting them to either "Plan a New Trip" or "Join a Trip".

### B. The Generative Travel Planner Journey
1. **Constraints Input:** User taps "Plan Trip". On `TripSetupScreen.js`, they input rigid constraints: Destination(s), Start/End Dates, and a Total Group Budget.
2. **AI Preferences Intakes:** Transitioning to `TripPreferencesScreen.js`, the user defines horizontal constraints (Travel Pace: Relaxed/Intense, Vibe: Adventure/Cultural, Dietary Needs).
3. **The Inference Waiting Room:** The user triggers Generation. They are placed in `AIPersonalizedPlanScreen.js`, a highly vital UX moment. The UI plays magical animations while `aiService.js` routes a massive, strict prompt to the Gemini API.
4. **Data Hydration:** The AI streams back a JSON. Behind the scenes, the app catches this, formats it into native Firebase models (Days, Budget categories, Packing items), pushes it to Realtime Database, and flips the user context to "Active Trip".
5. **Dashboard Drop:** The user transitions into the newly generated `HomeScreen.js` Trip Dashboard.

### C. The Real-Time Collaboration Journey
1. **Code Delivery:** A user receives a 6-digit trip code from the Trip Creator.
2. **Join Flow:** From `WelcomeScreen.js`, they tap "Join Trip" (`JoinSelectionScreen.js`).
3. **Identity Resolution:** The app validates the code against the `/sharedTrips` node. If valid, it asks the user: "Are you one of the existing defined travelers on this trip, or are you joining as a new guest?". This maps their Firebase UID to an internal trip identifier.
4. **Syncing:** The user enters the collaborative `TripDashboard`. Because `TravelContext` uses Firebase streaming listeners (`onValue`), if they go to the `PackingScreen` and check off "Toothbrush", the Trip Creator's phone updates in less than 500ms.

### D. The Active Trip Management Loop
Once an active trip exists, the `HomeScreen` becomes the core hub. This screen is highly modal, allowing quick access to distinct micro-applications:
* **The Navigator (`MapScreen`):** Shows a timeline of daily events. Tapping a location queries `transitService.js` and offers a deep-link out to OS-level Google/Apple Maps for driving/walking directions.
* **The Accountant (`ExpenseScreen` / `BudgetScreen`):** Users add receipts. The app tracks the total spent against the initial budgeted constraint input in Step 1. Crucially, the app processes "Split Math" to calculate exactly who owes whom at the end of the trip.
* **The Concierge (`AIChatScreen`):** Instead of a static plan, users can chat with an embedded AI that knows their exact trip context ("We have free time on Day 3, where should we eat near the hotel?").

### E. The End-of-Trip Ecosystem
1. **Completion:** On the final day of the trip, the app provides a prompt (or the user manually triggers) "End Trip".
2. **State Clearing:** `databaseService.js` actively wipes the `currentTrip` data pool from the user's primary database node to prevent state pollution, archiving it under a historical node.
3. **Memory Lane:** The user returns to the `WelcomeScreen`. To view their past trip, they navigate to Profile -> History.
4. **Read-Only Mode:** Clicking a past trip loads the old data into `tripInfo`, but `TravelContext` identifies it as `isCompleted`. The application enters a read-only lock state, preventing new expenses or itinerary changes, preserving the trip as a memory snapshot.
