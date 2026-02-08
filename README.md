<p align="center">
  <img src="assets/icons/mycollection/png/icon_512.png" alt="TravelWitch Logo" width="120" height="120" style="border-radius: 24px;">
</p>

<h1 align="center">🗺️ TravelWitch</h1>

<p align="center">
  <strong>Your Premium Travel Companion & Budget Tracker</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React%20Native-0.76.9-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React Native">
  <img src="https://img.shields.io/badge/Expo-54.0.0-000020?style=for-the-badge&logo=expo&logoColor=white" alt="Expo">
  <img src="https://img.shields.io/badge/Firebase-10.14-FFCA28?style=for-the-badge&logo=firebase&logoColor=black" alt="Firebase">
  <img src="https://img.shields.io/badge/PWA-Enabled-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA">
</p>

<p align="center">
  <a href="https://routemate-6a885.web.app">🌐 Live Demo</a> •
  <a href="#-features">Features</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-architecture">Architecture</a>
</p>

---

## 📖 About

**TravelWitch** is a feature-rich, cross-platform travel companion application designed to make trip planning effortless and enjoyable. Whether you're traveling solo, with friends, or with family, TravelWitch helps you organize every aspect of your journey — from budgeting and expense tracking to itinerary management and packing lists.

Built with React Native and Expo, TravelWitch works seamlessly across:
- 📱 **iOS** (Native App)
- 🤖 **Android** (Native App)
- 🌐 **Web** (Progressive Web App)

---

## ✨ Features

### 🎯 Trip Management

| Feature | Description |
|---------|-------------|
| **Plan a Trip** | Create new trips with destination, dates, budget, and travel companions |
| **Join a Trip** | Join existing trips using a unique 6-character share code |
| **Trip Types** | Support for Solo, Friends, and Family trip configurations |
| **Trip History** | View past completed trips with full expense summaries |
| **Multi-Trip Support** | Manage multiple trips simultaneously |

### 💰 Budget & Expense Tracking

| Feature | Description |
|---------|-------------|
| **Set Budget** | Define your total trip budget with customizable currency |
| **Track Expenses** | Log expenses with categories, descriptions, and dates |
| **Split Expenses** | Split costs equally or custom among travelers |
| **Category Breakdown** | Visual breakdown by Accommodation, Transport, Food, Activities, Shopping, and Other |
| **Real-time Balance** | See remaining budget and spending percentage at a glance |
| **Multi-Currency** | Support for ₹ INR, $ USD, € EUR, £ GBP, and more |

### 📅 Itinerary Planning

| Feature | Description |
|---------|-------------|
| **Day-by-Day Planning** | Organize activities by day number |
| **Activity Details** | Add time, location, and notes for each activity |
| **Visual Timeline** | Beautiful timeline view of your trip schedule |
| **Quick Actions** | Edit or delete activities with swipe gestures |

### 🎒 Packing Checklist

| Feature | Description |
|---------|-------------|
| **Smart Categories** | Pre-organized categories (Essentials, Clothing, Electronics, etc.) |
| **Custom Items** | Add your own packing items |
| **Progress Tracking** | Visual progress indicator showing packed vs. total items |
| **Check Off Items** | Mark items as packed with satisfying animations |

### 👥 Collaborative Features

| Feature | Description |
|---------|-------------|
| **Share Trip Code** | Generate unique codes to invite travel companions |
| **Real-time Sync** | All travelers see updates instantly via Firebase |
| **Traveler Roles** | Owner/Organizer and Member roles |
| **Family Groups** | Group travelers by family for family trips |

### 🔐 Authentication & Security

| Feature | Description |
|---------|-------------|
| **Google Sign-In** | Quick authentication with Google account |
| **Email/Password** | Traditional email and password authentication |
| **Password Reset** | Secure password recovery via email |
| **Profile Management** | Update display name and profile picture |
| **Account Deletion** | Complete data removal with one tap |

### 🎨 User Experience

