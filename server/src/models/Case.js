import mongoose from 'mongoose';

const caseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    departingMemberName: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['draft', 'in_review', 'published'],
      default: 'draft',
    },
    currentVersion: {
      type: Number,
      default: 0,
    },
    createdBy: {
      type: String,
      default: 'system',
    },
  },
  { timestamps: true }
);

export const Case = mongoose.model('Case', caseSchema);
