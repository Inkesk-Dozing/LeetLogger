# Issue #43: chore(deps): patch vulnerable transitive dependencies flagged by Dependabot

- **Issue URL**: [GitHub Issue #43](https://github.com/Inkesk-Dozing/LeetLogger/issues/43)
- **Status**: Open
- **Milestone**: `v1.0.0 - Production Readiness & Release Distribution`
- **Labels**: `dependencies`, `type: chore`, `type: security`

---

## Active Dependabot Vulnerability Report

A security dependency audit identified open Dependabot alerts affecting build and CSS processing toolchains:

| Alert # | Package | Status on GitHub | Severity | Installed Version | Vulnerable Range | Patched Version | GHSA ID | CVE ID | Description |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|:---|:---|
| **#22** | `source-map-js` | Open | High | `1.2.1` | `>= 1.0.0, < 1.2.2` | `1.2.2` | [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | CVE-2026-93749 | Event-loop denial of service via indexed source-map section offsets |
| **#21** | `postcss-selector-parser` | Open | Medium | `7.1.4` | `< 7.1.6` | `7.1.6` | [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | CVE-2026-104844 | Quadratic complexity in flat selector parsing allows CPU exhaustion |
| **#23** | `sprintf-js` | Open | Medium | `1.0.3` | `<= 1.1.3` | `None` (upstream) | [GHSA-hp3w-g68c-fv3c](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | CVE-2026-97058 | Denial of service through unbounded precision specifiers |

- **Dependabot Overview**: https://github.com/Inkesk-Dozing/LeetLogger/security/dependabot

---

## Dependency Trace & Impact Assessment

1. **`source-map-js@1.2.1`** (Alert #22):
   ```text
   leetlogger@1.0.0
   `-- css-loader@7.1.4
     `-- postcss@8.5.25
       `-- source-map-js@1.2.1
   ```
   *Impact*: CSS post-processing during production builds can trigger infinite loop or event-loop blocking on malformed source map offsets.

2. **`postcss-selector-parser@7.1.4`** (Alert #21):
   ```text
   leetlogger@1.0.0
   `-- css-loader@7.1.4
     +-- postcss-modules-local-by-default@4.2.0
     | `-- postcss-selector-parser@7.1.4
     `-- postcss-modules-scope@3.2.1
       `-- postcss-selector-parser@7.1.4
   ```
   *Impact*: Scoped CSS modules compilation can experience CPU denial of service during complex selector parsing.

3. **`sprintf-js@1.0.3`** (Alert #23):
   ```text
   leetlogger@1.0.0
   `-- ts-jest@29.4.12
     `-- @jest/transform@29.7.0
       `-- babel-plugin-istanbul@6.1.1
         `-- @istanbuljs/load-nyc-config@1.1.0
           `-- js-yaml@3.15.1
             `-- argparse@1.0.10
               `-- sprintf-js@1.0.3
   ```
   *Impact*: Confined entirely to test coverage analysis (`babel-plugin-istanbul`). Upstream has no patched release for `<= 1.1.3`. Will be mitigated by upgrading `js-yaml` to `3.15.2` and isolating test execution.

---

## Proposed Solution

1. **Pin Patched Transitive Versions via npm `overrides`**:
   Add overrides in `package.json`:
   ```json
   "overrides": {
     "source-map-js": "^1.2.2",
     "postcss-selector-parser": "^7.1.6"
   }
   ```
2. **Rebuild Dependency Graph**:
   Run `npm install` to update `package-lock.json` with the patched versions.
3. **Verify Build & Test Integrity**:
   - `npm test` (`jest --runInBand`) must pass all suites without regressions.
   - `npm run build` must compile clean bundles in `dist/`.

---

## Acceptance Criteria
- [ ] `source-map-js` is locked to `>= 1.2.2` in `package-lock.json`.
- [ ] `postcss-selector-parser` is locked to `>= 7.1.6` in `package-lock.json`.
- [ ] Dependabot alerts #21 and #22 are resolved on GitHub Security.
- [ ] `npm test` and `npm run build` execute cleanly with zero errors.
