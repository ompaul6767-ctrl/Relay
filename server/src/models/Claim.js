import mongoose from 'mongoose';

const spanRefSchema = new mongoose.Schema(
  {
    spanId: {
      type: String,
      required: true,
    },
    quote: {
      type: String,
      required: true,
    },
    validated: {
      type: Boolean,
      default: false,
    },
    sourceName: {
      type: String,
    },
  },
  { _id: false }
);

const claimSchema = new mongoose.Schema(
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
      enum: ['owner', 'decision', 'risk', 'dependency', 'question', 'action', 'fact'],
    },
    text: {
      type: String,
      required: true,
    },
    entityKey: {
      type: String,
      default: '',
    },
    attribute: {
      type: String,
      default: '',
    },
    value: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      required: true,
      enum: [
        'Verified',
        'Attested',
        'Inferred',
        'Conflicting',
        'Missing',
        'Restricted',
        'Rejected',
      ],
      default: 'Inferred',
      index: true,
    },
    spanRefs: [spanRefSchema],
    acl: {
      type: String,
      required: true,
      enum: ['team', 'leads_only', 'owner_only'],
      default: 'team',
    },
    domains: [
      {
        type: String,
        enum: ['tech', 'design', 'ops'],
      },
    ],
    reviewDecision: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    reviewedBy: {
      type: String,
    },
    reviewNotes: {
      type: String,
    },
    supersedes: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
    },
    aiSupportVerdict: {
      type: String,
      enum: ['yes', 'partial', 'no', 'unverified'],
      default: 'unverified',
    },
    conflictDetails: {
      type: mongoose.Schema.Types.Mixed,
    },
    suggestedPerson: {
      type: String,
    },
    rejectionReason: {
      type: String,
    },
    timelineDate: {
      type: Date,
    },
    dateEstimated: {
      type: Boolean,
      default: false,
    },
    isFromInterview: {
      type: Boolean,
      default: false,
    },
    interviewAuthor: {
      type: String,
    },
    originInterviewQuestionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'InterviewQuestion',
    },
    isStale: {
      type: Boolean,
      default: false,
    },
    stalenessStatus: {
      type: String,
      enum: ['fresh', 'superseded', 'possibly_stale'],
      default: 'fresh',
    },
    stalenessReason: {
      type: String,
      default: '',
    },
    supersededByClaimId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Claim',
    },
    dismissedStaleness: {
      dismissedBy: { type: String },
      dismissedAt: { type: Date },
      reason: { type: String },
    },
    embedding: {
      type: [Number],
      select: true,
    },
    embeddingModel: {
      type: String,
    },
  },
  { timestamps: true }
);

claimSchema.index({ caseId: 1, entityKey: 1, attribute: 1 });
claimSchema.index({ caseId: 1, acl: 1, reviewDecision: 1 });

export const Claim = mongoose.model('Claim', claimSchema);
