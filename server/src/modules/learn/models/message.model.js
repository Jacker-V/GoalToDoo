import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema(
  {
    fileId: { type: String },
    name: { type: String },
    mime: { type: String },
    size: { type: Number },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: [true, 'Conversation ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    role: {
      type: String,
      enum: ['user', 'assistant', 'system', 'tool'],
      required: [true, 'Role is required'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
    toolCalls: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    tokenUsage: {
      input: { type: Number, default: 0 },
      output: { type: Number, default: 0 },
    },
    feedback: {
      type: String,
      enum: ['thumbs_up', 'thumbs_down', null],
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

export const Message = mongoose.model('Message', messageSchema);
