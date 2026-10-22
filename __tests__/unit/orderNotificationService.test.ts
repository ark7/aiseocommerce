import {
  sendTelegramMessage,
  sendWhatsappMessage,
  sendTestNotification,
  dispatchOrderCreatedNotification,
  dispatchPaymentProofNotification,
  dispatchPaymentVerifiedNotification,
  dispatchLowStockWarningNotification,
} from '@/lib/orderNotificationService';
import { prisma } from '@/lib/prisma';

jest.mock('@/lib/prisma', () => ({
  prisma: {
    order: { findUnique: jest.fn() },
    payment: { findUnique: jest.fn() },
    store: { findUnique: jest.fn() },
  },
}));

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('lib/orderNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendTelegramMessage', () => {
    it('sends message to Telegram Bot API with parse_mode Markdown and inline buttons', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });
      global.fetch = mockFetch;

      const res = await sendTelegramMessage({
        botToken: 'bot123:token',
        chatId: '987654321',
        text: 'Halo *Telegram*',
        buttons: [[{ text: 'Buka Admin', url: 'https://example.com/admin' }]],
      });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botbot123:token/sendMessage',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('parse_mode":"Markdown"'),
        })
      );
    });

    it('returns error when Telegram API responds with error status', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ description: 'chat not found' }),
      });

      const res = await sendTelegramMessage({
        botToken: 'bot123:token',
        chatId: 'invalid-id',
        text: 'Test',
      });

      expect(res.success).toBe(false);
      expect(res.error).toBe('chat not found');
    });
  });

  describe('sendWhatsappMessage', () => {
    it('sends message via Fonnte Gateway with Authorization header', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: true }),
      });
      global.fetch = mockFetch;

      const res = await sendWhatsappMessage({
        provider: 'FONNTE',
        token: 'fonnte-token-123',
        targetPhone: '08123456789',
        text: 'Halo *WhatsApp*',
      });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.fonnte.com/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'fonnte-token-123' }),
        })
      );
    });

    it('sends message via generic webhook URL', async () => {
      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      const res = await sendWhatsappMessage({
        provider: 'GENERIC_WEBHOOK',
        token: 'https://webhook.example.com/whatsapp',
        targetPhone: '08123456789',
        text: 'Webhook test',
      });

      expect(res.success).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://webhook.example.com/whatsapp',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  describe('sendTestNotification', () => {
    it('rejects Telegram test when botToken or chatId is missing', async () => {
      const res = await sendTestNotification({ channel: 'TELEGRAM' });
      expect(res.success).toBe(false);
      expect(res.message).toContain('Bot Token dan Chat ID Telegram wajib diisi');
    });

    it('sends test notification to Telegram successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const res = await sendTestNotification({
        channel: 'TELEGRAM',
        telegramBotToken: 'bot-token',
        telegramChatId: 'chat-id',
        storeName: 'Toko Keren',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('Pesan uji coba berhasil dikirim ke Telegram');
    });

    it('sends test notification to WhatsApp successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: true });

      const res = await sendTestNotification({
        channel: 'WHATSAPP',
        whatsappToken: 'wa-token',
        whatsappTargetPhone: '08123456789',
        storeName: 'Toko Keren',
      });

      expect(res.success).toBe(true);
      expect(res.message).toContain('Pesan uji coba berhasil dikirim ke WhatsApp');
    });
  });

  describe('event dispatchers', () => {
    it('dispatches order created notification when enabled in settings', async () => {
      (prisma.order.findUnique as jest.Mock).mockResolvedValue({
        id: 'ord-123',
        orderNumber: 'ORD-12345',
        totalAmount: 150000,
        customerName: 'Budi Santoso',
        customerPhone: '08123456789',
        status: 'PENDING',
        orderItems: [{ product: { name: 'Kaos Polos' }, quantity: 2, unitPrice: 75000, totalPrice: 150000 }],
        store: {
          name: 'Toko Baju',
          settings: {
            notifyTelegramEnabled: true,
            notifyOnNewOrder: true,
            notifyTelegramBotToken: 'token',
            notifyTelegramChatId: '123',
            notifyWhatsappEnabled: false,
          },
        },
      });

      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      dispatchOrderCreatedNotification('ord-123');

      // Wait a tick for async background execution
      await new Promise((r) => setTimeout(r, 50));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.telegram.org'),
        expect.objectContaining({
          body: expect.stringContaining('ORD-12345'),
        })
      );
    });

    it('dispatches low stock warning when remaining stock is <= threshold', async () => {
      (prisma.store.findUnique as jest.Mock).mockResolvedValue({
        name: 'Toko Elektronik',
        settings: {
          notifyTelegramEnabled: true,
          notifyTelegramBotToken: 'token',
          notifyTelegramChatId: 'chat-id',
          notifyOnLowStock: true,
          notifyLowStockThreshold: 3,
        },
      });

      const mockFetch = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      dispatchLowStockWarningNotification('Mouse Wireless', 2, 'store-1');

      await new Promise((r) => setTimeout(r, 50));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.telegram.org'),
        expect.objectContaining({
          body: expect.stringContaining('Mouse Wireless'),
        })
      );
    });
  });
});
