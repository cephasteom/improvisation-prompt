import './style.css'
import { randomChordPrompt } from './chords.ts'

const CYCLE_SECONDS = 30
const FLASH_START_SECOND = CYCLE_SECONDS - 3
const FLASH_DURATION_MS = 150

const appEl = document.querySelector<HTMLDivElement>('#app')!
appEl.innerHTML = `<div id="prompt" class="prompt"></div>`

const promptEl = document.querySelector<HTMLDivElement>('#prompt')!
promptEl.textContent = randomChordPrompt()

let elapsedSeconds = 0

setInterval(() => {
  elapsedSeconds++

  if (elapsedSeconds >= CYCLE_SECONDS) {
    promptEl.textContent = randomChordPrompt()
    elapsedSeconds = 0
    return
  }

  if (elapsedSeconds >= FLASH_START_SECOND) {
    promptEl.classList.add('flash')
    setTimeout(() => promptEl.classList.remove('flash'), FLASH_DURATION_MS)
  }
}, 1000)
