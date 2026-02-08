import { describe, it, expect } from 'vitest'
import { createEnv } from '../src/create-env'
import { s } from '../src/schema'
import { EnvValidationError } from '../src/errors'

describe('createEnv', () => {
  it('validates and returns typed env object', () => {
    const env = createEnv({
      schema: {
        PORT: s.port().default(3000),
        HOST: s.string().default('localhost'),
        DEBUG: s.boolean().default(false),
      },
      source: {
        PORT: '8080',
        HOST: 'example.com',
        DEBUG: 'true',
      },
    })

    expect(env.PORT).toBe(8080)
    expect(env.HOST).toBe('example.com')
    expect(env.DEBUG).toBe(true)
  })

  it('uses defaults for missing values', () => {
    const env = createEnv({
      schema: {
        PORT: s.port().default(3000),
        HOST: s.string().default('localhost'),
      },
      source: {},
    })

    expect(env.PORT).toBe(3000)
    expect(env.HOST).toBe('localhost')
  })

  it('throws EnvValidationError for invalid values', () => {
    expect(() => {
      createEnv({
        schema: {
          PORT: s.port(),
          DATABASE_URL: s.string(),
        },
        source: {
          PORT: 'not-a-number',
        },
      })
    }).toThrow(EnvValidationError)
  })

  it('collects all errors before throwing', () => {
    try {
      createEnv({
        schema: {
          PORT: s.port(),
          DATABASE_URL: s.string(),
          API_KEY: s.string(),
        },
        source: {},
      })
      expect.fail('Should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(EnvValidationError)
      const validationError = err as EnvValidationError
      expect(validationError.errors).toHaveLength(3)
    }
  })

  it('returns a frozen object', () => {
    const env = createEnv({
      schema: {
        HOST: s.string().default('localhost'),
      },
      source: {},
    })

    expect(Object.isFrozen(env)).toBe(true)
  })

  it('handles optional values', () => {
    const env = createEnv({
      schema: {
        OPTIONAL_VAR: s.string().optional(),
        REQUIRED_VAR: s.string(),
      },
      source: {
        REQUIRED_VAR: 'present',
      },
    })

    expect(env.OPTIONAL_VAR).toBeUndefined()
    expect(env.REQUIRED_VAR).toBe('present')
  })

  it('validates enum values', () => {
    const env = createEnv({
      schema: {
        NODE_ENV: s.enum('development', 'staging', 'production'),
      },
      source: {
        NODE_ENV: 'production',
      },
    })

    expect(env.NODE_ENV).toBe('production')
  })

  it('error message is descriptive', () => {
    try {
      createEnv({
        schema: {
          PORT: s.port(),
          NODE_ENV: s.enum('dev', 'prod'),
        },
        source: {
          PORT: 'abc',
          NODE_ENV: 'test',
        },
      })
      expect.fail('Should have thrown')
    } catch (err) {
      const message = (err as Error).message
      expect(message).toContain('PORT')
      expect(message).toContain('NODE_ENV')
      expect(message).toContain('env-shield')
    }
  })

  it('uses process.env by default when source not provided', () => {
    const original = process.env.TEST_ENV_SHIELD_VAR
    process.env.TEST_ENV_SHIELD_VAR = 'from-process-env'

    try {
      const env = createEnv({
        schema: {
          TEST_ENV_SHIELD_VAR: s.string(),
        },
      })

      expect(env.TEST_ENV_SHIELD_VAR).toBe('from-process-env')
    } finally {
      if (original === undefined) {
        delete process.env.TEST_ENV_SHIELD_VAR
      } else {
        process.env.TEST_ENV_SHIELD_VAR = original
      }
    }
  })

  it('parses JSON values', () => {
    const env = createEnv({
      schema: {
        CONFIG: s.json<{ retries: number }>(),
      },
      source: {
        CONFIG: '{"retries": 3}',
      },
    })

    expect(env.CONFIG).toEqual({ retries: 3 })
  })

  it('handles complex schemas', () => {
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
      source: {
        DATABASE_URL: 'https://db.example.com',
        NODE_ENV: 'production',
        API_KEY: 'sk-1234567890',
      },
    })

    expect(env.DATABASE_URL).toBe('https://db.example.com')
    expect(env.PORT).toBe(3000)
    expect(env.NODE_ENV).toBe('production')
    expect(env.DEBUG).toBe(false)
    expect(env.API_KEY).toBe('sk-1234567890')
    expect(env.MAX_RETRIES).toBe(3)
    expect(env.ADMIN_EMAIL).toBeUndefined()
  })

  it('error includes received values', () => {
    try {
      createEnv({
        schema: {
          PORT: s.port(),
        },
        source: {
          PORT: 'abc',
        },
      })
      expect.fail('Should have thrown')
    } catch (err) {
      const message = (err as Error).message
      expect(message).toContain('abc')
    }
  })
})
