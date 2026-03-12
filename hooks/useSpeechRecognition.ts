// Speech recognition hook — wraps expo-speech-recognition into
// a clean, reusable interface with pause/resume support.
//
// Think of this like a "translator" that sits between your
// phone's microphone and your app. You speak, and it:
// 1. Captures the audio (saved as a .wav file)
// 2. Converts speech to text in real-time (interim results)
// 3. Gives you the final transcript when you stop
//
// Pause/resume works by stopping and restarting the speech engine
// internally. Each stop produces a separate audio file (segment).
// When the user finally stops for real, all segments get stitched
// together into one continuous .wav file using concatWavFiles.
//
// Think of it like a tape recorder with a pause button — when
// paused, we actually stop the tape and start a fresh one. At
// the end, we splice all the tapes together so it sounds like
// one uninterrupted recording.
//
// Usage:
//   const { start, stop, pause, resume, transcript, isRecording, isPaused, audioUri } = useSpeechRecognition();
//   // Tap mic → start()
//   // Show transcript on screen while recording
//   // Tap pause → pause() (timer stops, animations freeze)
//   // Tap resume → resume() (continues recording)
//   // Tap stop → stop()
//   // Use audioUri to upload the recording, transcript for the text

import { useState, useCallback, useRef } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';
import { concatWavFiles } from '@/lib/audioConcat';

interface UseSpeechRecognitionOptions {
  /**
   * Hint strings to bias the speech engine toward specific words
   * (e.g. children's names). Callers should memoize this array
   * with useMemo to avoid unnecessary useCallback recreation.
   *
   * - iOS: maps to SFSpeechRecognitionRequest.contextualStrings
   * - Android: maps to EXTRA_BIASING_STRINGS (API 33+)
   */
  contextualStrings?: string[];
}

interface UseSpeechRecognitionResult {
  /** Start listening. Requests permissions if needed. */
  start: () => Promise<void>;
  /** Stop listening and finalize the transcript. */
  stop: () => void;
  /** Pause recording — stops the engine but keeps the session open. */
  pause: () => void;
  /** Resume recording after a pause — starts a new engine session. */
  resume: () => Promise<void>;
  /** The current transcript — updates in real-time as you speak. */
  transcript: string;
  /** Whether the mic is actively listening. */
  isRecording: boolean;
  /** Whether the recording is paused (between pause and resume). */
  isPaused: boolean;
  /** The local file path of the recorded audio (available after stop). */
  audioUri: string | null;
  /** Any error that occurred during recording. */
  error: string | null;
  /** Reset everything back to initial state (for re-recording). */
  reset: () => void;
}

