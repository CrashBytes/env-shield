# env-shield

[![npm version](https://img.shields.io/npm/v/@crashbytes/env-shield.svg)](https://www.npmjs.com/package/@crashbytes/env-shield)
[![license](https://img.shields.io/npm/l/@crashbytes/env-shield.svg)](https://github.com/CrashBytes/env-shield/blob/main/LICENSE)

TypeScript-first environment variable validation with full type inference. Zero dependencies.

**npm:** [https://www.npmjs.com/package/@crashbytes/env-shield](https://www.npmjs.com/package/@crashbytes/env-shield)

## Why env-shield?

Environment variables are the backbone of modern application configuration — API keys, database URLs, feature flags, ports, and secrets all flow through `process.env`. Yet most codebases treat them as an afterthought: untyped `process.env.WHATEVER` calls scattered across files, with no validation, no type safety, and no visibility into what's actually required.

This creates real problems:

- **Silent failures in production.** A missing `DATABASE_URL` doesn't crash at startup — it crashes minutes later in a request handler, buried under a confusing stack trace. A typo in `STRIPE_SECRT_KEY` goes unnoticed until a customer can't check out.
- **No type safety.** Every `process.env` access returns `string | undefined`. You're left casting, parsing, and null-checking the same variables everywhere. Your editor can't help you, and refactoring is guesswork.
- **No single source of truth.** Which env vars does your app actually need? What format should they be in? Is `DEBUG` a string or a boolean? Is `PORT` validated? The answers are scattered across dozens of files, `.env.example` files that drift out of sync, and tribal knowledge.
- **Inconsistent parsing.** One file checks `process.env.DEBUG === 'true'`, another checks `process.env.DEBUG === '1'`, a third forgets to check at all. Number parsing is done inline with `parseInt` or `Number()` with inconsistent error handling.

### What env-shield does differently

env-shield solves all of this with a single schema definition:

```typescript
import { createEnv, s } from '@crashbytes/env-shield'

const env = createEnv({
  schema: {
    DATABASE_URL: s.url(),
    PORT: s.port().default(3000),
    NODE_ENV: s.enum('development', 'staging', 'production'),
    DEBUG: s.boolean().default(false),
    API_KEY: s.string().min(10),
  },
})
```

From this one declaration, you get:

1. **Fail-fast validation at startup.** If any variable is missing or malformed, your app crashes immediately with a clear, actionable error message — not five minutes later in an unrelated code path.
2. **Full TypeScript inference.** `env.PORT` is `number`, not `string | undefined`. `env.NODE_ENV` is `'development' | 'staging' | 'production'`, not `string`. No manual type declarations, no casting. Your editor autocompletes everything.
3. **A single source of truth.** One file defines every environment variable your app needs, its type, its constraints, and whether it's required or optional. New team members can read this file and understand the entire configuration surface.
4. **Consistent parsing and coercion.** Booleans accept `true/false/1/0/yes/no/on/off`. Numbers are parsed and validated. Ports are range-checked. URLs and emails are format-validated. All of this happens once, at startup, in one place.

### How it compares

| Feature | `process.env` | envalid | t3-env | **env-shield** |
|---|---|---|---|---|
| Type inference | No | Partial | Yes | **Yes** |
| Runtime validation | No | Yes | Yes | **Yes** |
| Zero dependencies | N/A | No | No (zod) | **Yes** |
| Framework agnostic | Yes | Yes | No (Next.js) | **Yes** |
| Actively maintained | N/A | Stale | Yes | **Yes** |
| Bundle size | 0 | ~15 KB | ~60 KB+ | **~8 KB** |
| Fail-fast errors | No | Yes | Yes | **Yes** |
| Built-in validators | No | Limited | Via zod | **Yes** |

env-shield gives you the type safety of t3-env and the validation of envalid, without locking you into a framework or pulling in heavy dependencies. It works everywhere — Next.js, Express, Fastify, AWS Lambda, CLI tools, or any Node.js application.

## Install

```bash
npm install @crashbytes/env-shield
```

## Quick Start

```typescript
import { createEnv, s } from '@crashbytes/env-shield'

const env = createEnv({
  schema: {
    DATABASE_URL: s.url(),
    PORT: s.port().default(3000),
    NODE_ENV: s.enum('development', 'staging', 'production'),
    DEBUG: s.boolean().default(false),
    API_KEY: s.string().min(10),
    MAX_RETRIES: s.number().int().min(0).max(10).default(3),
    ADMIN_EMAIL: s.email().optional(),
    FEATURE_FLAGS: s.json<{ darkMode: boolean }>(),
  },
})

// Full type inference - no manual typing needed
env.DATABASE_URL  // string
env.PORT          // number
env.NODE_ENV      // 'development' | 'staging' | 'production'
env.DEBUG         // boolean
env.API_KEY       // string
env.MAX_RETRIES   // number
env.ADMIN_EMAIL   // string | undefined
env.FEATURE_FLAGS // { darkMode: boolean }
```

## Schema Types

| Builder | Output Type | Description |
|---------|------------|-------------|
| `s.string()` | `string` | Basic string variable |
| `s.number()` | `number` | Parsed number (integers and floats) |
| `s.boolean()` | `boolean` | Accepts `true/false/1/0/yes/no/on/off` (case-insensitive) |
| `s.port()` | `number` | Integer between 1 and 65535 |
| `s.url()` | `string` | Validated URL format |
| `s.email()` | `string` | Validated email format |
| `s.enum('a', 'b')` | `'a' \| 'b'` | Must be one of the specified values |
| `s.json<T>()` | `T` | Parsed JSON string |

## Modifiers

All schema types support the following chainable modifiers:

```typescript
// Optionality
s.string().optional()       // value can be missing (type includes undefined)
s.string().default('val')   // fallback value when missing (type excludes undefined)

// String validators
s.string().min(5)           // minimum length
s.string().max(100)         // maximum length
s.string().regex(/^sk-/)    // regex pattern match
s.string().url()            // URL format validation
s.string().email()          // email format validation

// Number validators
s.number().min(0)           // minimum value
s.number().max(1000)        // maximum value
s.number().int()            // must be an integer

// Documentation
s.string().describe('The primary database connection string')
```

Modifiers can be chained in any order:

```typescript
s.number().int().min(1).max(100).default(10)
s.string().min(10).regex(/^sk-/).describe('Stripe secret key')
```

## Error Output

When validation fails, env-shield collects **all** errors and throws a single `EnvValidationError` with a clear, actionable message:

```
env-shield: 3 environment variables failed validation:

  ✗ DATABASE_URL: Required variable is missing
  ✗ PORT: Expected a number, got "abc" (received: "abc")
  ✗ NODE_ENV: Must be one of: development, staging, production (received: "test")
```

No more chasing down one error at a time. Fix everything in a single pass.

### Catching errors programmatically

```typescript
import { createEnv, s, EnvValidationError } from '@crashbytes/env-shield'

try {
  const env = createEnv({ schema: { ... } })
} catch (err) {
  if (err instanceof EnvValidationError) {
    console.error(err.errors) // Array of { key, message, value? }
    process.exit(1)
  }
}
```

## Custom Source

By default, env-shield reads from `process.env`. You can provide any object as the source:

```typescript
// Read from a custom object (useful for testing)
const env = createEnv({
  schema: {
    API_KEY: s.string(),
    DEBUG: s.boolean().default(false),
  },
  source: {
    API_KEY: 'test-key-1234567890',
    DEBUG: 'true',
  },
})
```

## Real-World Examples

### Express / Fastify API

```typescript
// src/config.ts
import { createEnv, s } from '@crashbytes/env-shield'

export const env = createEnv({
  schema: {
    PORT: s.port().default(3000),
    HOST: s.string().default('0.0.0.0'),
    NODE_ENV: s.enum('development', 'staging', 'production'),
    DATABASE_URL: s.url(),
    REDIS_URL: s.url().optional(),
    JWT_SECRET: s.string().min(32),
    CORS_ORIGIN: s.url().default('http://localhost:3000'),
    LOG_LEVEL: s.enum('debug', 'info', 'warn', 'error').default('info'),
  },
})
```

### Next.js

```typescript
// src/env.ts
import { createEnv, s } from '@crashbytes/env-shield'

export const env = createEnv({
  schema: {
    DATABASE_URL: s.url(),
    NEXTAUTH_SECRET: s.string().min(32),
    NEXTAUTH_URL: s.url(),
    STRIPE_SECRET_KEY: s.string().regex(/^sk_/),
    STRIPE_WEBHOOK_SECRET: s.string().regex(/^whsec_/),
    NEXT_PUBLIC_APP_URL: s.url(),
  },
})
```

### AWS Lambda

```typescript
import { createEnv, s } from '@crashbytes/env-shield'

const env = createEnv({
  schema: {
    TABLE_NAME: s.string(),
    BUCKET_NAME: s.string(),
    SQS_QUEUE_URL: s.url(),
    REGION: s.string().default('us-east-1'),
    LOG_LEVEL: s.enum('debug', 'info', 'warn', 'error').default('info'),
  },
})
```

## License

MIT

