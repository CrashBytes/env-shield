# env-shield

TypeScript-first environment variable validation with full type inference. Zero dependencies.

## Install

```bash
npm install env-shield
```

## Usage

```typescript
import { createEnv, s } from 'env-shield'

const env = createEnv({
  schema: {
    DATABASE_URL: s.url(),
    PORT: s.port().default(3000),
    NODE_ENV: s.enum('development', 'staging', 'production'),
    DEBUG: s.boolean().default(false),
    API_KEY: s.string().min(10),
    MAX_RETRIES: s.number().int().min(0).max(10).default(3),
    ADMIN_EMAIL: s.email().optional(),
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
```

## Schema Types

| Builder | Output Type | Description |
|---------|------------|-------------|
| `s.string()` | `string` | Basic string variable |
| `s.number()` | `number` | Parsed number |
| `s.boolean()` | `boolean` | Accepts `true/false/1/0/yes/no/on/off` |
| `s.port()` | `number` | Integer between 1-65535 |
| `s.url()` | `string` | Validated URL format |
| `s.email()` | `string` | Validated email format |
| `s.enum('a', 'b')` | `'a' \| 'b'` | One of the specified values |
| `s.json<T>()` | `T` | Parsed JSON string |

## Modifiers

```typescript
s.string().optional()      // can be missing (type includes undefined)
s.string().default('val')  // fallback value (type excludes undefined)
s.string().min(5)          // min length (or min value for numbers)
s.string().max(100)        // max length (or max value for numbers)
s.string().regex(/pattern/) // regex validation
s.string().url()           // URL format validation
s.string().email()         // email format validation
s.number().int()           // integer validation
s.string().describe('...')  // description for documentation
```

## Error Output

When validation fails, env-shield throws an `EnvValidationError` with all failures:

```
env-shield: 3 environment variables failed validation:

  ✗ DATABASE_URL: Required variable is missing
  ✗ PORT: Expected a number, got "abc" (received: "abc")
  ✗ NODE_ENV: Must be one of: development, staging, production (received: "test")
```

## Custom Source

```typescript
const env = createEnv({
  schema: { ... },
  source: myEnvObject,  // defaults to process.env
})
```

## License

MIT