export function useSpeechRecognition(
  options?: UseSpeechRecognitionOptions,
): UseSpeechRecognitionResult {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  // Accumulates finalized (done) speech segments across pauses.
  // Using a ref instead of state so the event handler always
  // reads the latest value — no stale closure problem.
  // Think of it like a "finished pile" of transcript pages.
  const finalizedRef = useRef('');

  // ─── Pause/Resume Refs ──────────────────────────────────
  //
  // These refs track the internal state of pause/resume so
  // event handlers (which capture values at registration time)
  // always read the latest values instead of stale ones.

  // Is the user currently paused? Checked in 'end' handler
  // to decide whether to set isRecording=false.
  const isPausedRef = useRef(false);

  // Collects file URIs from each audio segment. When the user
  // pauses, the current segment's URI gets pushed here. On
  // final stop, these all get concatenated into one file.
  // Think of it like a stack of tape cassettes.
  const segmentUrisRef = useRef<string[]>([]);

  // True from start() until final stop(). Lets us distinguish
  // "paused" (session still going) from "done" (session over).
  const sessionActiveRef = useRef(false);

  // ─── Event Listeners ──────────────────────────────────
  //
  // These hooks automatically register/unregister listeners
  // when the component mounts/unmounts. They're provided by
  // expo-speech-recognition and work like React's useEffect.

  // Fired when the recognition engine starts listening.
  // This fires both on initial start AND on resume (since
  // resume internally calls start again).
  useSpeechRecognitionEvent('start', () => {
    setIsRecording(true);
    setError(null);
  });

  // Fired when the recognition engine stops (either by
  // calling stop() or when it times out).
  //
  // With pause/resume, this fires on EVERY pause too (since
  // pause internally calls stop). We only want to set
  // isRecording=false on the FINAL stop — not on pauses.
  useSpeechRecognitionEvent('end', () => {
    if (isPausedRef.current) {
      // User paused — they're still conceptually recording.
      // Don't touch isRecording. The engine stopped but the
      // session is still alive.
      return;
    }
    setIsRecording(false);
  });

  // Fired whenever the engine has new text to show.
  // `event.isFinal` means the engine is confident and done
  // processing that chunk. Interim results (isFinal=false)
  // are "best guesses" that may change.
  //
  // In continuous mode, each pause creates a NEW segment —
  // previous segments are NOT included in the event. So we
  // accumulate finalized segments in `finalizedRef` and
  // always show: [all finished segments] + [current segment].
  //
  // This works across pause/resume too — finalizedRef is NOT
  // reset on resume, so transcript keeps growing.
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (!text) return;

    if (event.isFinal) {
      // This segment is done — add it to the finished pile.
      // Add a space between segments so words don't smash together.
      finalizedRef.current = finalizedRef.current
        ? `${finalizedRef.current} ${text}`
        : text;
      setTranscript(finalizedRef.current);
    } else {
      // Still in-progress — show the pile + what they're saying now.
      setTranscript(
        finalizedRef.current
          ? `${finalizedRef.current} ${text}`
          : text
      );
    }
  });

  // Fired if something goes wrong — mic access denied,
  // network error (for cloud recognition), etc.
  useSpeechRecognitionEvent('error', (event) => {
    setError(event.message);
    setIsRecording(false);
  });

  // Fired when the audio file is done being written.
  // Before this event, the file may be incomplete.
  //
  // With pause/resume, this fires for EACH segment. We collect
  // all segment URIs and only set audioUri on the final one
  // (after concatenating if needed).
  useSpeechRecognitionEvent('audioend', (event) => {
    if (!event.uri) return;

    // Add this segment's URI to our collection.
    segmentUrisRef.current.push(event.uri);

    // If the session is still active (user just paused, not
    // fully stopped), don't set audioUri yet — more segments
    // may come.
    if (sessionActiveRef.current) return;

    // Session is over — this is the last segment. Time to
    // combine all segments into one file.
    if (segmentUrisRef.current.length > 1) {
      // Multiple segments → concatenate into one .wav file.
      concatWavFiles(segmentUrisRef.current)
        .then((uri) => setAudioUri(uri))
        .catch((err) => {
          console.warn('Failed to concatenate audio segments:', err);
          // Fallback: use the last segment at least
          setAudioUri(event.uri!);
        });
    } else {
      // Single segment — use it directly (no concat needed).
      setAudioUri(segmentUrisRef.current[0]);
    }
  });

  // ─── Actions ──────────────────────────────────────────

  const start = useCallback(async () => {
    // Reset state from any previous recording
    finalizedRef.current = '';
    segmentUrisRef.current = [];
    sessionActiveRef.current = true;
    isPausedRef.current = false;
    setTranscript('');
    setAudioUri(null);
    setError(null);
    setIsPaused(false);

    // Check permissions first. On iOS, this triggers the
    // native "Allow microphone?" and "Allow speech recognition?"
    // dialogs if the user hasn't already granted them.
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      setError('Microphone permission is required to record.');
      sessionActiveRef.current = false;
      return;
    }

    // Start the recognition engine with our config:
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',

      // Show text as the user speaks (not just at the end).
      interimResults: true,

      // Keep listening until we call stop() — don't auto-stop
      // after a pause in speech.
      continuous: true,

      // Add periods and commas automatically.
      addsPunctuation: true,

      // Bias the speech engine toward children's names so it
      // recognizes "Xiomara" instead of guessing "see a Mara."
      // If empty/undefined, the engine uses default vocabulary.
      ...(options?.contextualStrings?.length && {
        contextualStrings: options.contextualStrings,
      }),

      // Save the audio to a local file so we can upload it
      // to Supabase Storage later.
      recordingOptions: {
        persist: true,
        outputFileName: `recording_${Date.now()}.wav`,
      },
    });
  }, [options?.contextualStrings]);

  const stop = useCallback(() => {
    // Mark the session as done BEFORE calling stop() so the
    // audioend handler knows this is the final segment.
    sessionActiveRef.current = false;
    const wasPaused = isPausedRef.current;
    isPausedRef.current = false;
    setIsPaused(false);

    if (wasPaused) {
      // Engine already stopped from pause — no 'end' or 'audioend'
      // events will fire. Manually finalize: set isRecording=false
      // and concatenate any collected audio segments.
      setIsRecording(false);
      if (segmentUrisRef.current.length > 1) {
        concatWavFiles(segmentUrisRef.current)
          .then((uri) => setAudioUri(uri))
          .catch((err) => {
            console.warn('Failed to concatenate audio segments:', err);
            setAudioUri(segmentUrisRef.current[segmentUrisRef.current.length - 1]);
          });
      } else if (segmentUrisRef.current.length === 1) {
        setAudioUri(segmentUrisRef.current[0]);
      }
    } else {
      // Engine is running — stop it normally. 'end' and 'audioend'
      // events will fire and handle state transitions.
      ExpoSpeechRecognitionModule.stop();
    }
  }, []);

  const pause = useCallback(() => {
    // Mark as paused BEFORE calling stop() so the 'end' event
    // handler knows to skip setting isRecording=false.
    isPausedRef.current = true;
    setIsPaused(true);

    // Stop the engine — this triggers 'audioend' (saves the
    // current segment) then 'end' (which we now skip).
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const resume = useCallback(async () => {
    // Unpause — the 'start' event will fire and set isRecording=true.
    isPausedRef.current = false;
    setIsPaused(false);

    // Start a brand new speech engine session with a new output file.
    // We do NOT reset finalizedRef — transcript keeps accumulating
    // across all pause/resume cycles.
    ExpoSpeechRecognitionModule.start({
      lang: 'en-US',
      interimResults: true,
      continuous: true,
      addsPunctuation: true,
      ...(options?.contextualStrings?.length && {
        contextualStrings: options.contextualStrings,
      }),
      recordingOptions: {
        persist: true,
        outputFileName: `recording_${Date.now()}.wav`,
      },
    });
  }, [options?.contextualStrings]);

  const reset = useCallback(() => {
    finalizedRef.current = '';
    segmentUrisRef.current = [];
    sessionActiveRef.current = false;
    isPausedRef.current = false;
    setTranscript('');
    setAudioUri(null);
    setError(null);
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  return {
    start,
    stop,
    pause,
    resume,
    transcript,
    isRecording,
    isPaused,
    audioUri,
    error,
    reset,
  };
}
