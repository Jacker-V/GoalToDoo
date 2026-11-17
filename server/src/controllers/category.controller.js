import { Category } from '../models/category.model.js';
import { Goal } from '../models/goal.model.js';
import { Event } from '../models/event.model.js';
import { AppError, sendSuccess } from '../utils/response.js';

export const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ userId: req.user._id }).sort({ createdAt: 1 });
    return sendSuccess(res, categories, 200);
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const category = await Category.create({
      ...req.body,
      userId: req.user._id,
    });
    return sendSuccess(res, category, 201);
  } catch (err) {
    next(err);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!category) {
      return next(new AppError('Category not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, category, 200);
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!category) {
      return next(new AppError('Category not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, category, 200);
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!category) {
      return next(new AppError('Category not found', 404, 'NOT_FOUND'));
    }

    // Clear category reference on associated goals and events
    await Promise.all([
      Goal.updateMany({ categoryId: req.params.id, userId: req.user._id }, { categoryId: null }),
      Event.updateMany({ categoryId: req.params.id, userId: req.user._id }, { categoryId: null }),
    ]);

    return sendSuccess(res, { message: 'Category deleted successfully' }, 200);
  } catch (err) {
    next(err);
  }
};
