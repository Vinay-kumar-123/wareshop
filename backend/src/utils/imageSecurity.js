const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const STRIPPED_PNG_CHUNKS = new Set(['eXIf', 'tEXt', 'zTXt', 'iTXt', 'tIME']);
const SOF_MARKERS = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function createValidationError(message) {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
}

/**
 * Detects image format from magic bytes (file signature).
 */
export function detectImageMimeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) {
    return null;
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return 'image/png';
  }

  // WebP: RIFF....WEBP
  if (
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Validates JPEG structure and strips APP1..APP15 (EXIF/GPS/XMP) and COM segments.
 */
function sanitizeJpegBuffer(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw createValidationError('Invalid JPEG file header.');
  }

  const keepSegments = [buffer.subarray(0, 2)]; // SOI (FF D8)
  let offset = 2;
  let hasSof = false;
  let hasSos = false;

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      throw createValidationError('Malformed JPEG segment marker.');
    }

    // Skip padding 0xFF bytes
    while (offset < buffer.length && buffer[offset] === 0xff) {
      offset++;
    }
    if (offset >= buffer.length) break;

    const marker = buffer[offset];
    offset++;

    // Standalone markers without length
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      keepSegments.push(Buffer.from([0xff, marker]));
      continue;
    }

    // EOI (End of Image)
    if (marker === 0xd9) {
      keepSegments.push(Buffer.from([0xff, 0xd9]));
      break;
    }

    if (offset + 2 > buffer.length) {
      throw createValidationError('Truncated JPEG segment length.');
    }

    const segLength = buffer.readUInt16BE(offset);
    if (segLength < 2 || offset + segLength > buffer.length) {
      throw createValidationError('Invalid or truncated JPEG segment.');
    }

    if (SOF_MARKERS.has(marker)) {
      if (segLength < 7) {
        throw createValidationError('Invalid JPEG Start-Of-Frame segment.');
      }
      const height = buffer.readUInt16BE(offset + 3);
      const width = buffer.readUInt16BE(offset + 5);
      if (width < 1 || height < 1 || width > 12000 || height > 12000) {
        throw createValidationError('Invalid JPEG image dimensions.');
      }
      hasSof = true;
    }

    // Strip APP1..APP15 (0xE1..0xEF, includes EXIF & XMP) and COM (0xFE)
    const shouldStrip = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;

    if (!shouldStrip) {
      keepSegments.push(Buffer.from([0xff, marker]));
      keepSegments.push(buffer.subarray(offset, offset + segLength));
    }

    offset += segLength;

    // SOS (Start of Scan): remainder up to EOI is entropy-coded image data
    if (marker === 0xda) {
      hasSos = true;
      keepSegments.push(buffer.subarray(offset));
      break;
    }
  }

  if (!hasSof || !hasSos) {
    throw createValidationError('Uploaded file is not a complete, valid JPEG image.');
  }

  return Buffer.concat(keepSegments);
}

/**
 * Validates PNG chunks and strips eXIf, tEXt, zTXt, iTXt, and tIME metadata chunks.
 */
function sanitizePngBuffer(buffer) {
  if (buffer.length < 33 || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw createValidationError('Invalid PNG file signature.');
  }

  const keepChunks = [buffer.subarray(0, 8)];
  let offset = 8;
  let seenIhdr = false;
  let seenIdat = false;
  let seenIend = false;

  while (offset + 8 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const totalChunkSize = 4 + 4 + length + 4; // length + type + data + crc

    if (offset + totalChunkSize > buffer.length) {
      throw createValidationError('Truncated or corrupted PNG chunk.');
    }

    if (!seenIhdr) {
      if (type !== 'IHDR' || length !== 13) {
        throw createValidationError('PNG file is missing a valid IHDR header.');
      }
      const width = buffer.readUInt32BE(offset + 8);
      const height = buffer.readUInt32BE(offset + 12);
      if (width < 1 || height < 1 || width > 12000 || height > 12000) {
        throw createValidationError('Invalid PNG image dimensions.');
      }
      seenIhdr = true;
    }

    if (type === 'IDAT') seenIdat = true;
    if (type === 'IEND') seenIend = true;

    if (!STRIPPED_PNG_CHUNKS.has(type)) {
      keepChunks.push(buffer.subarray(offset, offset + totalChunkSize));
    }

    offset += totalChunkSize;
    if (type === 'IEND') break;
  }

  if (!seenIhdr || !seenIdat || !seenIend) {
    throw createValidationError('Uploaded file is not a complete, valid PNG image.');
  }

  return Buffer.concat(keepChunks);
}

/**
 * Validates WebP RIFF container and strips EXIF and XMP metadata chunks.
 */
function sanitizeWebpBuffer(buffer) {
  if (
    buffer.length < 20 ||
    buffer.toString('ascii', 0, 4) !== 'RIFF' ||
    buffer.toString('ascii', 8, 12) !== 'WEBP'
  ) {
    throw createValidationError('Invalid WebP file header.');
  }

  const keepChunks = [];
  let offset = 12;
  let hasImageChunk = false;

  while (offset + 8 <= buffer.length) {
    const fourCC = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const paddedSize = chunkSize + (chunkSize % 2);
    const nextOffset = offset + 8 + paddedSize;

    if (nextOffset > buffer.length) {
      throw createValidationError('Truncated or corrupted WebP chunk.');
    }

    if (fourCC === 'VP8 ' || fourCC === 'VP8L' || fourCC === 'VP8X') {
      hasImageChunk = true;
    }

    if (fourCC !== 'EXIF' && fourCC !== 'XMP ') {
      keepChunks.push(buffer.subarray(offset, nextOffset));
    }

    offset = nextOffset;
  }

  if (!hasImageChunk) {
    throw createValidationError('Uploaded file is not a valid WebP image.');
  }

  const payload = Buffer.concat(keepChunks);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 4, 'ascii');
  header.writeUInt32LE(4 + payload.length, 4);
  header.write('WEBP', 8, 4, 'ascii');

  return Buffer.concat([header, payload]);
}

/**
 * Validates MIME type, magic bytes, structural integrity, and strips EXIF/metadata.
 */
export function validateAndSanitizeImage(file, allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp']) {
  if (!file || !Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
    throw createValidationError('No valid image file buffer provided.');
  }

  const declaredMime = String(file.mimetype || '').toLowerCase().trim();
  if (!allowedMimeTypes.includes(declaredMime)) {
    throw createValidationError('Unsupported file format. Only JPEG, PNG, and WebP images are permitted.');
  }

  const detectedMime = detectImageMimeType(file.buffer);
  if (!detectedMime || !allowedMimeTypes.includes(detectedMime)) {
    throw createValidationError(
      'File signature validation failed. The uploaded file is not a genuine JPEG, PNG, or WebP image.'
    );
  }

  if (declaredMime !== detectedMime) {
    throw createValidationError(
      `File content (${detectedMime}) does not match declared file type (${declaredMime}).`
    );
  }

  let cleanBuffer;
  if (detectedMime === 'image/jpeg') {
    cleanBuffer = sanitizeJpegBuffer(file.buffer);
  } else if (detectedMime === 'image/png') {
    cleanBuffer = sanitizePngBuffer(file.buffer);
  } else {
    cleanBuffer = sanitizeWebpBuffer(file.buffer);
  }

  return {
    buffer: cleanBuffer,
    mimeType: detectedMime,
    size: cleanBuffer.length,
  };
}

export default { detectImageMimeType, validateAndSanitizeImage };
