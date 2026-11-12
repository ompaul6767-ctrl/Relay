import mongoose from 'mongoose';

const auditSchema = new mongoose.Schema(
  {
    caseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Case',
      required: true,
      index: true,
    },
    actor: {
      type: String,
      required: true,
      default: 'Anonymous',
    },
    role: {
      type: String,
      default: 'viewer',
    },
    action: {
      type: String,
      required: true, // uploads, access_decision, edit, approval, rejection, export, view, resolve, publish, acknowledge
      index: true,
    },
    targetId: {
      type: String,
      default: '',
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

auditSchema.index({ caseId: 1, timestamp: -1 });

export const Audit = mongoose.model('Audit', auditSchema);

// Helper function to safely log audit events without leaking restricted information
export async function logAudit({ caseId, actor, role, action, targetId = '', metadata = {} }) {
  try {
    // Sanitize metadata to never store secrets or raw restricted content
    const sanitizedMeta = { ...metadata };
    delete sanitizedMeta.rawText;
    delete sanitizedMeta.secret;
    delete sanitizedMeta.password;
    delete sanitizedMeta.apiKey;

    await Audit.create({
      caseId,
      actor,
      role,
      action,
      targetId: String(targetId),
      metadata: sanitizedMeta,
      timestamp: new Date(),
    });
  } catch (err) {
    console.error('[Audit] Failed to record audit log:', err.message);
  }
}
