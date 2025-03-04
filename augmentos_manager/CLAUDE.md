# AugmentOS Manager Guidelines

## Build and Test Commands
- Start dev server: `npm start`
- Run on Android: `npm run android`
- Run on iOS: `npm run ios`
- Build Android debug: `npm run build-android`
- Build Android release: `npm run build-android-release`
- Run tests: `npm test`
- Run single test: `npm test -- -t "test name"`
- Lint code: `npm run lint`

## Code Style
- TypeScript with React Native and Navigation
- Imports: Group by external/internal, alphabetize within groups
- Formatting: Prettier with single quotes, no bracket spacing, trailing commas
- Components: Use functional components with React hooks
- File structure: Feature-based organization under src/
- Naming: PascalCase for components, camelCase for functions/variables
- Navigation: Stack-based using React Navigation with typed params
- State management: Context API for app-wide state
- Error handling: Try/catch blocks with meaningful error messages

## Working with AugmentOS
- Backend server required: `adb reverse tcp:7002 tcp:7002` for local testing
- Bluetooth functionality for glasses pairing