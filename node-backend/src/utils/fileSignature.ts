/**
 * Binary Magic-Byte File Signature Validator & Malware Threat Gate
 * Validates actual binary headers and deep content streams of uploaded buffers
 * to prevent malware disguise, weaponized active PDF streams, disguised archives,
 * client-spoofed MIME types, and executable/script polyglot attacks.
 */

export interface SignatureValidationResult {
  valid: boolean;
  detectedType?: string;
  error?: string;
}

/**
 * Checks if the buffer starts with the expected magic bytes
 */
const matchesSignature = (buffer: Buffer, signature: number[], offset = 0): boolean => {
  if (buffer.length < offset + signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (buffer[offset + i] !== signature[i]) return false;
  }
  return true;
};

// Known archive & executable magic headers that must NEVER disguise as media
const ARCHIVE_AND_EXEC_SIGNATURES = [
  { name: 'ZIP / APK / JAR Archive', sig: [0x50, 0x4B, 0x03, 0x04] },
  { name: 'ZIP Empty Archive', sig: [0x50, 0x4B, 0x05, 0x06] },
  { name: 'ZIP Spanned Archive', sig: [0x50, 0x4B, 0x07, 0x08] },
  { name: 'RAR Archive', sig: [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07] },
  { name: '7-Zip Archive', sig: [0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C] },
  { name: 'Windows PE Executable (EXE/DLL)', sig: [0x4D, 0x5A] }, // "MZ"
  { name: 'Linux ELF Executable', sig: [0x7F, 0x45, 0x4C, 0x46] }, // "\x7FELF"
  { name: 'Mach-O Binary (macOS)', sig: [0xFE, 0xED, 0xFA, 0xCE] },
  { name: 'Mach-O Binary 64-bit', sig: [0xFE, 0xED, 0xFA, 0xCF] }
];

/**
 * Inspects raw file bytes to verify genuine file type and reject weaponized payloads
 */
