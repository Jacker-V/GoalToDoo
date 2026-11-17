import mongoose from 'mongoose';

const eventRecurrenceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekdays', 'weekly', 'monthly', 'yearly'],
      default: 'none',
    },
    interval: {
      type: Number,
      default: 1,
      min: 1,
    },
    daysOfWeek: {
      type: [Number],
      default: [],
    },
    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    _id: false,
  }
);

const eventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Event title is required'],
      trim: true,
      maxlength: [200, 'Event title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    start: {
      type: Date,
      required: [true, 'Start time is required'],
    },
    end: {
      type: Date,
      required: [true, 'End time is required'],
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    color: {
      type: String,
      default: '#6366f1',
      trim: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    recurrence: {
      type: eventRecurrenceSchema,
      default: () => ({}),
    },
    reminders: {
      type: [Number], // minutes before event
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.index({ userId: 1, start: 1, end: 1 });

eventSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const Event = mongoose.model('Event', eventSchema);
