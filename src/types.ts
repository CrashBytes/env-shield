export type SchemaType = 'string' | 'number' | 'boolean' | 'port' | 'enum' | 'json' | 'url' | 'email'

export interface Validator {
  name: string
  validate: (raw: string, parsed: unknown) => string | null
}

export interface InternalConfig {
  type: SchemaType
  isOptional: boolean
  hasDefault: boolean
  defaultValue?: unknown
  validators: Validator[]
  enumValues?: readonly string[]
  description?: string
}

export interface EnvError {
  key: string
  message: string
  value?: string
}
