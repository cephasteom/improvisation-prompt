import type { PatternMode } from './chordPatternGenerator.ts'
import type { ChangeEveryUnit, ChordPatternSettings } from './settings.ts'
import type { SavedChordList } from './storage.ts'
import { MAX_CHANGE_EVERY, MAX_LENGTH, MAX_TEMPO, MIN_CHANGE_EVERY, MIN_LENGTH, MIN_TEMPO } from './settings.ts'

// Base class for the app's overlay modals: show/hide plus dismissal by backdrop click. Subclasses
// wire up their own controls and closing behavior on top of open()/close().
class Modal {
  protected readonly overlayEl: HTMLElement

  constructor(overlayEl: HTMLElement) {
    this.overlayEl = overlayEl
    overlayEl.addEventListener('click', (event) => {
      if (event.target === overlayEl) this.close()
    })
  }

  open() {
    this.overlayEl.classList.remove('hidden')
  }

  close() {
    this.overlayEl.classList.add('hidden')
  }
}

// Modal for naming and saving the current chord list.
export class SaveModal extends Modal {
  private readonly nameInput: HTMLInputElement

  constructor(onSave: (name: string) => void) {
    super(document.querySelector<HTMLDivElement>('#save-modal-overlay')!)

    this.nameInput = document.querySelector<HTMLInputElement>('#save-name-input')!
    const cancelBtn = document.querySelector<HTMLButtonElement>('#save-cancel-btn')!
    const closeBtn = document.querySelector<HTMLButtonElement>('#save-close-btn')!
    const confirmBtn = document.querySelector<HTMLButtonElement>('#save-confirm-btn')!
    const openBtn = document.querySelector<HTMLButtonElement>('#save-btn')!

    openBtn.addEventListener('click', () => {
      this.nameInput.value = ''
      this.open()
      this.nameInput.focus()
    })

    cancelBtn.addEventListener('click', () => this.close())
    closeBtn.addEventListener('click', () => this.close())

    const confirmSave = () => {
      const name = this.nameInput.value.trim()
      if (!name) return

      onSave(name)
      this.close()
    }

    confirmBtn.addEventListener('click', confirmSave)
    this.nameInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') confirmSave()
    })
  }
}

export interface LoadModalDeps {
  getSavedLists(): SavedChordList[]
  onLoad(list: SavedChordList): void
  onDelete(name: string): void
}

// Modal listing saved chord lists, with per-item load and delete actions.
export class LoadModal extends Modal {
  private readonly listEl: HTMLUListElement
  private readonly deps: LoadModalDeps

  constructor(deps: LoadModalDeps) {
    super(document.querySelector<HTMLDivElement>('#load-modal-overlay')!)
    this.deps = deps

    this.listEl = document.querySelector<HTMLUListElement>('#saved-list')!
    const cancelBtn = document.querySelector<HTMLButtonElement>('#load-cancel-btn')!
    const closeBtn = document.querySelector<HTMLButtonElement>('#load-close-btn')!
    const openBtn = document.querySelector<HTMLButtonElement>('#load-btn')!

    openBtn.addEventListener('click', () => {
      this.renderList()
      this.open()
    })

    cancelBtn.addEventListener('click', () => this.close())
    closeBtn.addEventListener('click', () => this.close())
  }

  private renderList() {
    const lists = this.deps.getSavedLists()
    this.listEl.innerHTML = ''

    if (lists.length === 0) {
      const emptyEl = document.createElement('li')
      emptyEl.className = 'saved-list-empty'
      emptyEl.textContent = 'No saved patterns yet.'
      this.listEl.appendChild(emptyEl)
      return
    }

    for (const list of lists) {
      const itemEl = document.createElement('li')
      itemEl.className = 'saved-list-item'

      const nameBtn = document.createElement('button')
      nameBtn.type = 'button'
      nameBtn.className = 'saved-list-name'
      nameBtn.textContent = list.name
      nameBtn.addEventListener('click', () => {
        this.deps.onLoad(list)
        this.close()
      })

      const deleteBtn = document.createElement('button')
      deleteBtn.type = 'button'
      deleteBtn.className = 'saved-list-delete'
      deleteBtn.setAttribute('aria-label', `Delete ${list.name}`)
      deleteBtn.textContent = '×'
      deleteBtn.addEventListener('click', () => {
        this.deps.onDelete(list.name)
        this.renderList()
      })

      itemEl.append(nameBtn, deleteBtn)
      this.listEl.appendChild(itemEl)
    }
  }
}

export interface SettingsModalDeps {
  getSettings(): ChordPatternSettings
  onApply(settings: ChordPatternSettings): void
}

