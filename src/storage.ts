const STORAGE_KEY = 'improv-prompt:saved-lists'

export interface SavedChordList {
  name: string
  prompts: string[]
}

function isSavedChordList(value: unknown): value is SavedChordList {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as SavedChordList).name === 'string' &&
    Array.isArray((value as SavedChordList).prompts)
  )
}

function readAll(): SavedChordList[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isSavedChordList) : []
  } catch {
    return []
  }
}

function writeAll(lists: SavedChordList[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lists))
}

export function getSavedChordLists(): SavedChordList[] {
  return readAll()
}

// Overwrites any existing saved list with the same name.
export function saveChordList(name: string, prompts: string[]): void {
  const lists = readAll()
  const existingIndex = lists.findIndex((list) => list.name === name)
  const entry: SavedChordList = { name, prompts: [...prompts] }

  if (existingIndex >= 0) {
    lists[existingIndex] = entry
  } else {
    lists.push(entry)
  }

  writeAll(lists)
}

export function deleteChordList(name: string): void {
  writeAll(readAll().filter((list) => list.name !== name))
}
