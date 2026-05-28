export interface UploadOptions {
  folder: string;
  filename?: string;
  contentType?: string;
}

export interface UploadResult {
  url: string;
  publicId?: string;
}

export interface ImageStorage {
  /**
   * Returns a small signed payload the client can POST directly to the provider
   * (avoids streaming bytes through our API). Returns null if direct uploads
   * aren't supported (no-op driver) — in that case use uploadFromBase64.
   */
  signUpload(opts: UploadOptions): Promise<{
    provider: string;
    signed: Record<string, string | number> | null;
  }>;

  /** Server-side upload from a base64 string (used by admin item editor). */
  uploadFromBase64(data: string, opts: UploadOptions): Promise<UploadResult>;

  /** True if this driver actually persists images. */
  readonly enabled: boolean;
}
