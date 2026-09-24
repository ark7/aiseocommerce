# CLAUDE.md

Guidance for Claude Code when working in this repository (`ai-seo-ecommerce-saas`).

## Project Overview
Multi-tenant E-Commerce SaaS built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL. Features store tenant isolation, inventory/stock tracking, manual & gateway payment flows, financial ledger/petty cash management, and audit logging.

## Commands

### Development
- `npm run dev` - Start Next.js development server
- `npm run build` - Build production bundle (`next build`)
- `npm run start` - Start production server (`next start`)
- `npm run lint` - Run ESLint (`next lint`)

### Database (Prisma)
- `npm run db:generate` - Generate Prisma Client (`prisma generate`)
- `npm run db:push` - Push schema state directly to database (`prisma db push`)
- `npm run db:migrate` - Run database migrations (`prisma migrate dev`)
- `npm run db:seed` - Seed database with sample data (`ts-node prisma/seed.ts`)
- `npm run db:studio` - Open Prisma Studio GUI (`prisma studio`)

### Testing (Jest)
- `npm test` - Run Jest test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run test suite with coverage report

## Architecture & Directory Structure

- `app/` - Next.js App Router
  - `app/[storeDomain]/` - Multi-tenant store public storefront
  - `app/admin/` - Store owner / admin dashboard
  - `app/api/` - REST API routes (`orders`, `checkout`, `payments`, `products`, `auth`, `admin`, etc.)
- `components/` - React UI components (`CartPage.tsx`, `AddToCartButton.tsx`, `admin/`)
- `services/` - Business logic & domain services
  - `transactionService.ts` - Order processing, inventory reservation, financial ledger, petty cash
  - `auditService.ts` - Centralized audit logging
- `lib/` - Infrastructure & core helpers (`prisma.ts`, `auth.ts`, `logger.ts`, `ip.ts`, `seo.ts`)
- `prisma/` - Database schema (`schema.prisma`) and seed logic (`seed.ts`)
- `__tests__/` - Unit and integration tests using Jest

## Key Architectural & Coding Guidelines

- **Immutability:** Always prefer returning new objects over mutating existing state.
- **Tenant Isolation:** Filter all store data operations by `storeId` or `storeDomain`.
- **Validation:** Use Zod schemas at system boundaries (API inputs, deep link params).
- **Error Handling:** Explicit error handling with structured responses and audit logging.
- **Logging:** No `console.log` in production code; use `@/lib/logger` instead.
- **Database Transactions:** Use `prisma.$transaction` for multi-step stock reservation and order/ledger processing.
