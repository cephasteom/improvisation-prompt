const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const
const QUALITIES = ['', 'm'] as const

const DEFAULT_LENGTH = 12

export interface ChordPatternOptions {
  /** Number of chords in the generated pattern. Defaults to 12. */
  length?: number
}

export class ChordPatternGenerator {
  generate(options: ChordPatternOptions = {}): string[] {
    const length = options.length ?? DEFAULT_LENGTH
    return Array.from({ length }, () => this.randomChordPrompt())
  }

  // Each prompt independently rolls sharp-vs-flat spelling, so the chord root and bass root
  // within one prompt always share a spelling, while different prompts in the same pattern
  // can differ.
  private randomChordPrompt(): string {
    const notes = Math.random() < 0.5 ? SHARP_NOTES : FLAT_NOTES
    const chordRoot = this.pick(notes)
    const quality = this.pick(QUALITIES)
    const bassRoot = this.pick(notes)
    return `${chordRoot}${quality} / ${bassRoot}`
  }

  private pick<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]
  }
}
