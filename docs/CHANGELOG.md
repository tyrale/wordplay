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

- **Task 0.4**: Web Hosting Setup with Vercel Deployment ✅ **VERIFIED**
  - Automatic deployment from GitHub main branch integration
  - Live web application accessible at https://wordplay-blond.vercel.app/
  - Production environment variables configured (NODE_ENV=production)
  - Vercel configuration with Vite framework detection
  - Production-ready Supabase client with fallback configuration
  - **Testing**: Build successful (188KB bundle), 10/10 tests passing
  - **Verification Commands**: `npm run build && npm test && vercel deployment`

- **Task 1.1**: Word Validation Service with ENABLE Dictionary ✅ **VERIFIED**
  - ENABLE word list integration (172,819 words loaded from public domain source)
  - Comprehensive word validation with length checks (minimum 3 letters)
  - Character validation (alphabetic only for humans, bots can bypass)
  - Length change validation (max ±1 letter difference between turns)
  - Dictionary lookup integration (rejects unknown words like ZZZZZ)
  - Bot rule-breaking capabilities (bots bypass all validation rules)
  - Case insensitivity handling (hello→HELLO normalization)
  - Profanity filtering with censoring (DAMN→D**N replacement)
  - Performance optimization (average <1ms per validation)
  - **Testing**: 35/35 unit tests passing with comprehensive coverage
  - **Checkpoint Verified**: validateWord('BRUH') === true ✅
  - **Verification Commands**: `npm test && npm run lint && npm run build`
