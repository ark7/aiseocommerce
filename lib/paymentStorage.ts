import { promises as fs } from 'fs';
import path from 'path';

export const BASE_PROOF_DIR = path.resolve(process.cwd(), 'storage/proofs');

const MIME_EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'image/svg+xml': '.svg',
};

const EXTENSION_MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
};

/**
 * Sanitizes a storeId to ensure it contains only safe alphanumeric, underscore, or hyphen characters.
 * Prevents any directory traversal via storeId.
 */
export function sanitizeStoreId(storeId: string): string {
  if (!storeId || typeof storeId !== 'string') {
    throw new Error('Invalid storeId');
  }
  const sanitized = storeId.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!sanitized) {
    throw new Error('Invalid storeId after sanitization');
  }
  return sanitized;
}

/**
 * Sanitizes an uploaded filename by stripping path components, directory traversal tokens,
 * and dangerous characters, while preserving or applying a valid extension.
 */
export function sanitizeFilename(rawFilename?: string, defaultExt = '.jpg'): string {
  if (!rawFilename || typeof rawFilename !== 'string') {
    return `proof${defaultExt}`;
  }
  // Strip paths, null bytes, and parent dir references
  const basename = path.basename(rawFilename).replace(/\0/g, '');
  const clean = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  if (!clean) {
    return `proof${defaultExt}`;
  }
  const ext = path.extname(clean);
  if (!ext && defaultExt) {
    return `${clean}${defaultExt.startsWith('.') ? defaultExt : `.${defaultExt}`}`;
  }
  return clean;
}

/**
 * Gets the absolute directory path for a store's payment proofs.
 * Guarantees that the resolved path is located strictly within BASE_PROOF_DIR.
 */
export function getStoreProofDir(storeId: string): string {
  const safeStoreId = sanitizeStoreId(storeId);
  const storeDir = path.resolve(BASE_PROOF_DIR, safeStoreId);

  // Security guard: path traversal verification
  if (!storeDir.startsWith(BASE_PROOF_DIR + path.sep) && storeDir !== BASE_PROOF_DIR) {
    throw new Error('Security Error: Store proof directory traversal detected');
  }

  return storeDir;
}

export interface SaveProofParams {
  storeId: string;
  paymentId: string;
  buffer: Buffer;
  originalFilename?: string;
  mimeType?: string;
}

export interface SavedProofResult {
  filename: string;
  relativePath: string;
  absolutePath: string;
  size: number;
  mimeType: string;
}

/**
 * Saves a payment proof file to the tenant's isolated directory on the local server filesystem.
 */
export async function savePaymentProofFile({
  storeId,
  paymentId,
  buffer,
  originalFilename,
  mimeType = 'image/jpeg',
}: SaveProofParams): Promise<SavedProofResult> {
  const storeDir = getStoreProofDir(storeId);

  // Ensure store directory exists
  await fs.mkdir(storeDir, { recursive: true });

  const safeOriginalName = sanitizeFilename(originalFilename);
  const extFromOriginal = path.extname(safeOriginalName).toLowerCase();
  const ext = extFromOriginal || MIME_EXTENSION_MAP[mimeType] || '.jpg';
  const nameWithoutExt = path.basename(safeOriginalName, extFromOriginal) || 'proof';

  // Unique sanitized filename: [paymentId]-[timestamp]-[name][ext]
  const cleanPaymentId = sanitizeFilename(paymentId).replace(/\./g, '_');
  const filename = `${cleanPaymentId}-${Date.now()}-${nameWithoutExt}${ext}`;

  const targetPath = path.resolve(storeDir, filename);

  // Security guard: verify target path is inside storeDir
  if (!targetPath.startsWith(storeDir + path.sep)) {
    throw new Error('Security Error: Target file path is outside the store directory');
  }

  await fs.writeFile(targetPath, buffer);

  const relativePath = path.join('storage', 'proofs', sanitizeStoreId(storeId), filename);

  return {
    filename,
    relativePath,
    absolutePath: targetPath,
    size: buffer.length,
    mimeType,
  };
}

export interface ReadProofParams {
  storeId: string;
  filename: string;
}

export interface ReadProofResult {
  buffer: Buffer;
  mimeType: string;
  size: number;
}

/**
 * Reads a payment proof file from the tenant's isolated directory.
 * Protects against path traversal attacks.
 */
export async function readPaymentProofFile({
  storeId,
  filename,
}: ReadProofParams): Promise<ReadProofResult | null> {
  if (!filename || typeof filename !== 'string') return null;

  const storeDir = getStoreProofDir(storeId);
  const targetPath = path.resolve(storeDir, filename);

  // Security guard: Path traversal prevention
  if (!targetPath.startsWith(storeDir + path.sep)) {
    throw new Error('Security Error: Path traversal attempt detected');
  }

  try {
    await fs.access(targetPath);
    const buffer = await fs.readFile(targetPath);
    const ext = path.extname(targetPath).toLowerCase();
    const mimeType = EXTENSION_MIME_MAP[ext] || 'image/jpeg';

    return {
      buffer,
      mimeType,
      size: buffer.length,
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * Deletes a payment proof file from the tenant's isolated directory.
 */
export async function deletePaymentProofFile({
  storeId,
  filename,
}: ReadProofParams): Promise<boolean> {
  if (!filename || typeof filename !== 'string') return false;

  const storeDir = getStoreProofDir(storeId);
  const targetPath = path.resolve(storeDir, filename);

  if (!targetPath.startsWith(storeDir + path.sep)) {
    throw new Error('Security Error: Path traversal attempt detected');
  }

  try {
    await fs.unlink(targetPath);
    return true;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export interface EnsureProofOnDiskParams {
  storeId: string;
  paymentId: string;
  proofData?: string | null;
  originalFilename?: string;
  mimeType?: string;
}

/**
 * Ensures that proof data stored as base64 in the database is written to the tenant's local disk folder.
 * Idempotent: if proofData is missing, returns null.
 */
export async function ensureProofOnDisk({
  storeId,
  paymentId,
  proofData,
  originalFilename,
  mimeType = 'image/jpeg',
}: EnsureProofOnDiskParams): Promise<SavedProofResult | null> {
  if (!proofData) return null;

  try {
    const buffer = Buffer.from(proofData, 'base64');
    if (!buffer || buffer.length === 0) return null;

    return await savePaymentProofFile({
      storeId,
      paymentId,
      buffer,
      originalFilename,
      mimeType,
    });
  } catch {
    return null;
  }
}
