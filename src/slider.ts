const SLIDE_DURATION_MS = 100 // keep in sync with the .track transition duration in style.css

// Drives the sliding-card track: which card is active, the slide/recycle animation, and
// resetting/repainting the track when the prompt list changes underneath it.
export class Slider {
  private readonly trackEl: HTMLDivElement

  // Always holds, in DOM/visual order: [previous, current, next, incoming (clipped offstage)].
  private readonly cardEls: HTMLDivElement[]

  private currentIndex = 0

  // Cancellable handle for a slide's pending recycle, so reset() can safely interrupt one.
  private pendingRecycle: (() => void) | null = null
  private pendingRecycleTimeout: ReturnType<typeof setTimeout> | undefined

  constructor(trackEl: HTMLDivElement) {
    this.trackEl = trackEl
    this.cardEls = Array.from(trackEl.querySelectorAll<HTMLDivElement>('.card'))
  }

  // The currently-displayed card element, e.g. for applying a flash effect.
  get activeCardEl(): HTMLDivElement {
    return this.cardEls[1]
  }

  private wrap(index: number, cardCount: number): number {
    return ((index % cardCount) + cardCount) % cardCount
  }

  // Initial paint: no transform/transition involved, so this must land in the right state directly.
  private renderInitial(prompts: string[], cardCount: number) {
    const initialPromptIndexes = [
      this.wrap(this.currentIndex - 1, cardCount),
      this.currentIndex,
      this.wrap(this.currentIndex + 1, cardCount),
      this.wrap(this.currentIndex + 2, cardCount),
    ]
    initialPromptIndexes.forEach((promptIndex, slot) => {
      const cardEl = this.cardEls[slot]
      cardEl.textContent = prompts[promptIndex]
      cardEl.classList.toggle('active', slot === 1)
      cardEl.classList.toggle('side', slot !== 1)
    })
  }

  private recycle(prompts: string[], cardCount: number) {
    this.trackEl.classList.add('no-transition')
    this.trackEl.classList.remove('sliding')

    // The card that slid fully offscreen left becomes the new hidden "incoming" card at the tail.
    const recycledEl = this.cardEls.shift()!
    this.trackEl.appendChild(recycledEl)
    this.cardEls.push(recycledEl)

    recycledEl.textContent = prompts[this.wrap(this.currentIndex + 2, cardCount)]
    recycledEl.classList.remove('active')
    recycledEl.classList.add('side')

    void this.trackEl.offsetHeight // force reflow so the next advance() re-enables the slide transition
    this.trackEl.classList.remove('no-transition')
  }

  advance(prompts: string[], cardCount: number) {
    if (this.trackEl.classList.contains('sliding')) return

    this.currentIndex = this.wrap(this.currentIndex + 1, cardCount)
    this.cardEls[1].classList.remove('active')
    this.cardEls[1].classList.add('side')
    this.cardEls[2].classList.remove('side')
    this.cardEls[2].classList.add('active')

    const recycleOnce = () => {
      if (this.pendingRecycle !== recycleOnce) return
      this.pendingRecycle = null
      this.trackEl.removeEventListener('transitionend', recycleOnce)
      this.recycle(prompts, cardCount)
    }
    this.pendingRecycle = recycleOnce

    this.trackEl.addEventListener('transitionend', recycleOnce)
    // Fallback in case transitionend never fires (e.g. a backgrounded tab coalescing timers).
    this.pendingRecycleTimeout = setTimeout(recycleOnce, SLIDE_DURATION_MS + 50)

    this.trackEl.classList.add('sliding')
  }

  // Interrupts any slide in flight and snaps the track back instantly, so a hard reset can't
  // later have a stale recycle() fire against post-reset state.
  private cancelSlide() {
    if (this.pendingRecycle) {
      this.trackEl.removeEventListener('transitionend', this.pendingRecycle)
      this.pendingRecycle = null
    }
    clearTimeout(this.pendingRecycleTimeout)
    this.cardEls[1].classList.remove('flash')

    this.trackEl.classList.add('no-transition')
    this.trackEl.classList.remove('sliding')
  }

  private reflowTrack() {
    void this.trackEl.offsetHeight // force reflow before re-enabling the transition
    this.trackEl.classList.remove('no-transition')
  }

  // Cancels any in-flight slide and repaints the track from the start of `prompts`.
  reset(prompts: string[], cardCount: number) {
    this.cancelSlide()
    this.currentIndex = 0
    this.renderInitial(prompts, cardCount)
    this.reflowTrack()
  }
}
