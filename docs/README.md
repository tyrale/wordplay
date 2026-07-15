# Documentation Index

This folder is organized by category so it's clear where to find (or add) information. Each file below has a single-purpose scope — if you're about to add content that overlaps with an existing file's purpose, add it there instead of creating a new doc.

## 📖 guides/ — How to use & develop the project
| File | Purpose |
|------|---------|
| [QUICK_START.md](guides/QUICK_START.md) | Canonical step-by-step setup, running, and dev workflow guide. |
| [GAME_RULES.md](guides/GAME_RULES.md) | Complete gameplay rules and mechanics. |
| [TROUBLESHOOTING.md](guides/TROUBLESHOOTING.md) | Common issues and their fixes. |

## 🏗️ architecture/ — How the system is designed
| File | Purpose |
|------|---------|
| [ARCHITECTURE.md](architecture/ARCHITECTURE.md) | Overall technical design: engine, adapters, dependency injection. |
| [API_REFERENCE.md](architecture/API_REFERENCE.md) | Engine interfaces, functions, and usage examples. |
| [ADR-001-DEPENDENCY-INJECTION.md](architecture/ADR-001-DEPENDENCY-INJECTION.md) | Architecture Decision Record: why dependency injection was adopted. |
| [WEB_UI_DESIGN_SPEC.md](architecture/WEB_UI_DESIGN_SPEC.md) | UI/UX design guidelines and component specs. |

## 🎯 features/ — Feature-specific design docs
| File | Purpose |
|------|---------|
| [CHALLENGE_MODE_PLAN.md](features/CHALLENGE_MODE_PLAN.md) | Design/plan for the step-by-step Challenge Mode. |
| [VANITY_FILTER_SYSTEM.md](features/VANITY_FILTER_SYSTEM.md) | Profanity/vanity filter toggle implementation. |
| [PLATFORM_AGNOSTIC_PROFANITY.md](features/PLATFORM_AGNOSTIC_PROFANITY.md) | Cross-platform profanity detection design. |
| [UNLOCKS.md](features/UNLOCKS.md) | Unlockable feature/content system design. |

## 🚀 deployment/ — Where and how the app ships
| File | Purpose |
|------|---------|
| [DEPLOYMENT.md](deployment/DEPLOYMENT.md) | Current deployment setup (Vercel) — the active target. |
| [MIGRATION_TO_RENDER.md](deployment/MIGRATION_TO_RENDER.md) | Optional future migration guide (Vercel → Render), **not** the current setup. |

## 📋 project/ — Status, history, and planning
| File | Purpose |
|------|---------|
| [PROJECT_STATUS_AUDIT.md](project/PROJECT_STATUS_AUDIT.md) | Most recent full repo audit + ordered cleanup action plan. Start here for current known issues. |
| [TASK_PROGRESS.md](project/TASK_PROGRESS.md) | Living dashboard of current project status/active tasks. |
| [IMPLEMENTATION_HISTORY.md](project/IMPLEMENTATION_HISTORY.md) | Frozen, phase-by-phase historical implementation notes. |
| [CHANGELOG.md](project/CHANGELOG.md) | Keep-a-Changelog style append-only log of notable changes. |
| [dev-plan.md](project/dev-plan.md) | Original roadmap; architectural rules within are still authoritative, phase timeline is not. |
| [TESTING_REPORTS.md](project/TESTING_REPORTS.md) | Test coverage and test-suite health reports. |

---

For the project overview, features, and quick links, see the root [README.md](../README.md).
