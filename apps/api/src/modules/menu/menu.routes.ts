import { Router, type Router as ExpressRouter } from 'express';
import {
  menuCategoryInput,
  menuCategoryUpdate,
  menuItemInput,
  menuItemUpdate,
  availabilityToggle,
  modifierGroupInput,
  modifierGroupUpdate,
  modifierInput,
  modifierUpdate,
  attachGroupsInput,
  Permission,
} from '@qrder/shared';
import { asyncHandler } from '../../lib/asyncHandler';
import { requireAuth, requirePerm } from '../../middleware/auth';
import * as service from './menu.service';
import * as modService from './modifiers.service';
import { unauthorized } from '../../lib/errors';

const router: ExpressRouter = Router();
router.use(requireAuth);

router.get(
  '/categories',
  requirePerm(Permission.MENU_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json({ items: await service.listCategories(req.user.tenantId) });
  }),
);

router.post(
  '/categories',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = menuCategoryInput.parse(req.body);
    res.status(201).json(await service.createCategory(req.user.tenantId, body));
  }),
);

router.patch(
  '/categories/:id',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = menuCategoryUpdate.parse(req.body);
    res.json(await service.updateCategory(req.user.tenantId, req.params.id!, body));
  }),
);

router.delete(
  '/categories/:id',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    await service.deleteCategory(req.user.tenantId, req.params.id!);
    res.status(204).end();
  }),
);

router.get(
  '/items',
  requirePerm(Permission.MENU_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const categoryId = typeof req.query.categoryId === 'string' ? req.query.categoryId : undefined;
    res.json({ items: await service.listItems(req.user.tenantId, { categoryId }) });
  }),
);

router.get(
  '/items/:id',
  requirePerm(Permission.MENU_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json(await service.getItem(req.user.tenantId, req.params.id!));
  }),
);

router.post(
  '/items',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = menuItemInput.parse(req.body);
    res.status(201).json(await service.createItem(req.user.tenantId, body));
  }),
);

router.patch(
  '/items/:id',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = menuItemUpdate.parse(req.body);
    res.json(await service.updateItem(req.user.tenantId, req.params.id!, body));
  }),
);

router.patch(
  '/items/:id/availability',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const { isAvailable } = availabilityToggle.parse(req.body);
    res.json(await service.setItemAvailability(req.user.tenantId, req.params.id!, isAvailable));
  }),
);

router.delete(
  '/items/:id',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    await service.deleteItem(req.user.tenantId, req.params.id!);
    res.status(204).end();
  }),
);

// ----- Modifier groups -----

router.get(
  '/modifier-groups',
  requirePerm(Permission.MENU_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json({ items: await modService.listGroupsWithModifiers(req.user.tenantId) });
  }),
);

router.post(
  '/modifier-groups',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = modifierGroupInput.parse(req.body);
    res.status(201).json(await modService.createGroup(req.user.tenantId, body));
  }),
);

router.patch(
  '/modifier-groups/:id',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = modifierGroupUpdate.parse(req.body);
    res.json(await modService.updateGroup(req.user.tenantId, req.params.id!, body));
  }),
);

router.delete(
  '/modifier-groups/:id',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    await modService.deleteGroup(req.user.tenantId, req.params.id!);
    res.status(204).end();
  }),
);

router.post(
  '/modifier-groups/:groupId/modifiers',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = modifierInput.parse(req.body);
    res.status(201).json(await modService.addModifier(req.user.tenantId, req.params.groupId!, body));
  }),
);

router.patch(
  '/modifiers/:id',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = modifierUpdate.parse(req.body);
    res.json(await modService.updateModifier(req.user.tenantId, req.params.id!, body));
  }),
);

router.delete(
  '/modifiers/:id',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    await modService.deleteModifier(req.user.tenantId, req.params.id!);
    res.status(204).end();
  }),
);

router.put(
  '/items/:id/modifier-groups',
  requirePerm(Permission.MENU_WRITE),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    const body = attachGroupsInput.parse(req.body);
    await modService.setItemGroups(req.user.tenantId, req.params.id!, body.groupIds);
    res.status(204).end();
  }),
);

router.get(
  '/items/:id/modifier-groups',
  requirePerm(Permission.MENU_READ),
  asyncHandler(async (req, res) => {
    if (!req.user) throw unauthorized();
    res.json({
      items: await modService.getGroupsForItem(req.user.tenantId, req.params.id!),
    });
  }),
);

export const menuRouter = router;
