import { randomBytes, createCipheriv, createDecipheriv, pbkdf2Sync } from "crypto";
import { env } from "~/env";

const ALGORITHM = "aes-256-gcm";
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const SALT_LENGTH = 16; // 128 bits
const PBKDF2_ITERATIONS = 100_000;
const TAG_LENGTH = 16; // 128-bit auth tag

function getMasterKey(): string {
  const key = env.REFERRAL_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "REFERRAL_ENCRYPTION_KEY environment variable is not set. " +
        "Generate one with: openssl rand -hex 32"
    );
  }
  return key;
}

function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return pbkdf2Sync(masterKey, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
}

export interface EncryptedPayload {
  ciphertext: string; // hex-encoded encrypted data
  iv: string; // hex-encoded initialization vector
  salt: string; // hex-encoded PBKDF2 salt
  tag: string; // hex-encoded GCM auth tag
}

/**
 * Encrypt beneficiary data using AES-256-GCM with per-referral salt.
 * Uses PBKDF2 key derivation from the master encryption key.
 */
export function encryptBeneficiaryData(
  data: Record<string, unknown>
): EncryptedPayload {
  const masterKey = getMasterKey();
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const derivedKey = deriveKey(masterKey, salt);

  const cipher = createCipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: TAG_LENGTH,
  });

  const plaintext = JSON.stringify(data);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString("hex"),
    iv: iv.toString("hex"),
    salt: salt.toString("hex"),
    tag: tag.toString("hex"),
  };
}

/**
 * Decrypt beneficiary data using the stored IV, salt, and auth tag.
 * Returns the original JSON object.
 */
export function decryptBeneficiaryData(payload: EncryptedPayload): Record<string, unknown> {
  const masterKey = getMasterKey();
  const salt = Buffer.from(payload.salt, "hex");
  const iv = Buffer.from(payload.iv, "hex");
  const tag = Buffer.from(payload.tag, "hex");
  const ciphertext = Buffer.from(payload.ciphertext, "hex");

  const derivedKey = deriveKey(masterKey, salt);

  const decipher = createDecipheriv(ALGORITHM, derivedKey, iv, {
    authTagLength: TAG_LENGTH,
  });
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return JSON.parse(decrypted.toString("utf8")) as Record<string, unknown>;
}
