import mongoose from 'mongoose';

const aiUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    date: {
      type: String,
      required: [true, 'Date is required in YYYY-MM-DD format'],
    },
    requests: {
      type: Number,
      default: 0,
      min: 0,
    },
    inputTokens: {
      type: Number,
      default: 0,
      min: 0,
    },
    outputTokens: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

aiUsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const AiUsage = mongoose.model('AiUsage', aiUsageSchema);
