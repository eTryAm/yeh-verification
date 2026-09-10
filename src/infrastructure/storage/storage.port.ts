/**
 * StorageAdapter — abstraction over object storage providers.
 * V1 implementation: Cloudflare R2 (S3-compatible).
 * Swap the implementation without changing callers.
 */
export interface StorageAdapter {
  /**
   * Upload a buffer and return the storage key.
   */
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;

  /**
   * Download an object by key.
   */
  download(key: string): Promise<Buffer>;

  /**
   * Delete an object by key.
   */
  delete(key: string): Promise<void>;

  /**
   * Generate a pre-signed URL for temporary public access.
   */
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;

  /**
   * Check whether an object exists.
   */
  exists(key: string): Promise<boolean>;
}

/**
 * Canonical key builders — all storage keys should go through these helpers
 * to ensure consistent naming and easy future refactoring.
 */
export const StorageKeys = {
  credentialPdf: (orgId: string, year: number, credentialId: string) =>
    `credentials/${orgId}/${year}/${credentialId}/certificate.pdf`,

  credentialQr: (orgId: string, year: number, credentialId: string) =>
    `credentials/${orgId}/${year}/${credentialId}/qr.png`,

  templateThumbnail: (orgId: string, templateId: string, version: number) =>
    `templates/${orgId}/${templateId}/v${version}/thumbnail.png`,

  importSourceFile: (orgId: string, batchId: string, filename: string) =>
    `imports/${orgId}/${batchId}/${filename}`,
} as const;
