import { EnvError } from './types'

export class EnvValidationError extends Error {
  public readonly errors: EnvError[]

  constructor(errors: EnvError[]) {
    const message = formatErrors(errors)
    super(message)
    this.name = 'EnvValidationError'
    this.errors = errors
  }
}

function formatErrors(errors: EnvError[]): string {
  const lines = errors.map(err => {
    const valueHint = err.value !== undefined ? ` (received: "${err.value}")` : ''
    return `  ✗ ${err.key}: ${err.message}${valueHint}`
  })

  return [
    '',
    `env-shield: ${errors.length} environment variable${errors.length > 1 ? 's' : ''} failed validation:`,
    '',
    ...lines,
    '',
  ].join('\n')
}
