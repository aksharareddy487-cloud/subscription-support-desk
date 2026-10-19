import React from 'react';

export function CitationBadge({ citationTag, docTitle, version }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 mr-1.5 mb-1 cursor-pointer hover:bg-blue-100 transition-colors"
      title={`Source Document: ${docTitle || 'Knowledge Article'} (${version || 'v2.4'})`}
    >
      <svg className="w-3 h-3 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      {citationTag || `[Doc: ${docTitle} (${version})]`}
    </span>
  );
}
