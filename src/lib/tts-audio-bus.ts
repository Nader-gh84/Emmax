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

/**
 * Stop every other registered player. `self` MUST be the same function
 * reference passed to `registerTtsStopper` — a fresh lambda will not match
 * and will incorrectly stop the caller mid-play.
 */
export function claimExclusiveTts(self: Stopper) {
  stopAllTts(self);
}

let unlockAudioEl: HTMLAudioElement | null = null;
let audioUnlocked = false;

export function isTtsAudioUnlocked(): boolean {
  return audioUnlocked;
}

/**
 * Call synchronously from a user gesture (click/tap) before any await.
 * Unlocks autoplay via a dedicated silent element + AudioContext resume.
 *
 * Do NOT play/pause the caller's TTS element here — that races with the real
 * playback path (play → unlock pause → status stuck on "playing" with silence).
 */
export function unlockTtsAudio(_target?: HTMLAudioElement | null): void {
  if (typeof window === "undefined") return;
  void _target;

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
