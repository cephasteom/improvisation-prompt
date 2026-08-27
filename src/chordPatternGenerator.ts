const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const
const MODES = [
  // major modes
  'major', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian', 
  // melodic minors
  'minor', 'dorian b2', 'lydian #5', 'lydian dominant', 'mixolydian b6', 'locrian #2', 'altered',
  // other common scales
  'pentatonic', 'min pentatonic'
];
const QUALITIES = ['', 'm'] as const

const DEFAULT_LENGTH = 12

export type PatternMode = 'scale' | 'chord'

const DEFAULT_MODE: PatternMode = 'scale'

export interface ChordPatternOptions {
  /** Number of chords in the generated pattern. Defaults to 12. */
  length?: number
  /** Whether to generate chord prompts or scale prompts. Defaults to 'scale'. */
  mode?: PatternMode
}

export class ChordPatternGenerator {
  generate(options: ChordPatternOptions = {}): string[] {
    const length = options.length ?? DEFAULT_LENGTH
    const mode = options.mode ?? DEFAULT_MODE
    const randomPrompt = mode === 'chord' ? this.randomChordPrompt : this.randomScalePrompt
    return Array.from({ length }, () => randomPrompt.call(this))
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

  private randomScalePrompt(): string {
    const notes = Math.random() < 0.5 ? SHARP_NOTES : FLAT_NOTES
    const root = this.pick(notes)
    const mode = this.pick(MODES)
    return `${root} ${mode}`
  }

  private pick<T>(items: readonly T[]): T {
    return items[Math.floor(Math.random() * items.length)]
  }
}
