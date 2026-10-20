# Issue #44: fix(security): resolve ghost-closed and auto-dismissed CVEs in transitive dependencies (handlebars, nanoid, fast-uri, brace-expansion, js-yaml)

- **Issue URL**: [GitHub Issue #44](https://github.com/Inkesk-Dozing/LeetLogger/issues/44)
- **Status**: Open
- **Milestone**: `v1.0.0 - Production Readiness & Release Distribution`
- **Labels**: `type: security`, `dependencies`, `type: bug`, `area: core`

---

## Executive Summary

During an end-to-end security audit of Dependabot alerts on `Inkesk-Dozing/LeetLogger`, an in-depth inspection of `package-lock.json` and the physical `node_modules/` filesystem uncovered that multiple alerts marked on GitHub as **"FIXED"** or **"AUTO_DISMISSED"** are **actively installed and unresolved** in the repository.

GitHub's internal alert state machine marked these alerts closed/auto-dismissed following historical PR closures or heuristic dependency re-evaluations; however, because the root branch never merged lockfile adjustments targeting these nested transitive sub-dependencies, the vulnerable code remains directly embedded in the active dependency tree.

---

## Affected Packages & Verified Vulnerabilities

| Alert # | Package | Status on GitHub | Severity | Installed Version | Vulnerable Range | Patched Version | GHSA ID | CVE ID | Description |
|:---:|:---|:---:|:---:|:---:|:---:|:---:|:---|:---|:---|
| **#11** | `handlebars` | Fixed ⚠️ | Medium | `4.7.9` | `>= 4.0.0, <= 4.7.9` | `4.7.10` | [GHSA-xw65-4hp5-5hc7](https://github.com/advisories/GHSA-xw65-4hp5-5hc7) | CVE-2026-106444 | JS Injection via Unsafe Inline Embedding |
| **#12** | `handlebars` | Fixed ⚠️ | Critical | `4.7.9` | `>= 4.0.0, <= 4.7.9` | `4.7.10` | [GHSA-8r5x-fm3f-whwj](https://github.com/advisories/GHSA-8r5x-fm3f-whwj) | CVE-2026-106446 | AST Type Confusion Remote Code Execution |
| **#24** | `handlebars` | Fixed ⚠️ | Critical | `4.7.9` | `>= 3.0.0, <= 4.7.9` | `4.7.10` | [GHSA-p8wg-vrv2-v86f](https://github.com/advisories/GHSA-p8wg-vrv2-v86f) | CVE-2026-106445 | JS Injection via Own Property Check Bypass |
| **#4** | `nanoid` | Auto-Dismissed ⚠️ | High | `3.3.16` | `< 3.3.18` | `3.3.18` | [GHSA-2v37-7h3g-55p8](https://github.com/advisories/GHSA-2v37-7h3g-55p8) | CVE-2026-67213 | Custom generators infinite loop DoS |
| **#19** | `fast-uri` | Auto-Dismissed ⚠️ | Medium | `3.1.5` | `>= 3.0.0, < 3.1.8` | `3.1.8` | [GHSA-hrr3-gc8f-f4qj](https://github.com/advisories/GHSA-hrr3-gc8f-f4qj) | CVE-2026-86472 | Host case normalization SSRF / Bypass |
| **#5-#8**| `fast-uri` | Fixed ⚠️ | High | `3.1.5` | `>= 3.0.0, < 3.1.6` | `3.1.6` | [GHSA-5jgf-p345-68v8](https://github.com/advisories/GHSA-5jgf-p345-68v8) | CVE-2026-75931 | SSRF & host confusion vulnerabilities |
| **#14** | `brace-expansion` | Fixed ⚠️ | High | `1.1.18` | `< 1.1.19` | `1.1.19` | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | CVE-2026-102276 | DoS uncontrolled recursion stack exhaustion |
| **#16** | `brace-expansion` | Fixed ⚠️ | High | `1.1.18` | `< 1.1.20` | `1.1.20` | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | CVE-2026-102278 | DoS nested brace groups stack exhaustion |
| **#18** | `brace-expansion` | Fixed ⚠️ | Medium | `1.1.18` | `< 1.1.21` | `1.1.21` | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | CVE-2026-102277 | Quadratic CPU denial of service |
| **#13** | `brace-expansion` | Fixed ⚠️ | High | `2.1.4` | `< 2.1.5` | `2.1.5` | [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | CVE-2026-102276 | DoS uncontrolled recursion stack exhaustion |
| **#15** | `brace-expansion` | Fixed ⚠️ | High | `2.1.4` | `< 2.1.6` | `2.1.6` | [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | CVE-2026-102278 | DoS nested brace groups stack exhaustion |
| **#17** | `brace-expansion` | Fixed ⚠️ | Medium | `2.1.4` | `< 2.1.7` | `2.1.7` | [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | CVE-2026-102277 | Quadratic CPU denial of service |
| **#10** | `js-yaml` | Fixed ⚠️ | High | `3.15.1` | `< 3.15.2` | `3.15.2` | [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | CVE-2026-84375 | CPU DoS on empty merge sources |

---

## Verification Proof (Dependency Tree Inspection)

Physical validation via `npm ls` directly proves these vulnerable transitive versions are present in the active build environment:

1. **`handlebars@4.7.9`** (Alerts #11, #12, #24):
   ```text
   leetlogger@1.0.0
   `-- ts-jest@29.4.12
     `-- handlebars@4.7.9
   ```

2. **`nanoid@3.3.16`** (Alert #4):
   ```text
   leetlogger@1.0.0
   `-- css-loader@7.1.4
     `-- postcss@8.5.25
       `-- nanoid@3.3.16
   ```

3. **`fast-uri@3.1.5`** (Alerts #5, #6, #7, #8, #19):
   ```text
   leetlogger@1.0.0
   `-- copy-webpack-plugin@14.0.0
     `-- schema-utils@4.3.3
       `-- ajv@8.20.0
         `-- fast-uri@3.1.5
   ```

4. **`brace-expansion@1.1.18` & `2.1.4`** (Alerts #13 - #18):
   ```text
   leetlogger@1.0.0
   +-- @typescript-eslint/parser@7.18.0 -> minimatch@9.0.9 -> brace-expansion@2.1.4
   +-- eslint@8.57.1 -> minimatch@3.1.5 -> brace-expansion@1.1.18
   `-- jest@29.7.0 -> glob@7.2.3 -> minimatch@3.1.5 -> brace-expansion@1.1.18
   ```

5. **`js-yaml@3.15.1`** (Alert #10):
   ```text
   leetlogger@1.0.0
   `-- ts-jest@29.4.12 -> babel-plugin-istanbul@6.1.1 -> @istanbuljs/load-nyc-config@1.1.0 -> js-yaml@3.15.1
   ```

---

## Remediation Strategy

1. **Declare Package Overrides in `package.json`**:
   Leverage npm's native `overrides` field to deterministically force transitive packages to non-vulnerable versions without requiring invasive updates to top-level dependencies:
   ```json
   "overrides": {
     "handlebars": "^4.7.10",
     "nanoid": "^3.3.18",
     "fast-uri": "^3.1.8",
     "brace-expansion": "^1.1.21",
     "js-yaml": "^3.15.2"
   }
   ```
2. **Re-generate Lockfile Integrity**:
   Execute `npm install` to update `package-lock.json` cleanly.
3. **Validate Compilation and Unit Tests**:
   Execute `npm run build` and `npm test` (`jest --runInBand`) to guarantee 100% backward compatibility and test stability.

---

## Acceptance Criteria

- [ ] `handlebars` is pinned to `>= 4.7.10` in `package-lock.json`.
- [ ] `nanoid` is pinned to `>= 3.3.18` in `package-lock.json`.
- [ ] `fast-uri` is pinned to `>= 3.1.8` in `package-lock.json`.
- [ ] `brace-expansion` 1.x is `>= 1.1.21` and 2.x is `>= 2.1.7` in `package-lock.json`.
- [ ] `js-yaml` 3.x is `>= 3.15.2` in `package-lock.json`.
- [ ] `npm test` passes cleanly (19/19 test suites passing).
- [ ] `npm run build` generates clean production bundles without warnings or errors.
- [ ] Zero external runtime server or paid proxy dependencies introduced.
