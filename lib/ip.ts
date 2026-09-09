/**
 * Get IP address from request headers
 * Works with both standard Request and NextRequest
 */
export function getIPAddress(request: Request): string {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (xRealIP) {
    return xRealIP;
  }
  
  // For NextRequest, there's also request.ip but it's not on standard Request
  // So we only check headers for standard Request compatibility
  return 'unknown';
}