export const validateFileSignature = (buffer: Buffer, declaredMime: string): SignatureValidationResult => {
  if (!buffer || buffer.length < 4) {
    return { valid: false, error: 'File buffer is empty or too small to verify.' };
  }

  const mime = (declaredMime || '').toLowerCase().trim();

  // 0. Defense-in-Depth: Reject any file starting with executable or archive magic headers
  for (const item of ARCHIVE_AND_EXEC_SIGNATURES) {
    if (matchesSignature(buffer, item.sig)) {
      return {
        valid: false,
        error: `Security violation: File begins with ${item.name} header and cannot be uploaded as media.`
      };
    }
  }

  // 1. PDF Documents: Must begin with "%PDF" (0x25 0x50 0x44 0x46)
  if (mime === 'application/pdf') {
    const isPdf = matchesSignature(buffer, [0x25, 0x50, 0x44, 0x46]);
    if (!isPdf) {
      return { valid: false, error: 'Invalid document: File does not have a valid PDF binary signature.' };
    }

    // Deep Malware Gate: Scan PDF byte stream for weaponized active execution vectors
    // Attackers use /JavaScript, /JS, /Launch, /EmbeddedFiles, or /OpenAction to execute arbitrary code
    const pdfTextSample = buffer.subarray(0, Math.min(buffer.length, 2 * 1024 * 1024)).toString('binary');
    const dangerousPdfVectors = [
      '/JavaScript',
      '/JS',
      '/Launch',
      '/EmbeddedFiles',
      '/OpenAction'
    ];

    for (const vector of dangerousPdfVectors) {
      // Check case-insensitive pattern for PDF name objects
      const regex = new RegExp(vector.replace('/', '\\/'), 'i');
      if (regex.test(pdfTextSample)) {
        return {
          valid: false,
          error: `Potentially malicious PDF rejected: Embedded active executable stream (${vector}) detected.`
        };
      }
    }

    return { valid: true, detectedType: 'application/pdf' };
  }

  // 2. JPEG / JPG Images: SOI marker 0xFF 0xD8 0xFF
  if (mime === 'image/jpeg' || mime === 'image/jpg') {
    const isJpeg = matchesSignature(buffer, [0xFF, 0xD8, 0xFF]);
    if (!isJpeg) {
      return { valid: false, error: 'Invalid image: File does not have a valid JPEG binary signature.' };
    }
    return { valid: true, detectedType: 'image/jpeg' };
  }

  // 3. PNG Images: 0x89 'P' 'N' 'G' 0x0D 0x0A 0x1A 0x0A
  if (mime === 'image/png') {
    const isPng = matchesSignature(buffer, [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (!isPng) {
      return { valid: false, error: 'Invalid image: File does not have a valid PNG binary signature.' };
    }
    return { valid: true, detectedType: 'image/png' };
  }

  // 4. WebP Images: Starts with 'RIFF' and has 'WEBP' at offset 8
  if (mime === 'image/webp') {
    const isRiff = matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46]); // "RIFF"
    const isWebp = matchesSignature(buffer, [0x57, 0x45, 0x42, 0x50], 8); // "WEBP"
    if (!isRiff || !isWebp) {
      return { valid: false, error: 'Invalid image: File does not have a valid WebP binary signature.' };
    }
    return { valid: true, detectedType: 'image/webp' };
  }

  // 5. Audio: MP3 (ID3 or sync word 0xFF 0xFB/0xF3/0xF2)
  if (mime === 'audio/mpeg' || mime === 'audio/mp3') {
    const isId3 = matchesSignature(buffer, [0x49, 0x44, 0x33]); // "ID3"
    const isMp3Sync = buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0;
    if (!isId3 && !isMp3Sync) {
      return { valid: false, error: 'Invalid audio: File does not have a valid MP3 audio signature.' };
    }
    return { valid: true, detectedType: 'audio/mpeg' };
  }

  // 6. Audio: WAV (RIFF....WAVE)
  if (mime === 'audio/wav' || mime === 'audio/x-wav') {
    const isRiff = matchesSignature(buffer, [0x52, 0x49, 0x46, 0x46]);
    const isWave = matchesSignature(buffer, [0x57, 0x41, 0x56, 0x45], 8);
    if (!isRiff || !isWave) {
      return { valid: false, error: 'Invalid audio: File does not have a valid WAV audio signature.' };
    }
    return { valid: true, detectedType: 'audio/wav' };
  }

  // 7. Audio: OGG ("OggS" -> 0x4F 0x67 0x67 0x53)
  if (mime === 'audio/ogg') {
    const isOgg = matchesSignature(buffer, [0x4F, 0x67, 0x67, 0x53]);
    if (!isOgg) {
      return { valid: false, error: 'Invalid audio: File does not have a valid OGG audio signature.' };
    }
    return { valid: true, detectedType: 'audio/ogg' };
  }

  // 8. Audio / Video Container: MP4 / M4A / WebM
  if (mime === 'audio/mp4' || mime === 'audio/x-m4a') {
    // "ftyp" at offset 4
    const isFtyp = matchesSignature(buffer, [0x66, 0x74, 0x79, 0x70], 4);
    if (!isFtyp) {
      return { valid: false, error: 'Invalid audio: File does not have a valid M4A/MP4 container signature.' };
    }
    return { valid: true, detectedType: 'audio/mp4' };
  }

  if (mime === 'audio/webm') {
    // EBML header (0x1A 0x45 0xDF 0xA3)
    const isEbml = matchesSignature(buffer, [0x1A, 0x45, 0xDF, 0xA3]);
    if (!isEbml) {
      return { valid: false, error: 'Invalid audio: File does not have a valid WebM audio signature.' };
    }
    return { valid: true, detectedType: 'audio/webm' };
  }

  // Block any dangerous embedded scripts (HTML / SVG / PHP / script markers) inside file header
  const sample = buffer.subarray(0, Math.min(buffer.length, 2048)).toString('utf8').toLowerCase();
  if (
    sample.includes('<html') ||
    sample.includes('<script') ||
    sample.includes('<?php') ||
    sample.includes('<svg') ||
    sample.includes('<!doctype') ||
    sample.includes('javascript:') ||
    sample.includes('vbscript:') ||
    sample.includes('onload=') ||
    sample.includes('onerror=')
  ) {
    return { valid: false, error: 'Executable script, SVG, or HTML markup detected within file payload.' };
  }

  return { valid: true };
};

/**
 * Sanitizes file names to prevent path traversal and null-byte injection
 */
export const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[\0\x00-\x1f\x7f]/g, '') // remove control chars & null bytes
    .replace(/\.\.+[/\\]/g, '')        // remove path traversal sequences (../, ..\)
    .replace(/[<>:"/\\|?*]/g, '_')     // replace reserved filename characters
    .trim()
    .slice(0, 100);                    // bound max filename length
};
