Deploy the latest version of the Chinese Vocabulary Training app to Firebase (frontend on Firebase Hosting, backend on Cloud Functions), using Neon as the database.

Steps:
1. Run `npm run deploy-firebase` from the project root. This builds the React frontend and deploys both hosting and functions in one step.
2. The Firebase Functions env vars are read automatically from `.env.chinese-vocabulary-train-1a187` (already configured for Neon + demo mode).
3. Verify the deployment succeeded by checking the Firebase Hosting URL: https://chinese-vocabulary-train-1a187.web.app
4. Report the deployed version (from `package.json`) and the live URL.
