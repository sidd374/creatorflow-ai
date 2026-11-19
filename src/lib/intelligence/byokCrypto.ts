/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Server-side AES-256-GCM encryption & masking for user BYOK Gemini API keys.
 * NEVER import this file in browser/client modules.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type { ByokKeyStatus, EncryptedByokRecord, GeminiDiagnosticInfo, GeminiModelId } from './types.ts';
import { normalizeGeminiModel } from './models.ts';

const CURRENT_KEY_VERSION = 1;
const DEV_SALT_FILE = path.resolve(process.cwd(), '.creatorflow-key-salt');

function resolveMasterSecret(): string {
  const configured =
    process.env.BYOK_ENCRYPTION_SECRET ||
    process.env.CREATORFLOW_BYOK_SECRET ||
    '';
  if (configured.trim().length >= 16) {
    return configured.trim();
  }

  if (process.env.NODE_ENV === 'production') {
    // Derive deterministic process-bound secret using firebase config projectId + fallback entropy warning
    // If BYOK_ENCRYPTION_SECRET is explicitly configured in production env, that branch above is always used.
    const projectSeed =
      process.env.FIREBASE_PROJECT_ID ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      'shaped-obelisk-6xctm';
    const serviceSeed =
      process.env.CASHFREE_WEBHOOK_SECRET ||
      process.env.K_REVISION ||
      process.cwd();
    return `cf_prod_derived_${projectSeed}_${serviceSeed}`;
  }

  // In local development / isolated test runs, persist a local random salt in gitignored file so restarts can decrypt saved test keys.
  try {
    if (fs.existsSync(DEV_SALT_FILE)) {
      const existing = fs.readFileSync(DEV_SALT_FILE, 'utf8').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(DEV_SALT_FILE, generated, { mode: 0o600 });
    return generated;
  } catch {
    return 'cf_local_ephemeral_dev_encryption_secret_v1';
  }
}

function deriveEncryptionKey(uid: string): Buffer {
  const master = resolveMasterSecret();
  return crypto.scryptSync(master, `creatorflow-byok-v${CURRENT_KEY_VERSION}:${uid}`, 32);
}

export function validateGeminiApiKeyFormat(rawKey: unknown): {
  valid: boolean;
  cleaned: string;
  error?: string;
} {
  if (typeof rawKey !== 'string') {
    return { valid: false, cleaned: '', error: 'API key must be a string.' };
  }
  const cleaned = rawKey
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .trim();
  if (!cleaned) {
    return { valid: false, cleaned: '', error: 'Gemini API key cannot be empty.' };
  }
  if (/\s/.test(cleaned)) {
    return {
      valid: false,
      cleaned: '',
      error: 'Gemini API key cannot contain spaces or line breaks.',
    };
  }
  if (!/^[\x21-\x7E]+$/.test(cleaned)) {
    return {
      valid: false,
      cleaned: '',
      error: 'Gemini API key contains invalid hidden or non-ASCII characters. Please copy and paste the raw key again.',
    };
  }
  if (cleaned.length < 12 || cleaned.length > 512) {
    return {
      valid: false,
      cleaned: '',
      error: 'Gemini API key length looks invalid. Paste your full key without extra text.',
    };
  }
  return { valid: true, cleaned };
}

export function maskGeminiApiKey(plainKey: string): {
  keyLast4: string;
  maskedHint: string;
} {
  const cleaned = plainKey.trim();
  const keyLast4 = cleaned.slice(-4);
  const prefix = cleaned.length > 8 ? cleaned.slice(0, 4) : '';
  return {
    keyLast4,
    maskedHint: `${prefix}${'•'.repeat(8)}${keyLast4}`,
  };
}

export function encryptByokKey(params: {
  uid: string;
  plainKey: string;
  selectedModel?: GeminiModelId;
  status?: ByokKeyStatus;
  lastTestedAt?: string | null;
  lastError?: string | null;
  lastDiagnostic?: GeminiDiagnosticInfo | null;
  existingCreatedAt?: string;
}): EncryptedByokRecord {
  const { uid, plainKey } = params;
  const key = deriveEncryptionKey(uid);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`uid:${uid}`, 'utf8'));
  const encrypted = Buffer.concat([cipher.update(plainKey, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const { keyLast4, maskedHint } = maskGeminiApiKey(plainKey);
  const nowIso = new Date().toISOString();

  return {
    uid,
    encryptedKey: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: CURRENT_KEY_VERSION,
    keyLast4,
    maskedHint,
    selectedModel: normalizeGeminiModel(params.selectedModel),
    status: params.status || 'connected',
    lastTestedAt: params.lastTestedAt ?? null,
    lastError: params.lastError ?? null,
    lastDiagnostic: params.lastDiagnostic ?? null,
    createdAt: params.existingCreatedAt || nowIso,
    updatedAt: nowIso,
  };
}

export function decryptByokKey(record: EncryptedByokRecord, uid: string): string {
  if (!record || record.uid !== uid) {
    throw new Error('BYOK credential ownership mismatch.');
  }
  const key = deriveEncryptionKey(uid);
  const iv = Buffer.from(record.iv, 'base64');
  const authTag = Buffer.from(record.authTag, 'base64');
  const encrypted = Buffer.from(record.encryptedKey, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAAD(Buffer.from(`uid:${uid}`, 'utf8'));
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
