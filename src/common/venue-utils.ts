import { randomInt } from 'crypto';

export const slugify = (name: string, fallback = 'venue') =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || fallback;

// no look-alike characters (0/O, 1/l/I), so a password is easy to read out or type
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const generatePassword = (length = 10) =>
  Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');