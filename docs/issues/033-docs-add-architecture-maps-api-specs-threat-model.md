# Issue #33: docs: Add Architecture Maps, API Specs, Threat Model, and Enhanced README

- **State**: `OPEN`
- **Labels**: `type: docs`, `area: core`
- **URL**: `https://github.com/Inkesk-Dozing/LeetLogger/issues/33`

---

### Problem Statement

The repository needs formal architecture documentation, API specifications, component interfaces, security threat models, and an enhanced root `README.md` to establish clear developer onboarding and adhere to professional open-source engineering standards.

### Proposed Solution

Add comprehensive technical documentation across the `/docs` directory hierarchy and upgrade the master `README.md`:

1. **Architecture Overview (`docs/architecture/overview.md`)**:
   - Architectural layout of the 4 decoupled subsystems (Content Ingestion, Service Worker, Core Engine, React UI).
   - Sequence diagrams for real-time submission sync and historical catch-up workflows.

2. **API Specification (`docs/api/github-integration.md`)**:
   - Detailed specification of GitHub REST & Git Data API integration.
   - Low-level Git Data API blob/tree/commit sequence for backdated commits preserving authentic author timestamps.

3. **Component Specs (`docs/components/parsers.md`)**:
   - Standardized `IPlatformParser` interface and `ISubmissionPayload` schemas.
   - Parsing mechanics for LeetCode (GraphQL interceptor + dynamic DOM fallback + problem detail resolution).

4. **Security Threat Model (`docs/security/threat-model.md`)**:
   - Asset protection strategies for GitHub access tokens (PAT/OAuth) in `chrome.storage.local`.
   - Manifest V3 Content Security Policy (CSP) enforcement.

5. **Enhanced Master README (`README.md`)**:
   - Project badges (Build, License, Manifest V3, React 18, TypeScript 5.0).
   - Mermaid architecture flowchart.
   - Quick start installation and local unpacking instructions.
   - Directory hierarchy breakdown.

### Files Involved
- `docs/architecture/overview.md`
- `docs/api/github-integration.md`
- `docs/components/parsers.md`
- `docs/security/threat-model.md`
- `README.md`

### Acceptance Criteria
- [x] All markdown documents use clean, semantic formatting.
- [x] Mermaid diagrams render without syntax errors.
- [x] All relative file and component links resolve correctly.

