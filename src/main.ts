import './style.css'
import { ChordPatternGenerator } from './chordPatternGenerator.ts'
import { deleteChordList, getSavedChordLists, saveChordList, type SavedChordList } from './storage.ts'

const CARD_COUNT = 12
const CYCLE_SECONDS = 16
const FLASH_START_SECOND = CYCLE_SECONDS - 3
const FLASH_DURATION_MS = 150
const SLIDE_DURATION_MS = 100 // keep in sync with the .track transition duration in style.css
const SIDEBAR_HIDE_DELAY_MS = 4000

const chordPatternGenerator = new ChordPatternGenerator()

const prompts = chordPatternGenerator.generate({ length: CARD_COUNT })

function wrap(index: number): number {
  return ((index % CARD_COUNT) + CARD_COUNT) % CARD_COUNT
}

const trackEl = document.querySelector<HTMLDivElement>('#track')!

// Always holds, in DOM/visual order: [previous, current, next, incoming (clipped offstage)].
const cardEls = Array.from(trackEl.querySelectorAll<HTMLDivElement>('.card'))

let currentIndex = 0

// Cancellable handle for a slide's pending recycle, so regenerate() can safely interrupt one.
let pendingRecycle: (() => void) | null = null
let pendingRecycleTimeout: ReturnType<typeof setTimeout> | undefined

// Initial paint: no transform/transition involved, so this must land in the right state directly.
function renderInitial() {
  const initialPromptIndexes = [
    wrap(currentIndex - 1),
    currentIndex,
    wrap(currentIndex + 1),
    wrap(currentIndex + 2),
  ]
  initialPromptIndexes.forEach((promptIndex, slot) => {
    const cardEl = cardEls[slot]
    cardEl.textContent = prompts[promptIndex]
    cardEl.classList.toggle('active', slot === 1)
    cardEl.classList.toggle('side', slot !== 1)
  })
}

renderInitial()

function recycle() {
  trackEl.classList.add('no-transition')
  trackEl.classList.remove('sliding')

  // The card that slid fully offscreen left becomes the new hidden "incoming" card at the tail.
  const recycledEl = cardEls.shift()!
  trackEl.appendChild(recycledEl)
  cardEls.push(recycledEl)

  recycledEl.textContent = prompts[wrap(currentIndex + 2)]
  recycledEl.classList.remove('active')
  recycledEl.classList.add('side')

  void trackEl.offsetHeight // force reflow so the next advance() re-enables the slide transition
  trackEl.classList.remove('no-transition')
}

function advance() {
  if (trackEl.classList.contains('sliding')) return

  currentIndex = wrap(currentIndex + 1)
  cardEls[1].classList.remove('active')
  cardEls[1].classList.add('side')
  cardEls[2].classList.remove('side')
  cardEls[2].classList.add('active')

  const recycleOnce = () => {
    if (pendingRecycle !== recycleOnce) return
    pendingRecycle = null
    trackEl.removeEventListener('transitionend', recycleOnce)
    recycle()
  }
  pendingRecycle = recycleOnce

  trackEl.addEventListener('transitionend', recycleOnce)
  // Fallback in case transitionend never fires (e.g. a backgrounded tab coalescing timers).
  pendingRecycleTimeout = setTimeout(recycleOnce, SLIDE_DURATION_MS + 50)

  trackEl.classList.add('sliding')
}

// Interrupts any slide in flight and snaps the track back instantly, so a hard reset can't
// later have a stale recycle() fire against post-reset state.
function cancelSlide() {
  if (pendingRecycle) {
    trackEl.removeEventListener('transitionend', pendingRecycle)
    pendingRecycle = null
  }
  clearTimeout(pendingRecycleTimeout)
  cardEls[1].classList.remove('flash')

  trackEl.classList.add('no-transition')
  trackEl.classList.remove('sliding')
}

function reflowTrack() {
  void trackEl.offsetHeight // force reflow before re-enabling the transition
  trackEl.classList.remove('no-transition')
}

function resetToFirstCard() {
  cancelSlide()
  currentIndex = 0
  elapsedSeconds = 0
  renderInitial()
  reflowTrack()
}

