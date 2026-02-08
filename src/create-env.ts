import { EnvSchema } from './schema'
import { EnvValidationError } from './errors'
import { EnvError } from './types'

type InferEnv<T extends Record<string, EnvSchema<any>>> = Readonly<{
  [K in keyof T]: T[K] extends EnvSchema<infer U> ? U : never
}>

interface CreateEnvOptions<T extends Record<string, EnvSchema<any>>> {
  /** Schema defining your environment variables */
  schema: T
  /** Source of environment variables (defaults to process.env) */
  source?: Record<string, string | undefined>
}

/**
 * Validate and parse environment variables with full type inference.
 *
 * @throws {EnvValidationError} When one or more variables fail validation
 */
export function createEnv<T extends Record<string, EnvSchema<any>>>(
  options: CreateEnvOptions<T>,
): InferEnv<T> {
  const { schema, source = process.env } = options
  const errors: EnvError[] = []
  const result: Record<string, unknown> = {}

  for (const [key, envSchema] of Object.entries(schema)) {
    const raw = source[key]
    const { value, error } = envSchema._parse(key, raw)

    if (error) {
      errors.push({ key, message: error, value: raw })
    } else {
      result[key] = value
    }
  }

  if (errors.length > 0) {
    throw new EnvValidationError(errors)
  }

  return Object.freeze(result) as InferEnv<T>
}
