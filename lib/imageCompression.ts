// Image compression — resize + re-encode photos before upload.
//
// Why we need this: phone cameras produce enormous images (4032×3024,
// ~4MB per photo). The app displays them at ~180px thumbnails and
// maybe full-screen on an Entry Detail view. Uploading the raw file
// wastes bandwidth on the phone, storage in Supabase, and download
// bandwidth every time the photo is viewed.
//
// Think of it like shrinking a movie poster down to fit in your
// wallet — you lose detail you couldn't see at that size anyway.
//
// Pipeline:
//   1. Resize so the longest edge is ~1600px (plenty for mobile viewing)
//   2. Re-encode as JPEG at 0.8 quality (visually identical, ~5–10x smaller)
//   3. Read the new file size so we can store accurate metadata
//
// HEIC (Apple's default format) auto-converts to JPEG as a side effect
// of the format option. Android photos (already JPEG) re-encode through
// the same path with no format change.

import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { File as ExpoFile } from 'expo-file-system';

export type CompressedPhoto = {
  /** Local file URI of the compressed JPEG (safe to pass to upload). */
  uri: string;
  /** Compressed image width in pixels. */
  width: number;
  /** Compressed image height in pixels. */
  height: number;
  /** Compressed file size in bytes. */
  size: number;
};

export type CompressOptions = {
  /** Longest edge in pixels after resize. Default 1600. */
  maxEdge?: number;
  /** JPEG quality 0–1. Default 0.8. */
  quality?: number;
};

/**
 * Resize and re-encode a photo for upload.
 *
 * @param fileUri - Local file URI from expo-image-picker (`asset.uri`)
 * @param opts - Optional overrides for max edge / quality
 * @returns The compressed file URI plus its dimensions and byte size
 */
export async function compressPhoto(
  fileUri: string,
  opts: CompressOptions = {},
): Promise<CompressedPhoto> {
  const maxEdge = opts.maxEdge ?? 1600;
  const quality = opts.quality ?? 0.8;

  // manipulateAsync takes an array of transforms. We only resize here;
  // passing { width: maxEdge } without a height tells it to preserve
  // the aspect ratio automatically. If the source is already smaller
  // than maxEdge on both sides, the resize is effectively a re-encode
  // at the lower quality, which still saves significant bytes.
  const result = await manipulateAsync(
    fileUri,
    [{ resize: { width: maxEdge } }],
    { compress: quality, format: SaveFormat.JPEG },
  );

  // manipulateAsync doesn't report file size in its result, so read it
  // from the output file. ExpoFile.size is synchronous — it reads the
  // file metadata at construction time.
  const outputFile = new ExpoFile(result.uri);
  const size = outputFile.size;

  return {
    uri: result.uri,
    width: result.width,
    height: result.height,
    size,
  };
}
