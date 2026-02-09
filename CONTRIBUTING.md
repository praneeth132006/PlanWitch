# Contributing to TravelWitch

First off, thank you for considering contributing to TravelWitch! It's people like you who make travel planning better for everyone.

This guide will help you get started with the development environment and explain our workflow.

## 🚀 Getting Started

### Prerequisites
*   **Node.js**: Version 18.x or later.
*   **npm**: Included with Node.js.
*   **Expo CLI**: We recommend using `npx expo` to avoid global installation issues.
*   **Git**: For version control.

### Setup Instructions

1.  **Fork and Clone**:
    ```bash
    git clone https://github.com/your-username/TravelWitch.git
    cd TravelWitch
    ```

2.  **Install Dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    Copy the example environment file and fill in your keys:
    ```bash
    cp .env.example .env
    ```
    You will need:
    *   `EXPO_PUBLIC_GEMINI_API_KEY`: Get this from [AI Studio](https://aistudio.google.com/).
    *   `EXPO_PUBLIC_FIREBASE_CONFIG`: Standard Firebase Web configuration keys.

4.  **Launch Development Server**:
    ```bash
    # To start the Expo dashboard
    npx expo start

    # To run specifically for Web
    npm run web
    ```

## 🛠️ Development Workflow

1.  **Create a Branch**: Always create a feature branch from `main`.
    ```bash
    git checkout -b feature/your-feature-name
    ```
2.  **Commit Often**: Keep commits small and descriptive. We follow [Conventional Commits](https://www.conventionalcommits.org/).
    *   `feat:` for new features.
    *   `fix:` for bug fixes.
    *   `docs:` for documentation changes.
3.  **Test Your Changes**: Since we currently rely on manual verification:
    *   Ensure the app builds without errors (`npm run web`).
    *   Verify your feature works on both dark and light themes.
    *   If changing shared trip logic, test with two browser windows to verify real-time sync.
4.  **Submit a PR**: Push your branch and open a Pull Request against the `main` branch.

## 🎨 Coding Standards

*   **Components**: Use functional components with hooks.
*   **Styling**: Use the `useTheme` hook to access global colors. Avoid hardcoding hex codes.
    ```javascript
    const { colors } = useTheme();
    // ...
    const styles = StyleSheet.create({
      container: { backgroundColor: colors.bg }
    });
    ```
*   **State Management**: Use `useTravelContext` for trip-related data and `useAuth` for user status.
*   **Services**: Place API and logic-heavy functions in `src/services/`.
*   **Linting**: Ensure your code is clean and follows standard JS formatting (Prettier is recommended).

## 🧪 Testing Guidelines

Currently, we perform manual sanity checks:
1.  **UI Consistency**: Check responsiveness on small (mobile) and large (desktop) screens.
2.  **Real-time Sync**: Ensure that updating an item in one session reflects in another without a manual refresh.
3.  **AI Fallback**: If testing AI features, ensure the "Prompt Copy" fallback works if the API call fails or is missing a key.

## 📜 Code of Conduct

Please be respectful and collaborative. We aim to foster an inclusive community for all contributors.

---

Questions? Feel free to reach out to [Praneeth](https://github.com/praneeth132006).
