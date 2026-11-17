import mongoose from 'mongoose';

const subtaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Subtask title is required'],
      trim: true,
      maxlength: [200, 'Subtask title cannot exceed 200 characters'],
    },
    done: {
      type: Boolean,
      default: false,
    },
  },
  {
    _id: true,
  }
);

const recurrenceSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['none', 'daily', 'weekdays', 'weekly'],
      default: 'none',
    },
    daysOfWeek: {
      type: [Number],
      default: [],
    },
    interval: {
      type: Number,
      default: 1,
      min: 1,
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

const taskSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Task title is required'],
      trim: true,
      maxlength: [200, 'Task title cannot exceed 200 characters'],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      default: null,
      index: true,
    },
    dueDate: {
      type: Date,
      default: null,
    },
    dueTime: {
      type: String,
      default: null,
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
    tags: {
      type: [String],
      default: [],
    },
    subtasks: {
      type: [subtaskSchema],
      default: [],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    recurrence: {
      type: recurrenceSchema,
      default: () => ({}),
    },
    order: {
      type: Number,
      default: 0,
    },
    weight: {
      type: Number,
      default: 1,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

taskSchema.index({ userId: 1, dueDate: 1 });
taskSchema.index({ userId: 1, isCompleted: 1 });

taskSchema.virtual('progress').get(function () {
  if (this.subtasks && this.subtasks.length > 0) {
    const doneCount = this.subtasks.filter((s) => s.done).length;
    return Math.round((doneCount / this.subtasks.length) * 100 * 100) / 100;
  }
  return this.isCompleted ? 100 : 0;
});

taskSchema.methods.toJSON = function () {
  const obj = this.toObject({ virtuals: true });
  delete obj.__v;
  return obj;
};

export const Task = mongoose.model('Task', taskSchema);
