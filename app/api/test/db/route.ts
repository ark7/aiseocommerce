import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const test = await prisma.$queryRaw`SELECT 1`;
    const versionResult = await prisma.$queryRaw`SELECT version() as version`;
    const version = (versionResult as any[])[0]?.version || 'unknown';
    
    return NextResponse.json({
      success: true,
      database: 'connected',
      version: version,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}
