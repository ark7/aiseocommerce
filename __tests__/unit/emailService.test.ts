import {
  createTransporter,
  verifySmtpConnection,
  sendEmail,
  sendOwnershipChallengeCode,
  confirmOwnershipChallengeCode,
  checkDomainDnsRecords,
  SmtpConfig,
} from '@/lib/emailService';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import dns from 'node:dns/promises';

// Mock dependencies
jest.mock('nodemailer');
jest.mock('@/lib/prisma', () => ({
  prisma: {
    store: {
      findUnique: jest.fn(),
    },
    storeSettings: {
      update: jest.fn(),
    },
  },
}));

describe('Email & SMTP Service (lib/emailService.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createTransporter and verifySmtpConnection', () => {
    it('creates nodemailer transport with configuration parameters', () => {
      const mockCreateTransport = jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-123' }),
      } as any);

      const config: SmtpConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        user: 'admin@demo-store.local',
        pass: 'app-secret-pwd',
      };

      createTransporter(config);

      expect(mockCreateTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: 'admin@demo-store.local',
            pass: 'app-secret-pwd',
          },
        })
      );
    });

    it('returns success: true when smtp verify passes', async () => {
      jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
        verify: jest.fn().mockResolvedValue(true),
      } as any);

      const result = await verifySmtpConnection({
        host: 'smtp.mail.com',
        port: 465,
        secure: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('berhasil diverifikasi');
    });

    it('returns success: false when smtp verify fails', async () => {
      jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
        verify: jest.fn().mockRejectedValue(new Error('Invalid credentials')),
      } as any);

      const result = await verifySmtpConnection({
        host: 'smtp.mail.com',
        port: 587,
        secure: false,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid credentials');
    });
  });

  describe('sendEmail', () => {
    it('returns error when config and storeId are missing', async () => {
      const result = await sendEmail({
        to: 'customer@gmail.com',
        subject: 'Invoice Pesanan',
        html: '<p>Terima kasih</p>',
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Konfigurasi SMTP tidak ditemukan');
    });

    it('sends mail successfully with valid config', async () => {
      jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'msg-abc-999' }),
      } as any);

      const result = await sendEmail({
        to: 'buyer@test.com',
        subject: 'Pesanan Diproses',
        html: '<p>Halo</p>',
        config: {
          host: 'smtp.test.com',
          port: 587,
          secure: false,
          fromName: 'Toko Test',
          fromEmail: 'sales@test.com',
        },
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-abc-999');
    });
  });

  describe('sendOwnershipChallengeCode and confirmOwnershipChallengeCode', () => {
    it('generates challenge code and saves verification token', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 'store-1',
        name: 'Toko Keren',
        email: 'info@tokokeren.com',
        settings: {
          smtpHost: 'smtp.mail.com',
          smtpPort: 587,
          smtpSecure: false,
          smtpUser: 'info@tokokeren.com',
          smtpPass: 'secret',
        },
      });

      (prisma.storeSettings.update as jest.Mock).mockResolvedValue({});

      jest.spyOn(nodemailer, 'createTransport').mockReturnValue({
        sendMail: jest.fn().mockResolvedValue({ messageId: 'otp-sent-1' }),
      } as any);

      const result = await sendOwnershipChallengeCode('store-1', 'info@tokokeren.com');

      expect(result.success).toBe(true);
      expect(prisma.storeSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
          data: expect.objectContaining({
            smtpVerificationToken: expect.stringContaining('"email":"info@tokokeren.com"'),
          }),
        })
      );
    });

    it('rejects verification code when token does not match', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 'store-1',
        settings: {
          smtpVerificationToken: JSON.stringify({
            code: '123456',
            email: 'admin@toko.com',
            expiresAt: Date.now() + 60000,
          }),
        },
      });

      const result = await confirmOwnershipChallengeCode('store-1', '999999');
      expect(result.success).toBe(false);
      expect(result.message).toContain('salah');
    });

    it('successfully confirms verification code when code matches and not expired', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        id: 'store-1',
        settings: {
          smtpVerificationToken: JSON.stringify({
            code: '654321',
            email: 'admin@toko.com',
            expiresAt: Date.now() + 60000,
          }),
        },
      });

      (prisma.storeSettings.update as jest.Mock).mockResolvedValue({});

      const result = await confirmOwnershipChallengeCode('store-1', '654321');
      expect(result.success).toBe(true);
      expect(prisma.storeSettings.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { storeId: 'store-1' },
          data: expect.objectContaining({
            smtpVerified: true,
            smtpVerificationToken: null,
          }),
        })
      );
    });
  });

  describe('checkDomainDnsRecords', () => {
    it('parses SPF, DMARC, and MX records from DNS lookups', async () => {
      jest.spyOn(dns, 'resolveTxt').mockImplementation(async (targetDomain: string) => {
        if (targetDomain === 'mydomain.com') {
          return [['v=spf1 include:_spf.google.com ~all']];
        }
        if (targetDomain === '_dmarc.mydomain.com') {
          return [['v=DMARC1; p=none; sp=none;']];
        }
        return [];
      });

      jest.spyOn(dns, 'resolveMx').mockResolvedValue([
        { exchange: 'aspmx.l.google.com', priority: 1 },
        { exchange: 'alt1.aspmx.l.google.com', priority: 5 },
      ]);

      const result = await checkDomainDnsRecords('mydomain.com');

      expect(result.domain).toBe('mydomain.com');
      expect(result.spf.valid).toBe(true);
      expect(result.spf.record).toContain('v=spf1');
      expect(result.dmarc.valid).toBe(true);
      expect(result.dmarc.record).toContain('v=DMARC1');
      expect(result.mx.valid).toBe(true);
      expect(result.mx.records.length).toBe(2);
    });

    it('gracefully handles missing DNS records without throwing', async () => {
      jest.spyOn(dns, 'resolveTxt').mockRejectedValue(new Error('ENOTFOUND'));
      jest.spyOn(dns, 'resolveMx').mockRejectedValue(new Error('ENOTFOUND'));

      const result = await checkDomainDnsRecords('notexistdomain12345.id');

      expect(result.spf.valid).toBe(false);
      expect(result.dmarc.valid).toBe(false);
      expect(result.mx.valid).toBe(false);
    });
  });
});
