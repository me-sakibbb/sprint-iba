import { expect, test, describe } from 'vitest'
import { cn } from './utils'

describe('cn utility', () => {
  test('merges class names correctly', () => {
    expect(cn('c1', 'c2')).toBe('c1 c2')
  })

  test('conditionally applies class names', () => {
    expect(cn('c1', true && 'c2', false && 'c3')).toBe('c1 c2')
  })

  test('handles null and undefined', () => {
    expect(cn('c1', null, undefined, 'c2')).toBe('c1 c2')
  })

  test('merges tailwind classes with conflicts', () => {
    // twMerge should override p-2 with p-4
    expect(cn('p-2', 'p-4')).toBe('p-4')
    // twMerge should handle responsive modifiers
    expect(cn('p-2', 'md:p-4')).toBe('p-2 md:p-4')
  })

  test('handles arrays of class names', () => {
    expect(cn(['c1', 'c2'], 'c3')).toBe('c1 c2 c3')
  })

  test('handles objects with boolean values', () => {
    expect(cn({ c1: true, c2: false, c3: true })).toBe('c1 c3')
  })

  test('handles empty input', () => {
    expect(cn()).toBe('')
  })
})
