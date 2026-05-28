import type { ImageStorage, UploadOptions, UploadResult } from './types';
import { logger } from '../../lib/logger';

/**
 * Fallback when Cloudinary credentials aren't set.
 * Stores the data URL inline on the menu item so dev flows still work end-to-end.
 * NOT suitable for production — images bloat the DB and aren't CDN-served.
 */
export class NoOpImageStorage implements ImageStorage {
  readonly enabled = false;

  async signUpload(_opts: UploadOptions): Promise<{ provider: string; signed: null }> {
    return { provider: 'noop', signed: null };
  }

  async uploadFromBase64(data: string, opts: UploadOptions): Promise<UploadResult> {
    logger.warn(
      { folder: opts.folder },
      'NoOpImageStorage: image stored inline as data URL — set CLOUDINARY_* to enable CDN uploads',
    );
    const ct = opts.contentType ?? 'image/jpeg';
    const url = data.startsWith('data:') ? data : `data:${ct};base64,${data}`;
    return { url };
  }
}
