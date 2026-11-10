import {
  savePaymentProofFile,
  readPaymentProofFile,
  deletePaymentProofFile,
  ensureProofOnDisk,
  getStoreProofDir,
  sanitizeStoreId,
  sanitizeFilename,
  BASE_PROOF_DIR,
} from '@/lib/paymentStorage';
import path from 'path';
import { promises as fs } from 'fs';

describe('lib/paymentStorage — Tenant-Isolated Payment Proof Storage', () => {
  const TEST_STORE_A = 'test-store-alpha';
  const TEST_STORE_B = 'test-store-beta';
  const TEST_PAYMENT_ID = 'test-pay-123';

  afterAll(async () => {
    // Cleanup test directories
    try {
      await fs.rm(getStoreProofDir(TEST_STORE_A), { recursive: true, force: true });
      await fs.rm(getStoreProofDir(TEST_STORE_B), { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  describe('Sanitization & Directory Helpers', () => {
    it('sanitizes storeId removing dangerous characters', () => {
      expect(sanitizeStoreId('store/../hack')).toBe('store____hack');
      expect(sanitizeStoreId('valid-store_123')).toBe('valid-store_123');
      expect(() => sanitizeStoreId('')).toThrow('Invalid storeId');
    });

    it('sanitizes filename preserving valid extension', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('passwd.jpg');
      expect(sanitizeFilename('receipt invoice (1).png')).toBe('receipt_invoice__1_.png');
      expect(sanitizeFilename('')).toBe('proof.jpg');
    });

    it('resolves store proof dir strictly within BASE_PROOF_DIR', () => {
      const dir = getStoreProofDir(TEST_STORE_A);
      expect(dir.startsWith(BASE_PROOF_DIR)).toBe(true);
      expect(dir).toBe(path.join(BASE_PROOF_DIR, TEST_STORE_A));
    });
  });

  describe('savePaymentProofFile & readPaymentProofFile', () => {
    it('saves a file into the store directory and reads it back', async () => {
      const sampleContent = 'sample-payment-receipt-content-12345';
      const buffer = Buffer.from(sampleContent, 'utf-8');

      const saved = await savePaymentProofFile({
        storeId: TEST_STORE_A,
        paymentId: TEST_PAYMENT_ID,
        buffer,
        originalFilename: 'transfer-proof.png',
        mimeType: 'image/png',
      });

      expect(saved.filename).toContain(TEST_PAYMENT_ID);
      expect(saved.filename.endsWith('.png')).toBe(true);
      expect(saved.relativePath).toContain(`storage/proofs/${TEST_STORE_A}`);
      expect(saved.size).toBe(buffer.length);

      // Verify physical file exists
      const readResult = await readPaymentProofFile({
        storeId: TEST_STORE_A,
        filename: saved.filename,
      });

      expect(readResult).not.toBeNull();
      expect(readResult?.buffer.toString('utf-8')).toBe(sampleContent);
      expect(readResult?.mimeType).toBe('image/png');

      // Cleanup
      await deletePaymentProofFile({
        storeId: TEST_STORE_A,
        filename: saved.filename,
      });

      const afterDelete = await readPaymentProofFile({
        storeId: TEST_STORE_A,
        filename: saved.filename,
      });
      expect(afterDelete).toBeNull();
    });

    it('strictly isolates between stores (Store B cannot access Store A file)', async () => {
      const buffer = Buffer.from('confidential-receipt-for-store-a', 'utf-8');

      const savedA = await savePaymentProofFile({
        storeId: TEST_STORE_A,
        paymentId: 'pay-store-a',
        buffer,
        originalFilename: 'receipt-a.jpg',
      });

      // Attempt reading Store A file using Store B identifier
      const readFromStoreB = await readPaymentProofFile({
        storeId: TEST_STORE_B,
        filename: savedA.filename,
      });

      expect(readFromStoreB).toBeNull();

      // Cleanup
      await deletePaymentProofFile({
        storeId: TEST_STORE_A,
        filename: savedA.filename,
      });
    });

    it('prevents path traversal attempts when reading files', async () => {
      await expect(
        readPaymentProofFile({
          storeId: TEST_STORE_A,
          filename: '../../../etc/passwd',
        })
      ).rejects.toThrow('Path traversal attempt detected');

      await expect(
        readPaymentProofFile({
          storeId: TEST_STORE_A,
          filename: `../../${TEST_STORE_B}/secret.jpg`,
        })
      ).rejects.toThrow('Path traversal attempt detected');
    });
  });

  describe('ensureProofOnDisk', () => {
    it('converts base64 proofData to local disk file', async () => {
      const originalText = 'my-bank-transfer-screenshot';
      const base64Data = Buffer.from(originalText, 'utf-8').toString('base64');

      const result = await ensureProofOnDisk({
        storeId: TEST_STORE_A,
        paymentId: 'pay-migration-1',
        proofData: base64Data,
        originalFilename: 'bukti.jpg',
      });

      expect(result).not.toBeNull();
      expect(result?.filename).toContain('pay-migration-1');

      const readBack = await readPaymentProofFile({
        storeId: TEST_STORE_A,
        filename: result!.filename,
      });

      expect(readBack?.buffer.toString('utf-8')).toBe(originalText);

      // Cleanup
      await deletePaymentProofFile({
        storeId: TEST_STORE_A,
        filename: result!.filename,
      });
    });

    it('returns null if proofData is empty or missing', async () => {
      const result = await ensureProofOnDisk({
        storeId: TEST_STORE_A,
        paymentId: 'pay-empty',
        proofData: null,
      });

      expect(result).toBeNull();
    });
  });
});

