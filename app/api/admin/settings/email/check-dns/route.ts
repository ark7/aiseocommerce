import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { checkDomainDnsRecords } from '@/lib/emailService';
import { z } from 'zod';

const CheckDnsSchema = z.object({
  domain: z.string().min(1, 'Domain wajib diisi'),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = CheckDnsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Format domain tidak valid' }, { status: 400 });
    }

    const dnsResult = await checkDomainDnsRecords(parsed.data.domain);

    return NextResponse.json({
      success: true,
      dns: dnsResult,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Terjadi kesalahan saat memeriksa record DNS' },
      { status: 500 }
    );
  }
}
