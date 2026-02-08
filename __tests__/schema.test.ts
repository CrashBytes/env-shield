import { describe, it, expect } from 'vitest'
import { s } from '../src/schema'

describe('Schema builders', () => {
  describe('s.string()', () => {
    it('parses a string value', () => {
      const schema = s.string()
      const { value, error } = schema._parse('TEST', 'hello')
      expect(error).toBeNull()
      expect(value).toBe('hello')
    })

    it('fails on missing required value', () => {
      const { error } = s.string()._parse('TEST', undefined)
      expect(error).toBe('Required variable is missing')
    })

    it('fails on empty string for required value', () => {
      const { error } = s.string()._parse('TEST', '')
      expect(error).toBe('Required variable is missing')
    })

    it('returns default when missing', () => {
      const { value, error } = s.string().default('fallback')._parse('TEST', undefined)
      expect(error).toBeNull()
      expect(value).toBe('fallback')
    })

    it('returns undefined when optional and missing', () => {
      const { value, error } = s.string().optional()._parse('TEST', undefined)
      expect(error).toBeNull()
      expect(value).toBeUndefined()
    })

    it('validates min length', () => {
      const { error } = s.string().min(5)._parse('TEST', 'hi')
      expect(error).toBe('Must be at least 5 characters')
    })

    it('validates max length', () => {
      const { error } = s.string().max(3)._parse('TEST', 'hello')
      expect(error).toBe('Must be at most 3 characters')
    })

    it('validates url format', () => {
      expect(s.string().url()._parse('TEST', 'https://example.com').error).toBeNull()
      expect(s.string().url()._parse('TEST', 'not-a-url').error).toBe('Must be a valid URL')
    })

    it('validates email format', () => {
      expect(s.string().email()._parse('TEST', 'user@example.com').error).toBeNull()
      expect(s.string().email()._parse('TEST', 'not-an-email').error).toBe(
        'Must be a valid email address',
      )
    })

    it('validates regex pattern', () => {
      const schema = s.string().regex(/^[A-Z]+$/, 'Must be uppercase letters')
      expect(schema._parse('TEST', 'HELLO').error).toBeNull()
      expect(schema._parse('TEST', 'hello').error).toBe('Must be uppercase letters')
    })

    it('uses provided value over default', () => {
      const { value, error } = s.string().default('fallback')._parse('TEST', 'actual')
      expect(error).toBeNull()
      expect(value).toBe('actual')
    })
  })

  describe('s.number()', () => {
    it('parses a number value', () => {
      const { value, error } = s.number()._parse('TEST', '42')
      expect(error).toBeNull()
      expect(value).toBe(42)
    })

    it('parses float values', () => {
      const { value, error } = s.number()._parse('TEST', '3.14')
      expect(error).toBeNull()
      expect(value).toBe(3.14)
    })

    it('parses negative numbers', () => {
      const { value, error } = s.number()._parse('TEST', '-5')
      expect(error).toBeNull()
      expect(value).toBe(-5)
    })

    it('fails on non-numeric string', () => {
      const { error } = s.number()._parse('TEST', 'abc')
      expect(error).toBe('Expected a number, got "abc"')
    })

    it('validates min value', () => {
      expect(s.number().min(10)._parse('TEST', '5').error).toBe('Must be at least 10')
      expect(s.number().min(10)._parse('TEST', '15').error).toBeNull()
    })

    it('validates max value', () => {
      expect(s.number().max(100)._parse('TEST', '150').error).toBe('Must be at most 100')
      expect(s.number().max(100)._parse('TEST', '50').error).toBeNull()
    })

    it('validates integer', () => {
      expect(s.number().int()._parse('TEST', '3.14').error).toBe('Must be an integer')
      expect(s.number().int()._parse('TEST', '42').error).toBeNull()
    })

    it('returns default when missing', () => {
      const { value, error } = s.number().default(3000)._parse('TEST', undefined)
      expect(error).toBeNull()
      expect(value).toBe(3000)
    })
  })

  describe('s.boolean()', () => {
    it('parses true values', () => {
      for (const val of ['true', 'TRUE', 'True', '1', 'yes', 'YES', 'on', 'ON']) {
        const { value, error } = s.boolean()._parse('TEST', val)
        expect(error).toBeNull()
        expect(value).toBe(true)
      }
    })

    it('parses false values', () => {
      for (const val of ['false', 'FALSE', 'False', '0', 'no', 'NO', 'off', 'OFF']) {
        const { value, error } = s.boolean()._parse('TEST', val)
        expect(error).toBeNull()
        expect(value).toBe(false)
      }
    })

    it('fails on invalid boolean value', () => {
      const { error } = s.boolean()._parse('TEST', 'maybe')
      expect(error).toContain('Expected a boolean')
    })

    it('returns default when missing', () => {
      const { value, error } = s.boolean().default(false)._parse('TEST', undefined)
      expect(error).toBeNull()
      expect(value).toBe(false)
    })
  })

  describe('s.port()', () => {
    it('parses valid port', () => {
      const { value, error } = s.port()._parse('TEST', '3000')
      expect(error).toBeNull()
      expect(value).toBe(3000)
    })

    it('accepts port 1', () => {
      const { value, error } = s.port()._parse('TEST', '1')
      expect(error).toBeNull()
      expect(value).toBe(1)
    })

    it('accepts port 65535', () => {
      const { value, error } = s.port()._parse('TEST', '65535')
      expect(error).toBeNull()
      expect(value).toBe(65535)
    })

    it('fails on port 0', () => {
      const { error } = s.port()._parse('TEST', '0')
      expect(error).toBe('Port must be between 1 and 65535')
    })

    it('fails on port > 65535', () => {
      const { error } = s.port()._parse('TEST', '70000')
      expect(error).toBe('Port must be between 1 and 65535')
    })

    it('fails on non-integer port', () => {
      const { error } = s.port()._parse('TEST', '3000.5')
      expect(error).toBe('Port must be an integer')
    })

    it('returns default when missing', () => {
      const { value, error } = s.port().default(3000)._parse('TEST', undefined)
      expect(error).toBeNull()
      expect(value).toBe(3000)
    })
  })

  describe('s.enum()', () => {
    it('accepts valid enum value', () => {
      const { value, error } = s.enum('dev', 'staging', 'prod')._parse('TEST', 'dev')
      expect(error).toBeNull()
      expect(value).toBe('dev')
    })

    it('rejects invalid enum value', () => {
      const { error } = s.enum('dev', 'staging', 'prod')._parse('TEST', 'test')
      expect(error).toBe('Must be one of: dev, staging, prod')
    })

    it('returns default when missing', () => {
      const { value, error } = s.enum('dev', 'prod').default('dev')._parse('TEST', undefined)
      expect(error).toBeNull()
      expect(value).toBe('dev')
    })
  })

  describe('s.url()', () => {
    it('validates URL format', () => {
      expect(s.url()._parse('TEST', 'https://example.com').error).toBeNull()
      expect(s.url()._parse('TEST', 'http://localhost:3000').error).toBeNull()
      expect(s.url()._parse('TEST', 'not-a-url').error).toBe('Must be a valid URL')
    })
  })

  describe('s.email()', () => {
    it('validates email format', () => {
      expect(s.email()._parse('TEST', 'user@example.com').error).toBeNull()
      expect(s.email()._parse('TEST', 'invalid').error).toBe('Must be a valid email address')
    })
  })

  describe('s.json()', () => {
    it('parses valid JSON', () => {
      const { value, error } = s.json()._parse('TEST', '{"key": "value"}')
      expect(error).toBeNull()
      expect(value).toEqual({ key: 'value' })
    })

    it('parses JSON arrays', () => {
      const { value, error } = s.json()._parse('TEST', '[1, 2, 3]')
      expect(error).toBeNull()
      expect(value).toEqual([1, 2, 3])
    })

    it('fails on invalid JSON', () => {
      const { error } = s.json()._parse('TEST', '{invalid}')
      expect(error).toContain('Invalid JSON')
    })
  })

  describe('chaining', () => {
    it('supports multiple validators', () => {
      const schema = s.number().min(1).max(100).int()
      expect(schema._parse('TEST', '50').error).toBeNull()
      expect(schema._parse('TEST', '0').error).toBe('Must be at least 1')
      expect(schema._parse('TEST', '101').error).toBe('Must be at most 100')
      expect(schema._parse('TEST', '50.5').error).toBe('Must be an integer')
    })

    it('supports describe', () => {
      const schema = s.string().describe('The database connection URL')
      expect(schema._config.description).toBe('The database connection URL')
      expect(schema._parse('TEST', 'value').error).toBeNull()
    })
  })
})
