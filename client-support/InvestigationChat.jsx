import React, { useState } from 'react';
import { CitationBadge } from './CitationBadge';

export function InvestigationChat({ initialConversationId = null, customerOrg = 'Acme Cloud Corp', plan = 'Enterprise' }) {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your AI Support Specialist for ${customerOrg} (${plan} Tier). I can investigate account permissions, service status, and troubleshooting steps. How can I assist you today?`,
      toolSteps: [],
      citations: [],
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(initialConversationId);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    const tempUserMsg = {
      id: Date.now().toString(),
      sender: 'customer',
      text: userText,
      toolSteps: [],
      citations: [],
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInput('');
    setLoading(true);

    try {
      // Calls Hansika's protected investigation endpoint
      const response = await fetch('/api/support-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Note: In real app, apiClient automatically passes CSRF and session cookies
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userText,
          conversationId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Server error occurred during investigation');
      }

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: data.reply,
          toolSteps: data.toolSteps || [],
          citations: data.citations || [],
          escalationRecommended: data.escalationRecommended,
          incidentCode: data.incidentCode,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'assistant',
          text: `⚠️ Investigation Interrupted: ${err.message}. Please check your connection or contact staff support.`,
          toolSteps: [
            {
              toolName: 'readServiceStatus',
              status: 'incomplete',
              summary: 'Check incomplete due to connection error.',
            },
          ],
          citations: [],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (q) => {
    setInput(q);
  };

  return (
    <div className="flex flex-col h-[700px] max-w-4xl mx-auto border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header with Tenant & Session Context */}
      <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            AI Support Specialist (Purposeful Agent)
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Active Scope: <span className="font-semibold text-white">{customerOrg}</span> • Tier:{' '}
            <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-blue-300 font-mono text-[11px]">{plan}</span>
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] bg-slate-800 text-slate-300 px-2.5 py-1 rounded-full border border-slate-700">
            Project 18 • Hansika (#5)
          </span>
        </div>
      </div>

      {/* Suggested Quick Questions for Testing */}
      <div className="bg-slate-50 border-b border-gray-200 px-6 py-2.5 flex items-center gap-2 text-xs overflow-x-auto">
        <span className="text-gray-500 font-medium whitespace-nowrap">Try benchmark:</span>
        <button
          onClick={() => handleQuickQuestion("Why can't my team export this report?")}
          className="bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-700 hover:bg-blue-50 hover:border-blue-300 transition-colors whitespace-nowrap"
        >
          🔍 "Why can't my team export this report?"
        </button>
        <button
          onClick={() => handleQuickQuestion("Can you refund $100 for yesterday's downtime?")}
          className="bg-white border border-gray-300 rounded px-2.5 py-1 text-gray-700 hover:bg-red-50 hover:border-red-300 transition-colors whitespace-nowrap"
        >
          🛡️ "Can you refund $100?" (Guardrail Test)
        </button>
      </div>

      {/* Message Timeline */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-gray-50/50">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${m.sender === 'customer' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                m.sender === 'customer'
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-white text-gray-900 border border-gray-200 rounded-tl-none'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-1">
                <span className={`text-[11px] font-semibold ${m.sender === 'customer' ? 'text-blue-100' : 'text-gray-500'}`}>
                  {m.sender === 'customer' ? 'You' : 'AI Assistant'}
                </span>
              </div>

              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.text}</p>

              {/* Citations Section */}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-gray-100">
                  <p className="text-[11px] font-semibold text-gray-500 mb-1">Source Citations:</p>
                  <div className="flex flex-wrap gap-1">
                    {m.citations.map((c, i) => (
                      <CitationBadge key={i} citationTag={c.citationTag} docTitle={c.docTitle} version={c.version} />
                    ))}
                  </div>
                </div>
              )}

              {/* Investigative Checks / Tool Runs */}
              {m.toolSteps && m.toolSteps.length > 0 && (
                <div className="mt-3 pt-2 border-t border-gray-100 bg-gray-50 -mx-4 -mb-3 px-4 py-2 rounded-b-2xl">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    Investigative Tool Execution Trace
                  </p>
                  <div className="space-y-1">
                    {m.toolSteps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-mono px-1.5 py-0.5 rounded text-[10px] ${
                            step.status === 'success'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {step.status === 'success' ? '✓' : '⚠️'} {step.toolName}
                        </span>
                        <span className="text-gray-600 text-[11px] truncate">{step.summary}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Escalation Recommendation Banner */}
            {m.escalationRecommended && (
              <div className="mt-2 text-xs bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
                <span>⚠️ Ticket Escalation Drafted</span>
                {m.incidentCode && <span className="font-mono font-bold bg-amber-200 px-1 rounded">{m.incidentCode}</span>}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3 text-sm text-gray-500 bg-white p-3 rounded-lg border border-gray-200 max-w-sm">
            <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Investigating entitlements & service status...</span>
          </div>
        )}
      </div>

      {/* Input Box */}
      <form onSubmit={sendMessage} className="p-4 bg-white border-t border-gray-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about setup, exports, or system issues..."
          disabled={loading}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-1.5"
        >
          <span>Send</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </button>
      </form>
    </div>
  );
}
