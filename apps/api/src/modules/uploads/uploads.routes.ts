import { Router, type Router as ExpressRouter } from 'express';
import { z } from 'zod';
import { Permission } from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import { unauthorized, conflict } from '../../lib/errors';
import { imageStorage } from '../../integrations/storage';

const router: ExpressRouter = Router();
router.use(requireAuth);

const signInput = z.object({
  /** Subfolder name like 'menu' or 'tenant-logos'. */
  folder: z.string().regex(/^[a-z0-9-_/]+$/i).max(64).default('menu'),
});

router.post(
  '/sign',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = signInput.parse(req.body);
    if (!imageStorage.enabled) {
      throw conflict('Direct uploads disabled (no Cloudinary credentials)');
    }
    const folder = `qrder/${req.user.tenantId}/${body.folder}`;
    const { provider, signed } = await imageStorage.signUpload({ folder });
    res.json({ provider, signed });
  }),
);

export const uploadsRouter = router;
