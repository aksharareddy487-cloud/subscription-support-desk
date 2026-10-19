import mongoose from 'mongoose';

const toolRunSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    toolName: {
      type: String,
      required: true,
      enum: ['readEntitlements', 'readServiceStatus', 'searchHelp'],
    },
    inputParams: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    outputResult: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ['success', 'incomplete', 'failed', 'timeout'],
      default: 'success',
      index: true,
    },
    durationMs: {
      type: Number,
      default: 0,
    },
    errorMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ToolRun = mongoose.model('ToolRun', toolRunSchema);
