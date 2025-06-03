# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Task 0.1**: Initial web project setup with React 19, TypeScript, and Vite ✅ **VERIFIED**
  - Working development server with hot reload (verified on localhost:5173)
  - ESLint and Prettier integration for code quality (verified: 0 errors)
  - TypeScript compilation with strict mode (verified: builds successfully)
  - Production build pipeline (verified: 188KB bundle)
  - Modern development tooling setup (verified: all scripts working)
  - **Testing Framework**: Vitest with React Testing Library (6/6 tests passing)
  - **Verification Commands**: `npm run lint && npm run format:check && npm run build && npm test`

- **Task 0.2**: GitHub Actions CI/CD Pipeline ✅ **VERIFIED**
  - Automated ESLint and testing on push/PR (verified: 0 errors, 6/6 tests pass)
  - Production build automation (verified: 62.1KB artifacts generated)
  - CI execution in 30s with Ubuntu runner (verified: GitHub Actions success)
  - Complete verification pipeline: lint + format + TypeScript + tests + build
  - **Verification Evidence**: GitHub Actions workflow #7 - Status: Success

- **Task 0.3**: Supabase Project Bootstrap with SQL Schema & RLS ✅ **VERIFIED**
  - Supabase client dependencies (@supabase/supabase-js@2.49.9, supabase@2.24.3)
  - Complete SQL schema with 4 tables: users, games, game_players, turns
  - Row Level Security (RLS) with 11 policies across all tables
  - Local Supabase environment running on ports 54321-54324
  - Database migration system with init_game_schema.sql
  - TypeScript client with comprehensive database types
  - Environment configuration (.env.example template, .env.local)
  - **Testing**: Supabase client connection verified (9/9 tests passing)
  - **Verification Commands**: `supabase db diff && npm test && npm run lint && npm run build`
