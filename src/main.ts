import './style.css'
import { ChordPatternGenerator } from './chordPatternGenerator.ts'
import { deleteChordList, getSavedChordLists, saveChordList, type SavedChordList } from './storage.ts'
import { getSettings, saveSettings, type ChordPatternSettings } from './settings.ts'
import { Slider } from './slider.ts'
import { LoadModal, SaveModal, SettingsModal } from './modal.ts'

const CYCLE_SECONDS = 16
const FLASH_START_SECOND = CYCLE_SECONDS - 3
const FLASH_DURATION_MS = 150
const SIDEBAR_HIDE_DELAY_MS = 4000

const chordPatternGenerator = new ChordPatternGenerator()

// Current settings and the pattern length derived from them. Both are reassigned by
// applySettings() when the user saves changes in the settings modal.
let settings = getSettings()
let CARD_COUNT = settings.length

const prompts = chordPatternGenerator.generate({ length: CARD_COUNT, mode: settings.mode })

const trackEl = document.querySelector<HTMLDivElement>('#track')!
const slider = new Slider(trackEl)

slider.reset(prompts, CARD_COUNT)

function resetToFirstCard() {
  elapsedSeconds = 0
  slider.reset(prompts, CARD_COUNT)
}

function regenerate() {
  prompts.splice(0, prompts.length, ...chordPatternGenerator.generate({ length: CARD_COUNT, mode: settings.mode }))
  elapsedSeconds = 0
  slider.reset(prompts, CARD_COUNT)
}

function applySettings(newSettings: ChordPatternSettings) {
  settings = newSettings
  saveSettings(settings)
  CARD_COUNT = settings.length
  regenerate()
}

function loadChordList(list: SavedChordList) {
  if (list.prompts.length !== list.settings.length) return // guard against corrupted/edited storage

  settings = list.settings
  saveSettings(settings)
  CARD_COUNT = settings.length
  prompts.splice(0, prompts.length, ...list.prompts)
  elapsedSeconds = 0
  slider.reset(prompts, CARD_COUNT)
}

const regenerateBtn = document.querySelector<HTMLButtonElement>('#regenerate-btn')!
regenerateBtn.addEventListener('click', regenerate)

// Save / load / settings modals

const saveModal = new SaveModal((name) => saveChordList(name, prompts, settings))

const loadModal = new LoadModal({
  getSavedLists: getSavedChordLists,
  onLoad: loadChordList,
  onDelete: deleteChordList,
})

const settingsModal = new SettingsModal({
  getSettings: () => settings,
  onApply: applySettings,
})

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  saveModal.close()
  loadModal.close()
  settingsModal.close()
})

const playStopBtn = document.querySelector<HTMLButtonElement>('#play-stop-btn')!
const playIconEl = playStopBtn.querySelector<SVGElement>('.icon-play')!
const stopIconEl = playStopBtn.querySelector<SVGElement>('.icon-stop')!
const playStopLabelEl = document.querySelector<HTMLSpanElement>('#play-stop-label')!
let isPlaying = true

function updatePlayStopButton() {
  const label = isPlaying ? 'Stop' : 'Play'
  playIconEl.classList.toggle('hidden', isPlaying)
  stopIconEl.classList.toggle('hidden', !isPlaying)
  playStopLabelEl.textContent = label
  playStopBtn.title = label
}

playStopBtn.addEventListener('click', () => {
  isPlaying = !isPlaying
  updatePlayStopButton()

  if (!isPlaying) {
    resetToFirstCard()
  }
})

let elapsedSeconds = 0

setInterval(() => {
  if (!isPlaying) return

  elapsedSeconds++

  if (elapsedSeconds >= CYCLE_SECONDS) {
    slider.advance(prompts, CARD_COUNT)
    elapsedSeconds = 0
    return
  }

  if (elapsedSeconds >= FLASH_START_SECOND) {
    const activeEl = slider.activeCardEl
    activeEl.classList.add('flash')
    setTimeout(() => activeEl.classList.remove('flash'), FLASH_DURATION_MS)
  }
}, 1000)

// Sidebar: visible on load, hides after a few seconds of inactivity, and reappears on any
// mouse/touch activity.
const sidebarEl = document.querySelector<HTMLElement>('#sidebar')!
let hideSidebarTimeout: ReturnType<typeof setTimeout>

function showSidebar() {
  sidebarEl.classList.remove('hidden')
  clearTimeout(hideSidebarTimeout)
  hideSidebarTimeout = setTimeout(() => {
    sidebarEl.classList.add('hidden')
  }, SIDEBAR_HIDE_DELAY_MS)
}

for (const eventName of ['mousemove', 'touchstart', 'touchmove', 'click']) {
  window.addEventListener(eventName, showSidebar, { passive: true })
}

showSidebar()

const footerYearEl = document.querySelector<HTMLSpanElement>('#footer-year')!
footerYearEl.textContent = String(new Date().getFullYear())
