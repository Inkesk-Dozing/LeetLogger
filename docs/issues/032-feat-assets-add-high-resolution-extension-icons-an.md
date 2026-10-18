# Issue #32: feat(assets): Add High-Resolution Extension Icons and Branding Assets

- **State**: `OPEN`
- **Labels**: `type: feature`, `area: assets`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/32`

---

### Problem Statement

Chrome Web Store guidelines and Chrome Manifest V3 specifications require dedicated multi-resolution icon assets (16x16, 32x32, 48x48, 128x128) for toolbar display, favicon usage, and extension management pages. The asset files exist in local directories but have not been tracked in the repository.

### Proposed Solution

Track and organize the complete visual branding suite:
- Standard multi-resolution extension PNG icons (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`).
- Browser favicon (`favicon.ico`).
- Master vector branding asset (`logo.svg`) and high-resolution raster branding (`logo.png`).
- Maintained in both root `assets/` and `src/assets/` to ensure bundling by Webpack's `CopyPlugin` into the `dist/` distribution build.

### Files Involved
- `assets/favicon.ico`
- `assets/icon16.png`, `assets/icon32.png`, `assets/icon48.png`, `assets/icon128.png`
- `assets/logo.png`, `assets/logo.svg`
- `src/assets/favicon.ico`
- `src/assets/icon16.png`, `src/assets/icon32.png`, `src/assets/icon48.png`, `src/assets/icon128.png`
- `src/assets/logo.png`, `src/assets/logo.svg`

### Acceptance Criteria
- [x] All icon resolutions match Manifest V3 action and icons definitions in `src/manifest.json`.
- [x] Webpack build copies `src/assets` to `dist/assets` successfully without errors.
- [x] Clean vector SVG renders crisply across light and dark backgrounds.

