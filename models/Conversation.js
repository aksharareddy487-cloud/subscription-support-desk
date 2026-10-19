import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: String,
      enum: ['customer', 'assistant', 'system'],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    citations: [
      {
        docTitle: String,
        version: String,
        citationTag: String,
      },
    ],
    toolSteps: [
      {
        toolName: String,
        status: String,
        summary: String,
        toolRunId: { type: mongoose.Schema.Types.ObjectId, ref: 'ToolRun' },
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: true }
);

const conversationSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['active', 'escalated', 'resolved', 'closed'],
      default: 'active',
    },
    associatedTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ticket',
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  }
);

export const Conversation = mongoose.model('Conversation', conversationSchema);