function regenerate() {
  cancelSlide()
  prompts.splice(0, prompts.length, ...chordPatternGenerator.generate({ length: CARD_COUNT }))
  currentIndex = 0
  elapsedSeconds = 0
  renderInitial()
  reflowTrack()
}

function loadChordList(list: SavedChordList) {
  if (list.prompts.length !== CARD_COUNT) return // guard against corrupted/edited storage

  cancelSlide()
  prompts.splice(0, prompts.length, ...list.prompts)
  currentIndex = 0
  elapsedSeconds = 0
  renderInitial()
  reflowTrack()
}

const regenerateBtn = document.querySelector<HTMLButtonElement>('#regenerate-btn')!
regenerateBtn.addEventListener('click', regenerate)

// Save / load modals

function openModal(overlayEl: HTMLElement) {
  overlayEl.classList.remove('hidden')
}

function closeModal(overlayEl: HTMLElement) {
  overlayEl.classList.add('hidden')
}

// Closes a modal when its backdrop (not its content) is clicked.
function dismissOnBackdropClick(overlayEl: HTMLElement) {
  overlayEl.addEventListener('click', (event) => {
    if (event.target === overlayEl) closeModal(overlayEl)
  })
}

const saveModalOverlay = document.querySelector<HTMLDivElement>('#save-modal-overlay')!
const saveNameInput = document.querySelector<HTMLInputElement>('#save-name-input')!
const saveCancelBtn = document.querySelector<HTMLButtonElement>('#save-cancel-btn')!
const saveConfirmBtn = document.querySelector<HTMLButtonElement>('#save-confirm-btn')!
const saveBtn = document.querySelector<HTMLButtonElement>('#save-btn')!

saveBtn.addEventListener('click', () => {
  saveNameInput.value = ''
  openModal(saveModalOverlay)
  saveNameInput.focus()
})

saveCancelBtn.addEventListener('click', () => closeModal(saveModalOverlay))
dismissOnBackdropClick(saveModalOverlay)

function confirmSave() {
  const name = saveNameInput.value.trim()
  if (!name) return

  saveChordList(name, prompts)
  closeModal(saveModalOverlay)
}

saveConfirmBtn.addEventListener('click', confirmSave)
saveNameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') confirmSave()
})

const loadModalOverlay = document.querySelector<HTMLDivElement>('#load-modal-overlay')!
const savedListEl = document.querySelector<HTMLUListElement>('#saved-list')!
const loadCancelBtn = document.querySelector<HTMLButtonElement>('#load-cancel-btn')!
const loadBtn = document.querySelector<HTMLButtonElement>('#load-btn')!

function renderSavedList() {
  const lists = getSavedChordLists()
  savedListEl.innerHTML = ''

  if (lists.length === 0) {
    const emptyEl = document.createElement('li')
    emptyEl.className = 'saved-list-empty'
    emptyEl.textContent = 'No saved chord lists yet.'
    savedListEl.appendChild(emptyEl)
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
      loadChordList(list)
      closeModal(loadModalOverlay)
    })

    const deleteBtn = document.createElement('button')
    deleteBtn.type = 'button'
    deleteBtn.className = 'saved-list-delete'
    deleteBtn.setAttribute('aria-label', `Delete ${list.name}`)
    deleteBtn.textContent = '×'
    deleteBtn.addEventListener('click', () => {
      deleteChordList(list.name)
      renderSavedList()
    })

    itemEl.append(nameBtn, deleteBtn)
    savedListEl.appendChild(itemEl)
  }
}

loadBtn.addEventListener('click', () => {
  renderSavedList()
  openModal(loadModalOverlay)
})

loadCancelBtn.addEventListener('click', () => closeModal(loadModalOverlay))
dismissOnBackdropClick(loadModalOverlay)

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return
  closeModal(saveModalOverlay)
  closeModal(loadModalOverlay)
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
    advance()
    elapsedSeconds = 0
    return
  }

  if (elapsedSeconds >= FLASH_START_SECOND) {
    const activeEl = cardEls[1]
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
