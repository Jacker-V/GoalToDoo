import { Event } from '../models/event.model.js';
import { Category } from '../models/category.model.js';
import { AppError, sendSuccess } from '../utils/response.js';

export const getEvents = async (req, res, next) => {
  try {
    const { start, end, categoryId } = req.query;
    const filter = { userId: req.user._id };

    if (categoryId !== undefined) {
      filter.categoryId = categoryId === 'null' ? null : categoryId;
    }

    if (start || end) {
      filter.$and = [];
      if (start) {
        filter.$and.push({ end: { $gte: new Date(start) } });
      }
      if (end) {
        filter.$and.push({ start: { $lte: new Date(end) } });
      }
    }

    const events = await Event.find(filter).sort({ start: 1 });
    return sendSuccess(res, events, 200);
  } catch (err) {
    next(err);
  }
};

export const createEvent = async (req, res, next) => {
  try {
    if (new Date(req.body.end) < new Date(req.body.start)) {
      return next(new AppError('Event end time cannot be before start time', 400, 'INVALID_TIME_RANGE'));
    }

    if (req.body.categoryId) {
      const category = await Category.findOne({ _id: req.body.categoryId, userId: req.user._id });
      if (!category) {
        return next(new AppError('Category not found', 404, 'NOT_FOUND'));
      }
    }

    const event = await Event.create({
      ...req.body,
      userId: req.user._id,
    });
    return sendSuccess(res, event, 201);
  } catch (err) {
    next(err);
  }
};

export const getEventById = async (req, res, next) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!event) {
      return next(new AppError('Event not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, event, 200);
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req, res, next) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!event) {
      return next(new AppError('Event not found', 404, 'NOT_FOUND'));
    }

    const newStart = req.body.start ? new Date(req.body.start) : event.start;
    const newEnd = req.body.end ? new Date(req.body.end) : event.end;
    if (newEnd < newStart) {
      return next(new AppError('Event end time cannot be before start time', 400, 'INVALID_TIME_RANGE'));
    }

    if (req.body.categoryId) {
      const category = await Category.findOne({ _id: req.body.categoryId, userId: req.user._id });
      if (!category) {
        return next(new AppError('Category not found', 404, 'NOT_FOUND'));
      }
    }

    Object.assign(event, req.body);
    await event.save();

    return sendSuccess(res, event, 200);
  } catch (err) {
    next(err);
  }
};

export const deleteEvent = async (req, res, next) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!event) {
      return next(new AppError('Event not found', 404, 'NOT_FOUND'));
    }
    return sendSuccess(res, { message: 'Event deleted successfully' }, 200);
  } catch (err) {
    next(err);
  }
};
