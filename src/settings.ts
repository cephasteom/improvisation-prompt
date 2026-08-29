import type { PatternMode } from './chordPatternGenerator.ts'

const STORAGE_KEY = 'improvise:settings'

export const MIN_LENGTH = 4
export const MAX_LENGTH = 32

export const MIN_CHANGE_EVERY = 1
export const MAX_CHANGE_EVERY = 64

export const MIN_TEMPO = 40
export const MAX_TEMPO = 240

/** Unit the "change every" amount is counted in. */
export type ChangeEveryUnit = 'beats' | 'bars'

export interface ChangeEverySetting {
  /** How many `unit`s elapse before the card advances. */
  amount: number
  unit: ChangeEveryUnit
}

export interface ChordPatternSettings {
  /** Number of chords/scales in a generated pattern. */
  length: number
  /** Whether to generate chord prompts or scale prompts. */
  mode: PatternMode
  /** How often the active card advances. */
  changeEvery: ChangeEverySetting
  /** Tone Transport tempo, in beats per minute. */
  tempo: number
}

export const DEFAULT_SETTINGS: ChordPatternSettings = {
  length: 12,
  mode: 'chord',
  changeEvery: { amount: 4, unit: 'bars' },
  tempo: 120,
}

function isPatternMode(value: unknown): value is PatternMode {
  return value === 'chord' || value === 'scale'
}

function isValidLength(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= MIN_LENGTH && value <= MAX_LENGTH
}

function isChangeEveryUnit(value: unknown): value is ChangeEveryUnit {
  return value === 'beats' || value === 'bars'
}

function isValidChangeEveryAmount(value: unknown): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= MIN_CHANGE_EVERY && value <= MAX_CHANGE_EVERY
  )
}

function isChangeEverySetting(value: unknown): value is ChangeEverySetting {
  return (
    typeof value === 'object' &&
    value !== null &&
    isValidChangeEveryAmount((value as ChangeEverySetting).amount) &&
    isChangeEveryUnit((value as ChangeEverySetting).unit)
  )
}

function isValidTempo(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= MIN_TEMPO && value <= MAX_TEMPO
}

export function isChordPatternSettings(value: unknown): value is ChordPatternSettings {
  return (
    typeof value === 'object' &&
    value !== null &&
    isValidLength((value as ChordPatternSettings).length) &&
    isPatternMode((value as ChordPatternSettings).mode) &&
    isChangeEverySetting((value as ChordPatternSettings).changeEvery) &&
    isValidTempo((value as ChordPatternSettings).tempo)
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
