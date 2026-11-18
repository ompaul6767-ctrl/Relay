import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ['notes', 'tasks_csv', 'chat_json', 'repo_export', 'interview'],
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    acl: {
      type: String,
      required: true,
      enum: ['team', 'leads_only', 'owner_only'],
      default: 'team',
    },
    consentConfirmed: {
      type: Boolean,
      required: true,
      default: false,
    },
    rawText: {
      type: String,
      required: true,
    },
    uploadedBy: {
      type: String,
      default: 'Aarav',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

export const Source = mongoose.model('Source', sourceSchema);