| Feature | Description |
|---------|-------------|
| **Dark Theme** | Beautiful dark mode design that's easy on the eyes |
| **Premium Animations** | Smooth transitions and micro-interactions |
| **Responsive Design** | Optimized for phones, tablets, and desktops |
| **Offline Support** | Core features work without internet |
| **PWA Install** | Add to home screen for app-like experience |

---

## 🖼️ Screenshots

<p align="center">
  <i>Coming Soon - App screenshots showcasing the beautiful dark theme interface</i>
</p>

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **Expo CLI** (installed globally)
- **Firebase Project** (for authentication and database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/praneeth132006/TravelWitch.git
   cd TravelWitch
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Authentication (Email/Password and Google)
   - Enable Realtime Database
   - Update `src/config/firebase.js` with your config
   - Place `google-services.json` in the root directory (for Android)

4. **Start the development server**
   ```bash
   # Start Expo development server
   npm start

   # Start for web specifically
   npm run web

   # Start for Android
   npm run android

   # Start for iOS
   npm run ios
   ```

### Building for Production

**Web (PWA):**
```bash
npm run build
```
This command:
1. Exports the web build to `/dist`
2. Runs the PWA patch script to optimize manifest and icons
3. Ready to deploy to Firebase Hosting or any static host

**Deploy to Firebase:**
```bash
firebase deploy
```

---

## 🛠️ Tech Stack

### Core Framework
| Technology | Purpose |
|------------|---------|
| **React Native 0.76** | Cross-platform mobile development |
| **Expo 54** | Development toolchain and runtime |
| **React 18** | UI component library |

### Navigation
| Technology | Purpose |
|------------|---------|
| **React Navigation 7** | Screen navigation and routing |
| **Bottom Tabs** | Main app navigation |
| **Native Stack** | Screen stack management |

### Backend & Database
| Technology | Purpose |
|------------|---------|
| **Firebase Auth** | User authentication |
| **Firebase Realtime Database** | Real-time data sync |
| **Firebase Crashlytics** | Crash reporting (Native) |
| **Firebase Analytics** | Usage analytics |
| **Firebase Hosting** | Web app deployment |

### State Management
| Technology | Purpose |
|------------|---------|
| **React Context** | Global state management |
| **AsyncStorage** | Local data persistence |

### UI/UX
| Technology | Purpose |
|------------|---------|
| **React Native SVG** | Vector graphics and icons |
| **Expo Linear Gradient** | Beautiful gradient backgrounds |
| **Custom Animations** | Animated API for smooth transitions |

---

## 🏗️ Architecture

```
TravelWitch/
├── App.js                    # Root component with providers
├── app.json                  # Expo configuration
├── package.json              # Dependencies and scripts
│
├── src/
│   ├── components/           # Reusable UI components
│   │   ├── DatePickerModal.js
│   │   ├── Icon.js           # Custom icon component
│   │   └── ...
│   │
│   ├── config/
│   │   └── firebase.js       # Firebase initialization
│   │
│   ├── context/              # React Context providers
│   │   ├── AuthContext.js    # Authentication state
│   │   ├── ThemeContext.js   # Theme configuration
│   │   └── TravelContext.js  # Trip data management
│   │
│   ├── navigation/           # Navigation configuration
│   │   ├── MainNavigator.js  # Main tab navigator
│   │   └── ...
│   │
│   ├── screens/              # Application screens
│   │   ├── AuthScreen.js     # Login/Signup
│   │   ├── WelcomeScreen.js  # Trip selection
│   │   ├── HomeScreen.js     # Trip dashboard
│   │   ├── ExpenseScreen.js  # Expense management
│   │   ├── PackingScreen.js  # Packing checklist
│   │   ├── ProfileScreen.js  # User profile
│   │   └── ...
│   │
│   ├── services/             # API and database services
│   │   └── databaseService.js
│   │
│   └── utils/                # Utility functions
│       └── ...
│
├── assets/                   # Images, icons, fonts
│   └── icons/
│
├── scripts/
│   └── patch-pwa.js          # PWA optimization script
│
├── web/                      # Web-specific files
│   ├── index.html            # HTML template
│   └── manifest.json         # PWA manifest
│
└── dist/                     # Production build output
```

---

## 📱 App Workflow

### 1. Authentication Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Launch    │────▶│  Auth Check │────▶│  Logged In? │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                    ┌──────────────────────────┼──────────────────────────┐
                    │ No                       │                      Yes │
                    ▼                          │                          ▼
           ┌─────────────┐                     │                 ┌─────────────┐
           │ Auth Screen │                     │                 │   Welcome   │
           │  (Login/    │                     │                 │   Screen    │
           │  Sign Up)   │                     │                 └─────────────┘
           └─────────────┘                     │
                    │                          │
                    │  Success                 │
                    └──────────────────────────┘
```

### 2. Trip Management Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Welcome   │────▶│ Plan Trip   │────▶│  Setup Trip │
│   Screen    │     │   or Join   │     │   Details   │
└─────────────┘     └─────────────┘     └──────┬──────┘
       │                                       │
       │ Select Existing                       │ Create
       │                                       │
       ▼                                       ▼
┌─────────────┐                        ┌─────────────┐
│    Home     │◀───────────────────────│   Success   │
│  Dashboard  │                        └─────────────┘
└─────────────┘
       │
       │ Navigate
       ▼
┌─────────────────────────────────────────────────────┐
│                    Tab Navigator                     │
├─────────┬─────────┬─────────┬─────────┬─────────────┤
│  Home   │Itinerary│Expenses │ Budget  │   Packing   │
└─────────┴─────────┴─────────┴─────────┴─────────────┘
```

### 3. Expense Tracking Flow
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Expenses   │────▶│ Add Expense │────▶│   Select    │
│   Screen    │     │   Button    │     │  Category   │
└─────────────┘     └─────────────┘     └──────┬──────┘
                                               │
                                               ▼
                                       ┌─────────────┐
                                       │Enter Amount │
                                       │ & Details   │
                                       └──────┬──────┘
                                               │
                    ┌──────────────────────────┴──────────────────────────┐
                    │ Solo Trip                                 Group Trip │
                    ▼                                                      ▼
           ┌─────────────┐                                        ┌─────────────┐
           │    Save     │                                        │Split Options│
           │   Expense   │                                        │(Equal/Custom│
           └─────────────┘                                        └─────────────┘
```

---

## 🎨 Design System

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Background | `#0D0D0D` | Main app background |
| Card | `#1A1A1A` | Card backgrounds |
| Primary | `#FFD2AD` | Accent color, buttons |
| Text | `#FFFFFF` | Primary text |
| Text Muted | `#9CA3AF` | Secondary text |
| Success | `#10B981` | Positive actions |
| Danger | `#EF4444` | Destructive actions |
| Purple | `#8B5CF6` | Accommodation category |
| Blue | `#3B82F6` | Transport category |
| Amber | `#F59E0B` | Food category |
| Pink | `#EC4899` | Shopping category |

### Typography

- **Headers**: Bold, sizes 24-36px
- **Body**: Regular, size 16px
- **Caption**: Muted, size 12-14px

---

## 🔧 Configuration

### Firebase Configuration

Update `src/config/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebasedatabase.app",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

### Environment Variables

For production, consider using environment variables:

```bash
# .env (not committed to git)
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_auth_domain
# ... etc
```

---

## 📦 Scripts

| Command | Description |
|---------|-------------|
| `npm start` | Start Expo development server |
| `npm run web` | Start web development server |
| `npm run android` | Start Android development |
| `npm run ios` | Start iOS development |
| `npm run build` | Build production web bundle |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

## 👨‍💻 Author

**Praneeth**

- GitHub: [@praneeth132006](https://github.com/praneeth132006)

---

## 🙏 Acknowledgments

- [Expo](https://expo.dev) for the amazing development platform
- [Firebase](https://firebase.google.com) for backend services
- [React Navigation](https://reactnavigation.org) for seamless navigation
- All the open-source contributors who made this possible

---

<p align="center">
  Made with ❤️ for travelers everywhere
</p>

<p align="center">
  <a href="https://routemate-6a885.web.app">Try TravelWitch Now →</a>
</p>
