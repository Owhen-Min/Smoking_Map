import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';

export const ANONYMOUS_COOKIE = 'smoking_map_anonymous';

function signature(id: string, secret: string): string {
  return createHmac('sha256', secret)
    .update(`smoking-map-anonymous-v1:${id}`)
    .digest('hex');
}

export function createAnonymousToken(secret: string): string {
  const id = randomUUID();
  return `${id}.${signature(id, secret)}`;
}

export function verifyAnonymousToken(token: string | undefined, secret: string): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [id, signed] = parts;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)
    || !/^[0-9a-f]{64}$/.test(signed)) return null;
  return timingSafeEqual(Buffer.from(signed, 'hex'), Buffer.from(signature(id, secret), 'hex'))
    ? id : null;
}
