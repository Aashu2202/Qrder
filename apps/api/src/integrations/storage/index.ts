import { env } from '../../config/env';
import { logger } from '../../lib/logger';
import type { ImageStorage } from './types';
import { NoOpImageStorage } from './noop';
import { CloudinaryImageStorage } from './cloudinary';

export type { ImageStorage, UploadOptions, UploadResult } from './types';

function pickStorage(): ImageStorage {
  if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
    logger.info('Image storage: Cloudinary');
    return new CloudinaryImageStorage(
      env.CLOUDINARY_CLOUD_NAME,
      env.CLOUDINARY_API_KEY,
      env.CLOUDINARY_API_SECRET,
    );
  }
  logger.warn('Image storage: NoOp (data-URL fallback). Set CLOUDINARY_* env vars for CDN uploads.');
  return new NoOpImageStorage();
}

export const imageStorage: ImageStorage = pickStorage();
