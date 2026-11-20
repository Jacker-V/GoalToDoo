import mongoose from 'mongoose';

const learnerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    level: {
      type: String,
      default: 'Intermediate (B1)',
      trim: true,
    },
    targetGoal: {
      type: String,
      default: '',
      trim: true,
    },
    targetDate: {
      type: Date,
      default: null,
    },
    dailyMinutes: {
      type: Number,
      default: 30,
      min: [5, 'Daily minutes must be at least 5'],
      max: [480, 'Daily minutes cannot exceed 480'],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    interests: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

export const LearnerProfile = mongoose.model('LearnerProfile', learnerProfileSchema);
