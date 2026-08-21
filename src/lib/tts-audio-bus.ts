/**
 * Single-active TTS/audio coordination across Em Call, Today Brief, and Projects.
 * Any player that calls claimExclusive stops every other registered stopper first.
 */

type Stopper = () => void;

const stoppers = new Set<Stopper>();

export function registerTtsStopper(stop: Stopper): () => void {
  stoppers.add(stop);
  return () => {
    stoppers.delete(stop);
  };
}

/** Stop every registered TTS/audio player (except optionally one). */
export function stopAllTts(except?: Stopper) {
  for (const stop of Array.from(stoppers)) {
    if (except && stop === except) continue;
    try {
      stop();
    } catch {
      // ignore
    }
  }
}

export function claimExclusiveTts(self: Stopper) {
  stopAllTts(self);
}

let unlockAudioEl: HTMLAudioElement | null = null;
let audioUnlocked = false;

/**
 * Call synchronously from a user gesture (click/tap) before any await.
 * Unlocks HTMLAudioElement.play() for later TTS after async work.
 */
export function unlockTtsAudio(): void {
  if (typeof window === "undefined") return;

  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      void ctx.resume().finally(() => {
        void ctx.close().catch(() => undefined);
      });
    }

    if (!unlockAudioEl) {
      unlockAudioEl = new Audio(
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA=="
      );
      unlockAudioEl.preload = "auto";
      unlockAudioEl.volume = 0.01;
    }

    void unlockAudioEl
      .play()
      .then(() => {
        unlockAudioEl?.pause();
        if (unlockAudioEl) unlockAudioEl.currentTime = 0;
        audioUnlocked = true;
      })
      .catch(() => {
        // Gesture was present; mark unlocked so later play() is still attempted.
        audioUnlocked = true;
      });
  } catch {
    audioUnlocked = true;
  }
}
