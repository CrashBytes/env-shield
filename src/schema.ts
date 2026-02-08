import { InternalConfig, SchemaType, Validator } from './types'

export class EnvSchema<T> {
  declare readonly _output: T

  /** @internal */
  readonly _config: InternalConfig

  constructor(config: InternalConfig) {
    this._config = { ...config, validators: [...config.validators] }
  }

  // --- Validator methods (return this for chaining) ---

  min(n: number): this {
    this._config.validators.push({
      name: 'min',
      validate: (_raw, parsed) => {
        if (typeof parsed === 'number' && parsed < n) return `Must be at least ${n}`
        if (typeof parsed === 'string' && parsed.length < n) return `Must be at least ${n} characters`
        return null
      },
    })
    return this
  }

  max(n: number): this {
    this._config.validators.push({
      name: 'max',
      validate: (_raw, parsed) => {
        if (typeof parsed === 'number' && parsed > n) return `Must be at most ${n}`
        if (typeof parsed === 'string' && parsed.length > n) return `Must be at most ${n} characters`
        return null
      },
    })
    return this
  }

  int(): this {
    this._config.validators.push({
      name: 'int',
      validate: (_raw, parsed) => {
        if (typeof parsed === 'number' && !Number.isInteger(parsed)) return 'Must be an integer'
        return null
      },
    })
    return this
  }

  url(): this {
    this._config.validators.push({
      name: 'url',
      validate: (raw) => {
        try {
          new URL(raw)
          return null
        } catch {
          return 'Must be a valid URL'
        }
      },
    })
    return this
  }

  email(): this {
    this._config.validators.push({
      name: 'email',
      validate: (raw) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return 'Must be a valid email address'
        return null
      },
    })
    return this
  }

  regex(pattern: RegExp, message?: string): this {
    this._config.validators.push({
      name: 'regex',
      validate: (raw) => {
        if (!pattern.test(raw)) return message || `Must match pattern ${pattern}`
        return null
      },
    })
    return this
  }

  describe(text: string): this {
    this._config.description = text
    return this
  }

  // --- Type-changing methods (return new instances) ---

  optional(): EnvSchema<T | undefined> {
    return new EnvSchema<T | undefined>({
      ...this._config,
      validators: [...this._config.validators],
      isOptional: true,
    })
  }

  default(value: NonNullable<T>): EnvSchema<NonNullable<T>> {
    return new EnvSchema<NonNullable<T>>({
      ...this._config,
      validators: [...this._config.validators],
      hasDefault: true,
      defaultValue: value,
    })
  }

  // --- Internal parse method ---

  /** @internal */
  _parse(key: string, raw: string | undefined): { value: T; error: string | null } {
    if (raw === undefined || raw === '') {
      if (this._config.hasDefault) {
        return { value: this._config.defaultValue as T, error: null }
      }
      if (this._config.isOptional) {
        return { value: undefined as T, error: null }
      }
      return { value: undefined as T, error: 'Required variable is missing' }
    }

    let parsed: unknown

    switch (this._config.type) {
      case 'string':
      case 'url':
      case 'email':
        parsed = raw
        break

      case 'number':
      case 'port': {
        const num = Number(raw)
        if (isNaN(num)) {
          return { value: undefined as T, error: `Expected a number, got "${raw}"` }
        }
        parsed = num
        break
      }

      case 'boolean': {
        const lower = raw.toLowerCase().trim()
        if (['true', '1', 'yes', 'on'].includes(lower)) {
          parsed = true
        } else if (['false', '0', 'no', 'off'].includes(lower)) {
          parsed = false
        } else {
          return {
            value: undefined as T,
            error: `Expected a boolean (true/false/1/0/yes/no), got "${raw}"`,
          }
        }
        break
      }

      case 'enum': {
        const values = this._config.enumValues || []
        if (!values.includes(raw)) {
          return { value: undefined as T, error: `Must be one of: ${values.join(', ')}` }
        }
        parsed = raw
        break
      }

      case 'json': {
        try {
          parsed = JSON.parse(raw)
        } catch {
          return { value: undefined as T, error: `Invalid JSON: "${raw}"` }
        }
        break
      }
    }

    for (const validator of this._config.validators) {
      const error = validator.validate(raw, parsed)
      if (error) {
        return { value: undefined as T, error }
      }
    }

    return { value: parsed as T, error: null }
  }
}

// --- Schema builder factory ---

function createSchema<T>(type: SchemaType, extras?: Partial<InternalConfig>): EnvSchema<T> {
  return new EnvSchema<T>({
    type,
    isOptional: false,
    hasDefault: false,
    validators: [],
    ...extras,
  })
}

/** Schema builders for environment variable validation */
export const s = {
  /** String environment variable */
  string: () => createSchema<string>('string'),

  /** Number environment variable (parsed from string) */
  number: () => createSchema<number>('number'),

  /** Boolean environment variable (accepts true/false/1/0/yes/no/on/off) */
  boolean: () => createSchema<boolean>('boolean'),

  /** Port number (integer between 1 and 65535) */
  port: () => {
    const schema = createSchema<number>('port')
    schema._config.validators.push(
      {
        name: 'port-range',
        validate: (_raw, parsed) => {
          if (typeof parsed === 'number' && (parsed < 1 || parsed > 65535))
            return 'Port must be between 1 and 65535'
          return null
        },
      },
      {
        name: 'port-int',
        validate: (_raw, parsed) => {
          if (typeof parsed === 'number' && !Number.isInteger(parsed))
            return 'Port must be an integer'
          return null
        },
      },
    )
    return schema
  },

  /** URL environment variable (validated format) */
  url: () => {
    const schema = createSchema<string>('url')
    schema._config.validators.push({
      name: 'url',
      validate: (raw) => {
        try {
          new URL(raw)
          return null
        } catch {
          return 'Must be a valid URL'
        }
      },
    })
    return schema
  },

  /** Email environment variable (validated format) */
  email: () => {
    const schema = createSchema<string>('email')
    schema._config.validators.push({
      name: 'email',
      validate: (raw) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return 'Must be a valid email address'
        return null
      },
    })
    return schema
  },

  /** Enum environment variable (must be one of the specified values) */
  enum: <T extends string>(...values: T[]) => {
    return createSchema<T>('enum', { enumValues: values })
  },

  /** JSON environment variable (parsed from string) */
  json: <T = unknown>() => createSchema<T>('json'),
}
