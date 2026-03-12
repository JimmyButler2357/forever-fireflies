// WAV audio concatenation — merges multiple .wav files into one.
//
// Why we need this: expo-speech-recognition has no native pause/resume.
// When you call stop(), it finalizes the audio file. To "resume," we
// start a new session (creating a new file). At the end, we stitch
// all the segments together into a single .wav.
//
// Think of it like splicing tape cassettes end-to-end: rip off each
// cassette's label (the WAV header), glue all the tape together,
// then slap one new label on the front with the updated total length.
//
// This works because all segments come from the same device, so they
// share identical format (sample rate, channels, bit depth). A WAV
// file is just a 44-byte header + raw audio data (PCM). To combine:
//   1. Keep the header from the first file
//   2. Strip headers from all files, concatenate the raw data
//   3. Update the size fields in the header to reflect the new total

import { File, Paths } from 'expo-file-system';

const WAV_HEADER_SIZE = 44;

/**
 * Concatenate multiple WAV files into a single WAV file.
 *
 * @param uris - Local file URIs of WAV segments (in order)
 * @returns URI of the combined WAV file (in the cache directory)
 */
export async function concatWavFiles(uris: string[]): Promise<string> {
  // If there's only one segment, no work needed — just return it.
  if (uris.length <= 1) return uris[0];

  // Read all files into ArrayBuffers.
  // Think of each ArrayBuffer as a raw byte array — the entire
  // file contents sitting in memory as numbers.
  const buffers: ArrayBuffer[] = [];
  for (const uri of uris) {
    const file = new File(uri);
    const ab = await file.arrayBuffer();
    buffers.push(ab);
  }

  // Calculate the total size of raw audio data (everything after
  // the 44-byte header in each file).
  let totalDataSize = 0;
  for (const buf of buffers) {
    totalDataSize += buf.byteLength - WAV_HEADER_SIZE;
  }

  // Build the combined file: one header + all raw data concatenated.
  const combined = new Uint8Array(WAV_HEADER_SIZE + totalDataSize);

  // Copy the header from the first file — it has the format info
  // (sample rate, channels, bit depth) that applies to all segments.
  const firstHeader = new Uint8Array(buffers[0], 0, WAV_HEADER_SIZE);
  combined.set(firstHeader, 0);

  // Copy raw audio data from each file (skipping each file's header).
  let offset = WAV_HEADER_SIZE;
  for (const buf of buffers) {
    const rawData = new Uint8Array(buf, WAV_HEADER_SIZE);
    combined.set(rawData, offset);
    offset += rawData.byteLength;
  }

  // Update the two size fields in the WAV header:
  //
  // Bytes 4-7: "RIFF chunk size" = total file size minus 8
  //   (the 8 bytes for "RIFF" + this size field itself)
  //
  // Bytes 40-43: "data chunk size" = total raw audio data size
  //
  // Both are little-endian 32-bit integers. "Little-endian" means
  // the least significant byte comes first — like writing "1234"
  // as "4321". WAV uses this because Intel CPUs read it natively.
  const view = new DataView(combined.buffer);
  view.setUint32(4, combined.byteLength - 8, true);   // RIFF size
  view.setUint32(40, totalDataSize, true);             // data size

  // Write the combined file to cache.
  const outFile = new File(Paths.cache, `recording_combined_${Date.now()}.wav`);
  await outFile.write(combined);

  return outFile.uri;
}

/**
 * Calculate the duration of a WAV file from its header.
 *
 * Reads the sample rate, channels, and bit depth from the header,
 * then computes: dataSize / (sampleRate * channels * bytesPerSample).
 *
 * @param uri - Local file URI of a WAV file
 * @returns Duration in seconds
 */
export async function getWavDurationSeconds(uri: string): Promise<number> {
  const file = new File(uri);
  const ab = await file.arrayBuffer();
  const view = new DataView(ab);

  // WAV header layout (all little-endian):
  // Offset 24-27: sample rate (e.g. 16000 or 44100)
  // Offset 22-23: number of channels (1 = mono, 2 = stereo)
  // Offset 34-35: bits per sample (e.g. 16)
  // Offset 40-43: data chunk size in bytes
  const sampleRate = view.getUint32(24, true);
  const channels = view.getUint16(22, true);
  const bitsPerSample = view.getUint16(34, true);
  const dataSize = view.getUint32(40, true);

  // bytes per second = sampleRate * channels * (bitsPerSample / 8)
  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  if (bytesPerSecond === 0) return 0;

  return dataSize / bytesPerSecond;
}
