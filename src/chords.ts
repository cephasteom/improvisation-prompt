const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
const QUALITIES = ['', 'm']

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]
}

export function randomChordPrompt(): string {
  const notes = Math.random() < 0.5 ? SHARP_NOTES : FLAT_NOTES
  const chordRoot = pick(notes)
  const quality = pick(QUALITIES)
  const bassRoot = pick(notes)
  return `${chordRoot}${quality} / ${bassRoot}`
}
