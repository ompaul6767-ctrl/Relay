export type UserRole = 'lead' | 'departing' | 'incoming_dev' | 'incoming_designer';

export type ClaimStatus =
  | 'Verified'
  | 'Attested'
  | 'Inferred'
  | 'Conflicting'
  | 'Missing'
  | 'Restricted'
  | 'Rejected';

export type ClaimType =
  | 'owner'
  | 'decision'
  | 'risk'
  | 'dependency'
  | 'question'
  | 'action'
  | 'fact';

export type ACL = 'team' | 'leads_only' | 'owner_only';

export type Domain = 'tech' | 'design' | 'ops';

export type ReviewDecision = 'pending' | 'approved' | 'rejected';

export interface SpanRef {
  spanId: string;
  quote: string;
  validated?: boolean;
  sourceName?: string;
}

export interface Claim {
  _id: string;
  caseId: string;
  type: ClaimType;
  text: string;
  entityKey?: string;
  attribute?: string;
  value?: string;
  status: ClaimStatus;
  spanRefs: SpanRef[];
  acl: ACL;
  domains: Domain[];
  reviewDecision: ReviewDecision;
  reviewedBy?: string;
  reviewNotes?: string;
  aiSupportVerdict: 'yes' | 'partial' | 'no' | 'unverified';
  conflictDetails?: {
    entityKey: string;
    attribute: string;
    conflictingValues: Array<{
      value: string;
      source: string;
      spanId: string;
      quote: string;
      date?: string;
    }>;
  };
  suggestedPerson?: string;
  rejectionReason?: string;
  isRestrictedStub?: boolean;
  timelineDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Case {
  _id: string;
  title: string;
  departingMemberName: string;
  status: 'draft' | 'in_review' | 'published';
  currentVersion: number;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  stats?: {
    sourceCount: number;
    claimCount: number;
    approvedCount: number;
    pendingCount: number;
    conflictsCount?: number;
    gapsCount?: number;
  };
}

export interface Source {
  _id: string;
  caseId: string;
  name: string;
  type: 'notes' | 'tasks_csv' | 'chat_json' | 'repo_export';
  acl: ACL;
  consentConfirmed: boolean;
  rawText: string;
  uploadedBy?: string;
  spanCount?: number;
  createdAt?: string;
}

export interface Span {
  _id: string;
  caseId: string;
  sourceId: string;
  sourceName?: string;
  index: number;
  text: string;
  author: string;
  timestamp?: string;
  acl: ACL;
  stableId: string;
}

export interface Version {
  _id: string;
  caseId: string;
  number: number;
  approvedClaimSnapshot: Claim[];
  publishedBy: string;
  publishedAt: string;
  claimCount?: number;
  diffFromPrevious?: {
    added: number;
    modified: number;
    removed: number;
    details?: any[];
  };
}

export interface AuditLog {
  _id: string;
  caseId: string;
  actor: string;
  role: string;
  action: string;
  targetId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface HandoverSection {
  whoOwnsWhat: Claim[];
  decisionsAndWhy: Claim[];
  risks: Claim[];
  dependencies: Claim[];
  openQuestions: Claim[];
  gaps: Claim[];
  timeline: Array<{
    date: string;
    title: string;
    type: ClaimType;
    entityKey: string;
    claimId: string;
    spanRefs: SpanRef[];
  }>;
  nextActions: {
    day1: Array<{ id: string; title: string; description: string; priority: string; due: string }>;
    week1: Array<{ id: string; title: string; description: string; priority: string; due: string; claimId?: string }>;
    day30: Array<{ id: string; title: string; description: string; priority: string; due: string }>;
  };
}
