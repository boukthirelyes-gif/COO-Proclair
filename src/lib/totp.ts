import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { DomainError } from '@/domain/rules';
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32(bytes: Uint8Array) { let bits = 0, value = 0, result = ''; for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
        result += alphabet[(value >>> (bits - 5)) & 31];
        bits -= 5;
    }
} if (bits)
    result += alphabet[(value << (5 - bits)) & 31]; return result; }
function decode(value: string) { let bits = 0, buffer = 0; const result: number[] = []; for (const char of value) {
    const n = alphabet.indexOf(char);
    if (n < 0)
        throw new DomainError('MFA_CONFIGURATION', 'Configuration MFA invalide.', 503);
    buffer = (buffer << 5) | n;
    bits += 5;
    if (bits >= 8) {
        result.push((buffer >>> (bits - 8)) & 255);
        bits -= 8;
    }
} return Buffer.from(result); }
export function totpAt(secret: string, step: number) { const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(step)); const hash = createHmac('sha1', decode(secret)).update(counter).digest(), offset = hash[hash.length - 1] & 15; return String((hash.readUInt32BE(offset) & 0x7fffffff) % 1000000).padStart(6, '0'); }
export function matchedStep(secret: string, code: string, now: number, lastStep = -1) { if (!/^\d{6}$/.test(code))
    return null; const step = Math.floor(now / 30000); for (const candidate of [step, step - 1, step + 1])
    if (candidate >= 0 && candidate > lastStep && timingSafeEqual(Buffer.from(totpAt(secret, candidate)), Buffer.from(code)))
        return candidate; return null; }
function encryptionKey() { const value = process.env.PROCLAIR_SESSION_SECRET; if (!value || value.length < 32)
    throw new DomainError('AUTH_CONFIGURATION_REQUIRED', 'Secret de session requis pour la MFA.', 503); return createHash('sha256').update('proclair-mfa-v1:' + value).digest(); }
export function encryptMfa(secret: string, actorId: string) { const iv = randomBytes(12), cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv); cipher.setAAD(Buffer.from(actorId)); const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]); return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64url'); }
export function decryptMfa(envelope: string, actorId: string) { try {
    const data = Buffer.from(envelope, 'base64url'), cipher = createDecipheriv('aes-256-gcm', encryptionKey(), data.subarray(0, 12));
    cipher.setAAD(Buffer.from(actorId));
    cipher.setAuthTag(data.subarray(12, 28));
    return Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString('utf8');
}
catch {
    throw new DomainError('MFA_CONFIGURATION', 'Configuration MFA illisible. Récupération administrée requise.', 503);
} }
export function recoveryDigest(actorId: string, code: string) { return createHash('sha256').update('proclair-mfa-recovery-v1:' + actorId + ':' + code.trim().toUpperCase()).digest('hex'); }
