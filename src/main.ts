import './style.css'
import { ChordPatternGenerator } from './chordPatternGenerator.ts'
import { deleteChordList, getSavedChordLists, saveChordList, type SavedChordList } from './storage.ts'
import { getSettings, saveSettings, type ChordPatternSettings } from './settings.ts'
import { Slider } from './slider.ts'
import { LoadModal, SaveModal, SettingsModal } from './modal.ts'
import { Scheduler } from './scheduler.ts'

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
  scheduler.reset()
  slider.reset(prompts, CARD_COUNT)
}

function regenerate() {
  prompts.splice(0, prompts.length, ...chordPatternGenerator.generate({ length: CARD_COUNT, mode: settings.mode }))
  scheduler.reset()
  slider.reset(prompts, CARD_COUNT)
}

function applySettings(newSettings: ChordPatternSettings) {
  const shouldRegenerate = newSettings.mode !== settings.mode || newSettings.length !== settings.length

  settings = newSettings
  saveSettings(settings)
  CARD_COUNT = settings.length
  scheduler.setChangeEvery(settings.changeEvery)
  scheduler.setTempo(settings.tempo)

  if (shouldRegenerate) {
    regenerate()
  }
}

function loadChordList(list: SavedChordList) {
  if (list.prompts.length !== list.settings.length) return // guard against corrupted/edited storage

  settings = list.settings
  saveSettings(settings)
  CARD_COUNT = settings.length
  prompts.splice(0, prompts.length, ...list.prompts)
  scheduler.setChangeEvery(settings.changeEvery)
  scheduler.setTempo(settings.tempo)
  scheduler.reset()
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

const scheduler = new Scheduler(
  { onAdvance: () => slider.advance(prompts, CARD_COUNT) },
  settings.changeEvery,
  settings.tempo,
)

playStopBtn.addEventListener('click', () => {
  isPlaying = !isPlaying
  updatePlayStopButton()

  if (isPlaying) {
    void scheduler.start()
  } else {
    scheduler.stop()
    resetToFirstCard()
  }
})

if (isPlaying) void scheduler.start()

// Metronome: off by default, toggled independently of play/stop.
const metronomeBtn = document.querySelector<HTMLButtonElement>('#metronome-btn')!
const speakerOnIconEl = metronomeBtn.querySelector<SVGElement>('.icon-speaker-on')!
const speakerOffIconEl = metronomeBtn.querySelector<SVGElement>('.icon-speaker-off')!
const metronomeLabelEl = document.querySelector<HTMLSpanElement>('#metronome-label')!
let metronomeEnabled = false

function updateMetronomeButton() {
  const label = metronomeEnabled ? 'Turn metronome off' : 'Turn metronome on'
  metronomeBtn.classList.toggle('active', metronomeEnabled)
  metronomeBtn.setAttribute('aria-pressed', String(metronomeEnabled))
  speakerOnIconEl.classList.toggle('hidden', !metronomeEnabled)
  speakerOffIconEl.classList.toggle('hidden', metronomeEnabled)
  metronomeLabelEl.textContent = label
  metronomeBtn.title = label
}

metronomeBtn.addEventListener('click', () => {
  metronomeEnabled = !metronomeEnabled
  scheduler.setMetronomeEnabled(metronomeEnabled)
  updateMetronomeButton()
})

updateMetronomeButton()

// Browsers only let an audio context resume from within a genuine user gesture, so a
// scheduler.start() called on page load (above) may sit waiting for one. Retry on the first
// interaction; scheduler.start()/Transport.start() are both no-ops once already running/started.
for (const eventName of ['pointerdown', 'keydown']) {
  window.addEventListener(
    eventName,
    () => {
      if (isPlaying) void scheduler.start()
    },
    { once: true },
  )
}

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
