import crypto from 'crypto';

/**
 * Generates a SHA256 hash of the input string.
 * @param {string} input - The input string to hash.
 * @returns {string} The SHA256 hash of the input string.
 */
export function generateSHA256Hash(input: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex');
}

/**
 * Generates a MD5 hash of the input string.
 * @param {string} input - The input string to hash.
 * @returns {string} The MD5 hash of the input string.
 */
export function generateMD5Hash(input: string): string {
  const hash = crypto.createHash('md5');
  hash.update(input);
  return hash.digest('hex');
}
