# Contributing to LeetLogger

Thank you for considering contributing to LeetLogger! We welcome contributions from the community.

## Development Setup

1. **Clone Repository**:
   ```bash
   git clone https://github.com/Inkesk-Dozing/LeetLogger.git
   cd LeetLogger
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Build in Watch Mode**:
   ```bash
   npm run dev
   ```

4. **Load Unpacked Extension in Chrome**:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked"
   - Select the `LeetLogger/dist` directory

## Code Quality Standards

- **TypeScript**: All source files must be written in TypeScript (`.ts` / `.tsx`) with strict type checking enabled.
- **Conventional Commits**: Commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) format:
  - `feat:` New feature
  - `fix:` Bug fix
  - `docs:` Documentation changes
  - `chore:` Build, dependencies, or configuration changes
  - `refactor:` Code change that neither fixes a bug nor adds a feature
  - `test:` Adding or updating unit tests

## Pull Request Checklist

- [ ] All code compiles without errors (`npm run build`).
- [ ] All unit tests pass (`npm test`).
- [ ] ESLint / Prettier checks pass (`npm run lint`).
- [ ] Architecture or API changes are documented in `/docs`.
