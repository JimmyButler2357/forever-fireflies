// Audio player hook — wraps expo-av into a clean playback
// interface for entry detail.
//
// Think of this like a remote control for a tape player.
// You load a tape (audio URL), press play, pause, or drag
// the scrub bar to a specific spot. The hook reports back
// where you are in the recording (position) and how long
// the whole thing is (duration).
//
// Usage:
//   const player = useAudioPlayer();
//   await player.load(signedUrl);
//   player.play();
//   player.pause();
//   player.seek(15000); // jump to 15 seconds
//   // player.position, player.duration update in real-time
//   player.cleanup(); // when done

import { useState, useRef, useCallback, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

interface UseAudioPlayerResult {
  /** Load an audio file from a URL (e.g. a signed Supabase URL). */
  load: (uri: string) => Promise<void>;
  /** Start or resume playback. */
  play: () => Promise<void>;
  /** Pause playback. */
  pause: () => Promise<void>;
  /** Jump to a specific position (in milliseconds). */
  seek: (positionMs: number) => Promise<void>;
  /** Whether audio is currently playing. */
  isPlaying: boolean;
  /** Current playback position in milliseconds. */
  position: number;
  /** Total duration of the audio in milliseconds. */
  duration: number;
  /** Whether the audio file has been loaded and is ready. */
  isLoaded: boolean;
  /** Any error that occurred during loading or playback. */
  error: string | null;
  /** Unload the audio and free resources. Called automatically on unmount. */
  cleanup: () => Promise<void>;
}

export function useAudioPlayer(): UseAudioPlayerResult {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // We keep the Sound object in a ref (not state) because
  // it's a mutable object that we call methods on — we
  // don't want React re-rendering every time we interact
  // with it, only when the status changes.
  const soundRef = useRef<Audio.Sound | null>(null);

  // ─── Status Callback ──────────────────────────────────
  //
  // expo-av calls this function every ~500ms (and on every
  // state change) to tell us where we are. We pull out the
  // relevant fields and put them into React state so the
  // UI re-renders with fresh position/duration.

  const onPlaybackStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      // The audio has been unloaded or failed to load
      if (status.error) {
        setError(`Playback error: ${status.error}`);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setPosition(status.positionMillis);
    setDuration(status.durationMillis ?? 0);

    // When the recording finishes playing, reset to the start
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  }, []);

  // ─── Actions ──────────────────────────────────────────

  const load = useCallback(async (uri: string) => {
    // Clean up any previously loaded sound
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }

    setError(null);
    setIsLoaded(false);
    setPosition(0);
    setDuration(0);

    try {
      // Configure the audio session before creating any Sound.
      // Without this, Android refuses audio focus and play()
      // fails with AudioFocusNotAcquiredException; iOS falls
      // silent in silent mode. Safe to call on every load —
      // expo-av dedupes identical configs.
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false }, // Don't auto-play on load
        onPlaybackStatusUpdate,
      );
      soundRef.current = sound;
      setIsLoaded(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load audio';
      setError(msg);
    }
  }, [onPlaybackStatusUpdate]);

  const play = useCallback(async () => {
    if (!soundRef.current) return;
    setIsPlaying(true); // Optimistic — update UI instantly, don't wait for native callback
    try {
      await soundRef.current.playAsync();
    } catch (err) {
      setIsPlaying(false); // Rollback — native play failed, undo the optimistic update
      console.warn('Play failed:', err);
    }
  }, []);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    setIsPlaying(false); // Optimistic — update UI instantly, don't wait for native callback
    try {
      await soundRef.current.pauseAsync();
    } catch (err) {
      setIsPlaying(true); // Rollback — native pause failed, undo the optimistic update
      console.warn('Pause failed:', err);
    }
  }, []);

  const seek = useCallback(async (positionMs: number) => {
    if (!soundRef.current) return;
    try {
      await soundRef.current.setPositionAsync(positionMs);
    } catch (err) {
      console.warn('Seek failed:', err);
    }
  }, []);

  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
    }
    setIsLoaded(false);
    setIsPlaying(false);
    setPosition(0);
    setDuration(0);
  }, []);

  // Auto-cleanup when the component unmounts — just like
  // turning off the tape player when you leave the room.
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  return {
    load,
    play,
    pause,
    seek,
    isPlaying,
    position,
    duration,
    isLoaded,
    error,
    cleanup,
  };
}
