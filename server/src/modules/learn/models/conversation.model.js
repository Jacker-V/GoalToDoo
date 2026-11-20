import mongoose from 'mongoose';

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    title: {
      type: String,
      default: 'Cuộc trò chuyện mới',
      trim: true,
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    summary: {
      type: String,
      default: '',
    },
    summaryUpToMessageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ userId: 1, pinned: -1, updatedAt: -1 });

export const Conversation = mongoose.model('Conversation', conversationSchema);
