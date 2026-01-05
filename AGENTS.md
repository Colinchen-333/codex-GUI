# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript UI. Key areas include `components/` (views), `hooks/`, `stores/` (Zustand state), and `lib/` (API/events/theme/utilities).
- `src-tauri/` contains the Rust + Tauri backend. Commands live in `src-tauri/src/commands/`, app server and IPC code in `src-tauri/src/app_server/`, and configuration in `src-tauri/tauri.conf.json`.
- `public/` is for static assets; `src/assets/` is bundled with the app.
- `dist/` and `src-tauri/gen/` are generated outputs.

## Build, Test, and Development Commands
- `npm install`: install Node dependencies (uses `package-lock.json`).
- `npm run dev`: start the Vite web dev server.
- `npm run tauri:dev`: run the desktop app with the Rust backend.
- `npm run build`: type-check (`tsc -b`) and build the web bundle.
- `npm run tauri:build`: create a desktop release build.
- `npm run preview`: serve the production web build locally.
- `npm run lint`: run ESLint on TS/TSX sources.

## Coding Style & Naming Conventions
- Use 2-space indentation, no semicolons, and single quotes in TS/TSX.
- React components and files use PascalCase (e.g., `ChatView.tsx`); hooks use `useX`.
- Rust modules and files are snake_case; keep formatting aligned with rustfmt defaults.
- Keep Tailwind classes readable and prefer small, reusable components.

## Testing Guidelines
- No test runner is configured yet. If you add tests, introduce a script (e.g., `npm run test`) and document the framework and naming pattern (e.g., `*.test.tsx` or `src-tauri/tests/`).

## Commit & Pull Request Guidelines
- Commit messages in this repo are short, imperative, and action-focused (e.g., "Add ...", "Implement ...", "Enhance ...").
- PRs should include a clear description, testing notes (commands run), and screenshots for UI changes; link related issues when applicable.

## Configuration & Security Notes
- Review Tauri permissions and app metadata in `src-tauri/tauri.conf.json` when adding new capabilities.
- Avoid editing generated files under `dist/` and `src-tauri/gen/`.
