import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

const scrypt = promisify(scryptCb) as unknown as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>;
const KEYLEN = 64;

/** Stored format: scrypt$<salt hex>$<hash hex>. Uses Node's built-in crypto, no extra package. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEYLEN);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

let dummy: Promise<string> | undefined;

/** stored = null means "no such user": we still do the same work so timing does not reveal it. */
export async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  const value = stored ?? (await (dummy ??= hashPassword('not-a-real-password')));
  const [scheme, saltHex, hashHex] = value.split('$');
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = await scrypt(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(actual, expected) && stored !== null;
}