import mongoose from 'mongoose';

const progressLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Goal',
      required: [true, 'Goal ID is required'],
      index: true,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    value: {
      type: Number,
      required: [true, 'Progress value is required'],
    },
    delta: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    snapshotPercent: {
      type: Number,
      required: [true, 'Snapshot percent is required'],
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

progressLogSchema.index({ userId: 1, date: -1 });
progressLogSchema.index({ goalId: 1, date: -1 });

progressLogSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  return obj;
};

export const ProgressLog = mongoose.model('ProgressLog', progressLogSchema);
