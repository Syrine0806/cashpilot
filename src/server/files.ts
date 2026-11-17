import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { ValidationError } from "@/domain/errors";
import { UPLOAD_DIR } from "./env";

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

/** Accepted receipt formats, identified by their magic bytes (not by the client-provided type). */
const SIGNATURES: { mime: string; ext: string; bytes: number[] }[] = [
  { mime: "application/pdf", ext: "pdf", bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: "image/png", ext: "png", bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: "image/jpeg", ext: "jpg", bytes: [0xff, 0xd8, 0xff] },
];

export interface StoredFile {
  path: string;
  name: string;
  mime: string;
}

/** Validates and stores an uploaded receipt outside the public folder. */
export async function saveReceipt(file: File | null): Promise<StoredFile | null> {
  if (!file || file.size === 0) return null;
  if (file.size > MAX_RECEIPT_BYTES) {
    throw new ValidationError("Justificatif trop volumineux.", { receipt: ["5 Mo maximum."] });
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = SIGNATURES.find((s) => s.bytes.every((b, i) => buffer[i] === b));
  if (!kind) {
    throw new ValidationError("Format de justificatif non accepté.", { receipt: ["Formats acceptés : PDF, PNG, JPG."] });
  }
  await mkdir(/*turbopackIgnore: true*/ UPLOAD_DIR, { recursive: true });
  const storedName = `${randomUUID()}.${kind.ext}`;
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, storedName), buffer);
  const originalName = path.basename(file.name).replace(/[^\w.\- ]+/g, "_").slice(0, 120) || storedName;
  return { path: storedName, name: originalName, mime: kind.mime };
}

export async function readReceipt(storedName: string): Promise<Buffer> {
  // storedName comes from the database, but never trust paths: keep only the basename.
  return readFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, path.basename(storedName)));
}

export async function deleteReceipt(storedName: string | null): Promise<void> {
  if (!storedName) return;
  await rm(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, path.basename(storedName)), { force: true });
}
