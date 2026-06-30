import type { AppData } from "./models.ts";
import { EMPTY_APP_DATA } from "./models.ts";

const DB_NAME = "feminine-control-local";
const DB_VERSION = 1;
const DATA_KEY = "app-data";
const KEY_ID = "primary-key";

export async function loadEncryptedAppData(): Promise<AppData> {
  if (!canUseBrowserStorage()) return { ...EMPTY_APP_DATA, updatedAt: new Date().toISOString() };
  const db = await openDb();
  const encrypted = await idbGet<EncryptedRecord>(db, "records", DATA_KEY);
  if (!encrypted) return { ...EMPTY_APP_DATA, updatedAt: new Date().toISOString() };
  const key = await getCryptoKey(db);
  const plaintext = await decrypt(encrypted, key);
  return JSON.parse(plaintext) as AppData;
}

export async function saveEncryptedAppData(data: AppData): Promise<void> {
  if (!canUseBrowserStorage()) return;
  const db = await openDb();
  const key = await getCryptoKey(db);
  const encrypted = await encrypt(JSON.stringify({ ...data, updatedAt: new Date().toISOString() }), key);
  await idbSet(db, "records", encrypted, DATA_KEY);
}

export async function clearEncryptedAppData(): Promise<void> {
  if (!canUseBrowserStorage()) return;
  const db = await openDb();
  await Promise.all([idbDelete(db, "records", DATA_KEY), idbDelete(db, "keys", KEY_ID)]);
}

export function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window && "crypto" in window && "subtle" in window.crypto;
}

interface EncryptedRecord {
  iv: number[];
  ciphertext: number[];
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("records")) db.createObjectStore("records");
      if (!db.objectStoreNames.contains("keys")) db.createObjectStore("keys");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getCryptoKey(db: IDBDatabase): Promise<CryptoKey> {
  const existing = await idbGet<CryptoKey>(db, "keys", KEY_ID);
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await idbSet(db, "keys", key, KEY_ID);
  return key;
}

async function encrypt(plaintext: string, key: CryptoKey): Promise<EncryptedRecord> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return { iv: [...iv], ciphertext: [...new Uint8Array(ciphertext)] };
}

async function decrypt(record: EncryptedRecord, key: CryptoKey): Promise<string> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(record.iv) },
    key,
    new Uint8Array(record.ciphertext),
  );
  return new TextDecoder().decode(plaintext);
}

function idbGet<T>(db: IDBDatabase, storeName: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

function idbSet<T>(db: IDBDatabase, storeName: string, value: T, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function idbDelete(db: IDBDatabase, storeName: string, key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    tx.objectStore(storeName).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
