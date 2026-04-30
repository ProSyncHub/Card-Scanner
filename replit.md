# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Prosync Vault — an AI-powered business card scanning and management system.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: MongoDB (via Mongoose) for card data; PostgreSQL available via Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI GPT-4o-mini for business card OCR and data extraction
- **Image hosting**: Cloudinary (upload preset: `business_cards`)
- **QR scanning**: jsQR (local, client-side)
- **Excel export**: xlsx

## Artifacts

- `artifacts/prosync-vault` — React + Vite frontend (previewPath: `/`)
- `artifacts/api-server` — Express backend (previewPath: `/api`)
- `artifacts/mockup-sandbox` — Design mockup sandbox

## Key Features

- Password-protected login (cookie-based auth, `vault_auth` cookie)
- Business card scanning: upload front/back images → Cloudinary → AI extraction via OpenAI GPT-4o-mini → saved to MongoDB
- QR code scanning (client-side via jsQR)
- Card vault: search, filter by category, flip cards front/back
- Delete cards with confirmation
- Export all cards to Excel (.xlsx)
- `/scan` page for scanning new cards, `/` for the vault

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Required Secrets

- `MONGODB_URI` — MongoDB connection string
- `OPENAI_API_KEY` — OpenAI API key for card extraction
- `INTERNAL_ADMIN_PASSWORD` — vault login password
- `VITE_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name (upload preset: `business_cards`)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
