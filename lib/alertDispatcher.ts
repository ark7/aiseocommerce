/**
 * Alert Dispatcher for Critical Runtime Errors & Health Telemetry.
 *
 * Sends notifications to Telegram Bot or Discord/Slack Webhooks when
 * critical runtime exceptions occur (e.g. payment webhook failure, database drop).
 *
 * Built-in anti-spam throttling prevents notification floods during incident spikes.
 */

interface AlertPayload {
  severity: 'CRITICAL' | 'ERROR' | 'WARN' | 'INFO';
  source: string;
  message: string;
  path?: string | null;
  statusCode?: number | null;
  storeId?: string | null;
  errorStack?: string | null;
  context?: Record<string, unknown> | null;
}

interface ThrottleEntry {
  lastSentAt: number;
  suppressedCount: number;
}

/** Cooldown duration per distinct error signature (10 minutes) */
const COOLDOWN_MS = 10 * 60 * 1000;
const throttledErrors = new Map<string, ThrottleEntry>();

/** Compute a deduplication signature from error essentials */
function getErrorSignature(payload: AlertPayload): string {
  const normMessage = (payload.message || 'unknown').slice(0, 100).toLowerCase();
  const source = payload.source || 'server';
  const path = payload.path || '';
  return `${payload.severity}:${source}:${path}:${normMessage}`;
}

/**
 * Dispatch alert asynchronously without blocking callers.
 */
export async function dispatchAlert(payload: AlertPayload): Promise<boolean> {
  const minSeverity = (process.env.ALERT_MIN_SEVERITY || 'CRITICAL').toUpperCase();
  if (minSeverity === 'CRITICAL' && payload.severity !== 'CRITICAL') {
    return false;
  }

  const signature = getErrorSignature(payload);
  const now = Date.now();
  const existing = throttledErrors.get(signature);

  if (existing && now - existing.lastSentAt < COOLDOWN_MS) {
    existing.suppressedCount += 1;
    return false;
  }

  const suppressedBefore = existing?.suppressedCount || 0;
  throttledErrors.set(signature, {
    lastSentAt: now,
    suppressedCount: 0,
  });

  const telegramToken = process.env.ALERT_TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.ALERT_TELEGRAM_CHAT_ID;
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;

  if (!telegramToken && !webhookUrl) {
    return false;
  }

  const timestamp = new Date().toISOString();
  const suppressedNotice = suppressedBefore > 0 ? `\n⚠️ *(Terjadi ${suppressedBefore}x selama cooldown)*` : '';

  if (telegramToken && telegramChatId) {
    const text = `🚨 *[AI-SEO SaaS ALERT: ${payload.severity}]*
📍 *Source:* \`${payload.source}\`
🌐 *Path:* \`${payload.path || '-'}\`
🏪 *Store:* \`${payload.storeId || 'Global / SuperAdmin'}\`
🕒 *Time:* \`${timestamp}\`
💬 *Message:*
${payload.message.slice(0, 300)}${suppressedNotice}`;

    sendTelegramAlert(telegramToken, telegramChatId, text).catch(() => {});
  }

  if (webhookUrl) {
    const discordPayload = {
      content: `🚨 **[AI-SEO SaaS ALERT: ${payload.severity}]**${suppressedNotice}`,
      embeds: [
        {
          title: `Runtime Alert: ${payload.source}`,
          color: payload.severity === 'CRITICAL' ? 0xff0000 : 0xff9900,
          fields: [
            { name: 'Path', value: payload.path || '-', inline: true },
            { name: 'Status Code', value: String(payload.statusCode || '-'), inline: true },
            { name: 'Store ID', value: payload.storeId || 'Global', inline: true },
            { name: 'Message', value: payload.message.slice(0, 1000) },
          ],
          timestamp: new Date().toISOString(),
        },
      ],
    };

    sendWebhookAlert(webhookUrl, discordPayload).catch(() => {});
  }

  return true;
}

async function sendTelegramAlert(token: string, chatId: string, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function sendWebhookAlert(webhookUrl: string, body: unknown): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export function resetAlertThrottle(): void {
  throttledErrors.clear();
}

