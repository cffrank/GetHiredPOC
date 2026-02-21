/**
 * Magic byte file validation — verifies actual file content matches declared MIME type.
 *
 * IMPORTANT: Call this BEFORE reading the full file buffer. Pass only the first 8 bytes
 * (use file.slice(0, 8).arrayBuffer()) to avoid loading rejected files into memory.
 */

/**
 * Validates a file's magic bytes against its declared MIME type.
 *
 * @param buffer - ArrayBuffer containing at least the first 8 bytes of the file
 * @param declaredType - The MIME type declared by the client (file.type)
 * @returns true if the file content matches the declared type, false otherwise
 */
export function validateFileMagicBytes(buffer: ArrayBuffer, declaredType: string): boolean {
  const bytes = new Uint8Array(buffer.slice(0, 8));

  if (declaredType === 'application/pdf') {
    // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
    return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  }

  if (declaredType === 'text/plain') {
    // For text/plain, verify the first 1024 bytes decode as valid UTF-8
    try {
      new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(buffer.slice(0, 1024));
      return true;
    } catch {
      return false;
    }
  }

  // Unsupported declared type — reject to be safe
  return false;
}
