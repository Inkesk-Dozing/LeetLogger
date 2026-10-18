# LeetLogger System Architecture Overview

LeetLogger is an enterprise-grade Chrome Manifest V3 extension engineered to capture, format, and commit LeetCode problem solutions directly to GitHub with zero intermediate servers.

---

## 🏛️ System Decomposition

The system is decomposed into four decoupled, event-driven subsystems:

```mermaid
graph TD
    subgraph BrowserContext["Browser Context (Chrome Tab & Extension Windows)"]
        CS["Content Script (LeetCode Ingestion Engine)"]
        POP["React 18 Popup Dashboard"]
        WEL["React 18 Onboarding Dashboard"]
    end

    subgraph ServiceWorker["Background Service Worker (Manifest V3)"]
        SW["Service Worker Controller"]
        QM["Durable Queue & Storage Manager"]
        HS["Historical Catch-Up Orchestrator"]
        GC["GitHub Git Data API Client"]
    end

    subgraph RemoteEndpoints["Remote Endpoints"]
        LC_API["LeetCode GraphQL Endpoint"]
        GH_API["GitHub REST & Git Data APIs"]
    end

    CS -->|"chrome.runtime.sendMessage(SUBMISSION_EVENT)"| SW
    POP -->|"Query Status & Trigger Sync"| SW
    WEL -->|"Store Config & Repo Selection"| SW
    SW --> QM
    SW --> HS
    HS -->|"Paginated GraphQL AC Queries"| LC_API
    HS -->|"Atomic Batch Tree Commits"| GC
    SW -->|"Single Submission Commit"| GC
    GC -->|"HTTPS REST / Git Tree API"| GH_API
```

---

## 🔄 Sequence Workflows

### 1. Real-Time Submission Sync Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant Tab as LeetCode Tab (DOM / Content Script)
    participant SW as Background Service Worker
    participant Storage as Chrome Storage Local
    participant GitHub as GitHub Git Data API

    User->>Tab: Submits Solution Code
    Tab->>Tab: Observes Submission Verdict (ACCEPTED)
    Tab->>Tab: Extracts Title, Difficulty, Language, Code, Metrics
    Tab->>SW: chrome.runtime.sendMessage(SUBMISSION_EVENT, payload)
    SW->>Storage: Verify Git Configuration & Target Repo
    alt Configured & Online
        SW->>GitHub: Create Blobs (Solution & Problem README)
        SW->>GitHub: Layer Blobs on HEAD Tree
        SW->>GitHub: Create Commit with Authentic Solve Date
        SW->>GitHub: Update Branch Reference
        SW->>Storage: Record Solved Problem Metadata & Sync History
        SW->>Tab: Set Extension Action Badge: OK
    else Offline or Rate Limited
        SW->>Storage: Push Payload into Durable Retry Queue
        SW->>Tab: Set Extension Action Badge: QUEUED
    end
```

### 2. Historical Catch-Up Sync Workflow

```mermaid
sequenceDiagram
    autonumber
    actor User as User
    participant UI as Options / Welcome UI
    participant HS as Historical Sync Orchestrator
    participant LC as LeetCode GraphQL API
    participant GH as GitHub Git Data API
    participant Storage as Chrome Storage Local

    User->>UI: Click "Start Historical Catch-Up Sync"
    UI->>HS: startSync()
    HS->>GH: Scan Existing Repository Tree (getAllTreePaths)
    HS->>LC: Query problemsetQuestionList(status='AC')
    loop Batched Submissions (Concurrency = 4)
        HS->>LC: Fetch Detailed Submissions & Code Payloads
    end
    HS->>HS: Compute Difference: Missing = Submissions - ExistingPaths
    HS->>GH: commitBatchChain(missingSubmissions) with original ISO timestamps
    HS->>Storage: Save Solved Problem Cache & Metadata
    HS->>GH: Generate & Update Repository Root README.md
    HS->>UI: Emit Progress Updates -> Completed
```

---

## 📂 Subsystem Directory Architecture

- **`src/content/`**: Content scripts targeting `https://leetcode.com/*` capturing DOM verdict panels and intercepting GraphQL API responses.
- **`src/platform/leetcode/`**: Dedicated LeetCode DOM parsing, submission data modeling, and paginated GraphQL historical fetcher.
- **`src/core/`**:
  - `git/`: Low-level Git Data API client handling trees, blobs, commits, and atomic chained commit batches.
  - `storage/`: Chrome local storage abstraction and durable FIFO retry queue.
  - `formatters/`: Markdown documentation generator, difficulty badges, and root repository catalog generator.
  - `types/`: Shared TypeScript data contracts and payload interfaces.
- **`src/background/`**: Manifest V3 background service worker, message router, alarms, and historical sync engine.
- **`src/ui/`**: Glassmorphic React 18 user interfaces for quick popup status tracking and repository settings management.
