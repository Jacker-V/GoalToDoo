import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware.js';
import {
  validateBody,
  validateParams,
  idParamSchema,
} from '../middlewares/validate.middleware.js';
import {
  createCategorySchema,
  updateCategorySchema,
} from '../validators/category.validator.js';
import * as categoryController from '../controllers/category.controller.js';

const router = Router();

router.use(requireAuth);

router.get('/', categoryController.getCategories);
router.post('/', validateBody(createCategorySchema), categoryController.createCategory);
router.get('/:id', validateParams(idParamSchema), categoryController.getCategoryById);
router.patch(
  '/:id',
  validateParams(idParamSchema),
  validateBody(updateCategorySchema),
  categoryController.updateCategory
);
router.delete('/:id', validateParams(idParamSchema), categoryController.deleteCategory);

export default router;
