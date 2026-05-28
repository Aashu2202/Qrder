import { createHash } from 'node:crypto';
import type { ImageStorage, UploadOptions, UploadResult } from './types';
import { logger } from '../../lib/logger';

/**
 * Cloudinary integration without the SDK dependency — uses the documented
 * Upload API + signed-params spec, so we don't pay extra deps until needed.
 * Activated automatically when CLOUDINARY_* env vars are set.
 */
export class CloudinaryImageStorage implements ImageStorage {
  readonly enabled = true;

  constructor(
    private readonly cloudName: string,
    private readonly apiKey: string,
    private readonly apiSecret: string,
  ) {}

  /** Generate signed params the browser can use to upload directly. */
  async signUpload(opts: UploadOptions): Promise<{
    provider: 'cloudinary';
    signed: { folder: string; timestamp: number; signature: string; apiKey: string; cloudName: string };
  }> {
    const timestamp = Math.floor(Date.now() / 1000);
    const toSign = `folder=${opts.folder}&timestamp=${timestamp}${this.apiSecret}`;
    const signature = createHash('sha1').update(toSign).digest('hex');
    return {
      provider: 'cloudinary',
      signed: {
        folder: opts.folder,
        timestamp,
        signature,
        apiKey: this.apiKey,
        cloudName: this.cloudName,
      },
    };
  }

  async uploadFromBase64(data: string, opts: UploadOptions): Promise<UploadResult> {
    const timestamp = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
      api_key: this.apiKey,
      timestamp: String(timestamp),
      folder: opts.folder,
    });
    const toSign = `folder=${opts.folder}&timestamp=${timestamp}${this.apiSecret}`;
    params.set('signature', createHash('sha1').update(toSign).digest('hex'));
    const file = data.startsWith('data:') ? data : `data:${opts.contentType ?? 'image/jpeg'};base64,${data}`;
    params.set('file', file);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`, {
      method: 'POST',
      body: params,
    });
    if (!res.ok) {
      const errBody = await res.text();
      logger.error({ status: res.status, errBody }, 'Cloudinary upload failed');
      throw new Error(`Cloudinary upload failed: ${res.status}`);
    }
    const body = (await res.json()) as { secure_url: string; public_id: string };
    return { url: body.secure_url, publicId: body.public_id };
  }
}
