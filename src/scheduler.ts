import { Loop, Synth, Draw, start, getTransport } from 'tone'
import type { ChangeEverySetting } from './settings.ts'

const METRONOME_INTERVAL = '4n'
const METRONOME_NOTE = 880
const METRONOME_DURATION = '32n'

export interface SchedulerCallbacks {
  /** Fired every `changeEvery` beats/bars — advance to the next card. */
  onAdvance: () => void
}

// Converts a ChangeEverySetting into a Bars:Beats:Sixteenths time expression. Tone resolves this
// against the Transport's actual time signature, so "beats" stays correct even if that changes.
function toInterval(changeEvery: ChangeEverySetting): string {
  return changeEvery.unit === 'bars' ? `${changeEvery.amount}:0:0` : `0:${changeEvery.amount}:0`
}

// Drives the card-advance cycle and the metronome click off Transport instead of a plain
// setInterval, so timing is expressed in beats/bars (per the "change every" setting) rather than
// raw milliseconds. One Loop fires every cycle to advance the card; a second Loop ticks every beat
// and plays a short sine-oscillator click when the metronome is enabled. start()/stop()/reset()
// control the shared Transport; setChangeEvery() re-derives the advance loop when the setting
// changes.
export class Scheduler {
  private readonly callbacks: SchedulerCallbacks
  private advanceLoop: Loop
  private readonly metronomeSynth: Synth
  private readonly metronomeLoop: Loop

  constructor(callbacks: SchedulerCallbacks, changeEvery: ChangeEverySetting) {
    this.callbacks = callbacks
    this.advanceLoop = this.createAdvanceLoop(changeEvery)

    this.metronomeSynth = new Synth({
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
    }).toDestination()

    this.metronomeLoop = new Loop((time) => {
      this.metronomeSynth.triggerAttackRelease(METRONOME_NOTE, METRONOME_DURATION, time)
    }, METRONOME_INTERVAL).start(0)
    this.metronomeLoop.mute = true
  }

  private createAdvanceLoop(changeEvery: ChangeEverySetting): Loop {
    // Loop callbacks fire slightly ahead of audio time and off the animation frame, so DOM
    // updates are routed through Draw to land in sync with the actual scheduled time.
    return new Loop((time) => {
      Draw.schedule(this.callbacks.onAdvance, time)
    }, toInterval(changeEvery)).start(0)
  }

  // Swaps in a new "change every" interval, replacing the advance loop.
  // Pair with reset() (e.g. when applying settings) so the new cycle starts from the top rather
  // than mid-cycle.
  setChangeEvery(changeEvery: ChangeEverySetting): void {
    this.advanceLoop.dispose()
    this.advanceLoop = this.createAdvanceLoop(changeEvery)
  }

  // Mutes/unmutes the metronome click without affecting the advance cycle.
  setMetronomeEnabled(enabled: boolean): void {
    this.metronomeLoop.mute = !enabled
  }

  // Resumes the audio context (must run from a user gesture) and starts the transport.
  async start(): Promise<void> {
    await start()
    getTransport().start()
  }

  // Stops the transport and rewinds it to the top of the cycle.
  stop(): void {
    getTransport().stop()
  }

  // Rewinds to the top of the cycle without changing play/stop state.
  reset(): void {
    const transport = getTransport()
    const wasPlaying = transport.state === 'started'
    transport.stop()
    if (wasPlaying) transport.start()
  }

  // Stops and releases the loops and the metronome synth. Not currently called (the scheduler
  // lives for the app's lifetime) but here so the Scheduler can be torn down cleanly if that ever
  // changes.
  dispose(): void {
    this.advanceLoop.dispose()
    this.metronomeLoop.dispose()
    this.metronomeSynth.dispose()
  }
}
