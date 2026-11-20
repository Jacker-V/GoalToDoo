import mongoose from 'mongoose';

const uploadedFileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    originalName: {
      type: String,
      required: [true, 'Original name is required'],
    },
    mime: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    size: {
      type: Number,
      required: [true, 'Size is required'],
    },
    storagePath: {
      type: String,
      required: [true, 'Storage path is required'],
    },
  },
  {
    timestamps: true,
  }
);

uploadedFileSchema.index({ userId: 1, createdAt: -1 });

export const UploadedFile = mongoose.model('UploadedFile', uploadedFileSchema);
