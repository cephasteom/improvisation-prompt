import type { PatternMode } from './chordPatternGenerator.ts'

const STORAGE_KEY = 'improvise:settings'

export const MIN_LENGTH = 4
export const MAX_LENGTH = 32

export interface ChordPatternSettings {
  /** Number of chords/scales in a generated pattern. */
  length: number
  /** Whether to generate chord prompts or scale prompts. */
  mode: PatternMode
}

export const DEFAULT_SETTINGS: ChordPatternSettings = {
  length: 12,
  mode: 'chord',
}

function isPatternMode(value: unknown): value is PatternMode {
  return value === 'chord' || value === 'scale'
}

function isValidLength(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_LENGTH && value <= MAX_LENGTH
}

export function isChordPatternSettings(value: unknown): value is ChordPatternSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    isValidLength((value as ChordPatternSettings).length) &&
    isPatternMode((value as ChordPatternSettings).mode)
  )
}

// Falls back to defaults for missing, corrupted, or hand-edited storage.
export function getSettings(): ChordPatternSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed: unknown = JSON.parse(raw)
    return isChordPatternSettings(parsed) ? parsed : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: ChordPatternSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}
