/**
 * Hashing a password using Node.js scrypt algorithm with a random salt.
 * Runs only on Node.js runtime (API routes).
 */
export function hashPassword(password: string): string {
  const nodeCrypto = require('crypto');
  const salt = nodeCrypto.randomBytes(16).toString('hex');
  const hash = nodeCrypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verification of raw password against hashed value.
 * Runs only on Node.js runtime (API routes).
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  try {
    const nodeCrypto = require('crypto');
    const [salt, originalHash] = storedValue.split(':');
    if (!salt || !originalHash) return false;
    const hash = nodeCrypto.scryptSync(password, salt, 64).toString('hex');
    return hash === originalHash;
  } catch (err) {
    return false;
  }
}

/**
 * Edge-compatible JWT helpers using global Web Crypto API (crypto.subtle).
 * Works seamlessly in both standard Node.js and Next.js Edge Middleware.
 */
const encoder = new TextEncoder();

async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const keyData = encoder.encode(secret);
  // Works on globalThis.crypto or imported crypto depending on environment
  const webCrypto = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto;
  return webCrypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return atob(str);
}

export async function signJWT(payload: Record<string, any>, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  
  const key = await getCryptoKey(secret);
  const webCrypto = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto;
  const signatureBuffer = await webCrypto.subtle.sign('HMAC', key, encoder.encode(data));
  
  // Convert ArrayBuffer to string safely
  const arr = new Uint8Array(signatureBuffer);
  let binary = '';
  for (let i = 0; i < arr.byteLength; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  const signature = base64UrlEncode(binary);
  
  return `${data}.${signature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<Record<string, any> | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedPayload, signature] = parts;
    const data = `${encodedHeader}.${encodedPayload}`;
    
    const key = await getCryptoKey(secret);
    
    // Decode signature back to Uint8Array
    const sigStr = base64UrlDecode(signature);
    const sigArr = new Uint8Array(sigStr.length);
    for (let i = 0; i < sigStr.length; i++) {
      sigArr[i] = sigStr.charCodeAt(i);
    }
    
    const dataBuffer = encoder.encode(data);
    const webCrypto = typeof crypto !== 'undefined' ? crypto : (globalThis as any).crypto;
    const isValid = await webCrypto.subtle.verify('HMAC', key, sigArr, dataBuffer);
    if (!isValid) return null;
    
    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      return null; // Expired session
    }
    
    return payload;
  } catch (err) {
    return null;
  }
}