// Modal for choosing the pattern mode and length, applied together on confirm.
export class SettingsModal extends Modal {
  private readonly modeChordBtn: HTMLButtonElement
  private readonly modeScaleBtn: HTMLButtonElement
  private readonly lengthInput: HTMLInputElement
  private readonly tempoInput: HTMLInputElement
  private readonly changeEveryInput: HTMLInputElement
  private readonly changeEveryBeatsBtn: HTMLButtonElement
  private readonly changeEveryBarsBtn: HTMLButtonElement
  private readonly deps: SettingsModalDeps

  // Mode/unit selected in the (still-open, unsaved) modal.
  private pendingMode: PatternMode
  private pendingChangeEveryUnit: ChangeEveryUnit

  constructor(deps: SettingsModalDeps) {
    super(document.querySelector<HTMLDivElement>('#settings-modal-overlay')!)
    this.deps = deps
    this.pendingMode = deps.getSettings().mode
    this.pendingChangeEveryUnit = deps.getSettings().changeEvery.unit

    const openBtn = document.querySelector<HTMLButtonElement>('#settings-btn')!
    const cancelBtn = document.querySelector<HTMLButtonElement>('#settings-cancel-btn')!
    const closeBtn = document.querySelector<HTMLButtonElement>('#settings-close-btn')!
    const confirmBtn = document.querySelector<HTMLButtonElement>('#settings-confirm-btn')!
    this.modeChordBtn = document.querySelector<HTMLButtonElement>('#mode-chord-btn')!
    this.modeScaleBtn = document.querySelector<HTMLButtonElement>('#mode-scale-btn')!
    this.lengthInput = document.querySelector<HTMLInputElement>('#length-input')!
    this.tempoInput = document.querySelector<HTMLInputElement>('#tempo-input')!
    this.changeEveryInput = document.querySelector<HTMLInputElement>('#change-every-input')!
    this.changeEveryBeatsBtn = document.querySelector<HTMLButtonElement>('#change-every-beats-btn')!
    this.changeEveryBarsBtn = document.querySelector<HTMLButtonElement>('#change-every-bars-btn')!

    this.modeChordBtn.addEventListener('click', () => {
      this.pendingMode = 'chord'
      this.renderModeButtons()
    })
    this.modeScaleBtn.addEventListener('click', () => {
      this.pendingMode = 'scale'
      this.renderModeButtons()
    })

    this.changeEveryBeatsBtn.addEventListener('click', () => {
      this.pendingChangeEveryUnit = 'beats'
      this.renderChangeEveryButtons()
    })
    this.changeEveryBarsBtn.addEventListener('click', () => {
      this.pendingChangeEveryUnit = 'bars'
      this.renderChangeEveryButtons()
    })

    openBtn.addEventListener('click', () => {
      const settings = this.deps.getSettings()
      this.pendingMode = settings.mode
      this.renderModeButtons()
      this.lengthInput.value = String(settings.length)
      this.tempoInput.value = String(settings.tempo)
      this.pendingChangeEveryUnit = settings.changeEvery.unit
      this.renderChangeEveryButtons()
      this.changeEveryInput.value = String(settings.changeEvery.amount)
      this.open()
    })

    cancelBtn.addEventListener('click', () => this.close())
    closeBtn.addEventListener('click', () => this.close())
    confirmBtn.addEventListener('click', () => this.confirmSettings())
  }

  private renderModeButtons() {
    this.modeChordBtn.setAttribute('aria-checked', String(this.pendingMode === 'chord'))
    this.modeScaleBtn.setAttribute('aria-checked', String(this.pendingMode === 'scale'))
  }

  private renderChangeEveryButtons() {
    this.changeEveryBeatsBtn.setAttribute('aria-checked', String(this.pendingChangeEveryUnit === 'beats'))
    this.changeEveryBarsBtn.setAttribute('aria-checked', String(this.pendingChangeEveryUnit === 'bars'))
  }

  private confirmSettings() {
    const currentSettings = this.deps.getSettings()

    const parsedLength = Math.round(Number(this.lengthInput.value))
    const length = Number.isFinite(parsedLength)
      ? Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, parsedLength))
      : currentSettings.length

    const parsedChangeEveryAmount = Math.round(Number(this.changeEveryInput.value))
    const changeEveryAmount = Number.isFinite(parsedChangeEveryAmount)
      ? Math.min(MAX_CHANGE_EVERY, Math.max(MIN_CHANGE_EVERY, parsedChangeEveryAmount))
      : currentSettings.changeEvery.amount

    const parsedTempo = Math.round(Number(this.tempoInput.value))
    const tempo = Number.isFinite(parsedTempo)
      ? Math.min(MAX_TEMPO, Math.max(MIN_TEMPO, parsedTempo))
      : currentSettings.tempo

    this.deps.onApply({
      length,
      mode: this.pendingMode,
      changeEvery: { amount: changeEveryAmount, unit: this.pendingChangeEveryUnit },
      tempo,
    })
    this.close()
  }
}
