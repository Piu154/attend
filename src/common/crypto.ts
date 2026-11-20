import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
export const randomToken = () => randomBytes(32).toString('base64url'); // 256-bit
export const safeEqual = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
export const isUniqueViolation = (e: any) => e?.code === '23505';
