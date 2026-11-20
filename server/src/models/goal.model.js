import mongoose from 'mongoose';

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Goal title is required'],
      trim: true,
      maxlength: [200, 'Goal title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ['year', 'quarter', 'month', 'week', 'custom'],
        message: '{VALUE} is not a valid goal type',
      },
      default: 'custom',
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null,
      index: true,
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      default: null,
      index: true,
    },
    color: {
      type: String,
      default: '#6366f1',
      trim: true,
    },
    priority: {
      type: String,
      enum: {
        values: ['low', 'medium', 'high'],
        message: '{VALUE} is not a valid priority',
      },
      default: 'medium',
    },
    status: {
      type: String,
      enum: {
        values: ['not_started', 'in_progress', 'completed', 'paused', 'cancelled'],
        message: '{VALUE} is not a valid status',
      },
      default: 'not_started',
    },
    progressMode: {
      type: String,
      enum: {
        values: ['auto', 'numeric'],
        message: '{VALUE} is not a valid progressMode',
      },
      default: 'auto',
    },
    linkedMetric: {
      type: String,
      enum: {
        values: ['none', 'cards_added', 'cards_mastered', 'review_sessions'],
        message: '{VALUE} is not a valid linkedMetric',
      },
      default: 'none',
    },
    targetValue: {
      type: Number,
      default: 100,
      min: [0, 'Target value cannot be negative'],
    },
    currentValue: {
      type: Number,
      default: 0,
      min: [0, 'Current value cannot be negative'],
    },
    unit: {
      type: String,
      default: '',
      trim: true,
    },
    weight: {
      type: Number,
      default: 1,
      min: [0, 'Weight cannot be negative'],
    },
    progressCache: {
      type: Number,
      default: 0,
      min: [0, 'Progress cannot be negative'],
      max: [100, 'Progress cannot exceed 100'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound and single indexes
goalSchema.index({ userId: 1, startDate: 1, endDate: 1 });
goalSchema.index({ userId: 1, status: 1 });
goalSchema.index({ userId: 1, categoryId: 1 });

// Virtual: idealProgress (0-100)
goalSchema.virtual('idealProgress').get(function () {
  if (!this.startDate || !this.endDate) return 0;
  const now = Date.now();
  const start = new Date(this.startDate).getTime();
  const end = new Date(this.endDate).getTime();

  if (end <= start) return now >= end ? 100 : 0;
  if (now <= start) return 0;

  const progress = ((now - start) / (end - start)) * 100;
  return Math.round(Math.min(Math.max(progress, 0), 100) * 100) / 100;
});

// Virtual: isOverdue (true if endDate < now and progressCache < 100)
goalSchema.virtual('isOverdue').get(function () {
  if (!this.endDate) return false;
  const now = Date.now();
  const end = new Date(this.endDate).getTime();
  return end < now && (this.progressCache ?? 0) < 100;
});

// Virtual: atRisk (true when time has elapsed, idealProgress - progressCache > 20, and not completed)
goalSchema.virtual('atRisk').get(function () {
  if ((this.progressCache ?? 0) >= 100) return false;
  if (!this.startDate || !this.endDate) return false;
  const now = Date.now();
  const start = new Date(this.startDate).getTime();
  if (now <= start) return false;

  const ideal = this.idealProgress;
  return ideal - (this.progressCache ?? 0) > 20;
});

goalSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

export const Goal = mongoose.model('Goal', goalSchema);
