# PlanWitch Core Workflow Diagrams

This document provides high-detail technical and process diagrams for the core features of the PlanWitch application.

---

## 1. AI Trip Planning Lifecycle
This workflow describes the journey from user input to a fully realized, geographically optimized itinerary.

```mermaid
graph TD
    A[User Inputs] -->|Destination, Dates, Budget, Split| B(HomeScreen: AI Command Center)
    B -->|Trigger| C{TravelContext: generateTrip}
    C -->|API Call| D[aiService: generateTripItinerary]
    D -->|Step 1| E[Prompt Engineering: System Rules]
    E -->|Rule 2 Enforcement| F[Inject Missing Transit Items]
    F -->|Raw JSON| G{JSON Validation}
    G -->|Truncated?| H[Adaptive JSON Recovery Logic]
    H -->|Repaired JSON| I[Itinerary Parser]
    G -->|Valid| I
    I -->|Store| J[(Firestore: Trip Collection)]
    J -->|Sync| K[Dashboard: Itinerary View]
    K -->|Interaction| L[MapScreen: Route Visualization]
```

---

## 2. Automated Budgeting & Expense Engine
This workflow covers how PlanWitch manages finances, from initial planning to real-time expense tracking.

```mermaid
graph TD
    A[User Sets Total Budget] --> B{BudgetScreen: Auto-Allocation}
    B -->|One-Tap Fix| C[Template: Destination-based %]
    C -->|Calculation| D[Distribute to: Stay, Food, Transport]
    D -->|Delta Check| E{Is Sum > Total?}
    E -->|Yes| F[Alert: Over Budget]
    E -->|No| G[Finalize Allocation]
    
    G --> H[Expense Tracking]
    H -->|Add Item| I[Select Payer & Split Type]
    I -->|Equal/Percentage| J{Real-time Sync}
    J -->|Update| K[(Firebase RTDB: Expenses)]
    K -->|Broadcast| L[All Participants: Budget Stat Cards]
```

---

## 3. Real-time Multi-User Collaboration
How users join trips and stay synchronized across devices.

```mermaid
sequenceDiagram
    participant O as Trip Owner
    participant F as Firebase (Firestore/RTDB)
    participant P as Participant
    
    O->>F: Create Trip & Generate 6-Digit Code
    F-->>O: Return Trip ID & Join Code
    O->>P: Share Join Code (WhatsApp/Social)
    P->>F: Enter Code (JoinSelectionScreen)
    F->>F: Authenticate Code & Fetch Metadata
    F-->>P: Map Participant to Trip ID
    P->>F: Activate Listeners (useTravelContext)
    
    Note over O,P: Multi-User Sync State
    P->>F: Add Packing Item
    F-->>O: Real-time Update (Observer)
    O->>F: Update Budget
    F-->>P: Real-time Update (Observer)
```

---

## 4. Admin & System Health Workflow
The flow of feedback and diagnostic data to the Admin Dashboard.

```mermaid
graph LR
    A[User: Profile Screen] -->|Submit| B[Feedback Modal]
    B -->|Write| C[(Firestore: Feedback Collection)]
    C -->|Listener| D[Admin Dashboard: Feedback Tab]
    D -->|Action: Mark Read| E[Update Status]
    D -->|Action: Reply| F[Open External Mail Bridge]
    
    H -->|Auto-Report| I[Firebase Crashlytics/Perf]
    I -->|Diagnostic View| J[Admin Dash: Diag Tab]
    J -->|Admin Review| K[Root Cause Analysis]
```

---

## 5. Subscription & Premium Feature Gateway
The logic governing access to AI-enabled features and RevenueCat integration.

```mermaid
graph TD
    A[Feature Request] --> B{PremiumContext: isPremium}
    B -->|Yes| C[All-Access: AI Planner, Chat, Ads-Free]
    B -->|No| D{Request: Start Trial/Buy}
    D -->|Interaction| E[SubscriptionScreen: RevenueCat]
    E -->|Success| F[Update Firestore: User Status]
    F -->|Callback| G[Global State: Enable Premium]
    E -->|Failure| H[Stay in Free Tier]
    
    C --> I[AdService: skipAds]
    H --> J[AdService: showInterstitial]
```

---

## 6. Secure OTP Authentication Flow
Workflow for two-factor authentication and SaaS admin access.

```mermaid
sequenceDiagram
    participant U as User/Admin
    participant F as Firebase Auth
    participant G as Google Cloud Function
    participant E as Gmail API
    
    U->>F: Request OTP / Admin Access
    F->>G: Trigger: onCreateOTP
    G->>F: Generate 6-Digit Random Code
    G->>E: Send Email via nodemailer
    E-->>U: Received Verification Code
    U->>F: Input Code
    F->>F: Validate Token
    F-->>U: Sign-in Success (Admin JWT)
```

---

## 7. PWA Deployment & Maintenance Pipeline
How local changes are built, patched for PWA compatibility, and deployed.

```mermaid
graph LR
    A[Local Codebase] -->|npm run build| B[npx expo export:web]
    B --> C{patch-pwa.js}
    C -->|Regex Fix| D[Modify index.html: Viewport/Theme]
    C -->|Manifest| E[Update manifest.json]
    D --> F[Product Dist: /dist]
    F -->|Firebase Deploy| G[Live Hosting: PlanWitch.web.app]
    G --> H[User: Add to Home Screen]
```
