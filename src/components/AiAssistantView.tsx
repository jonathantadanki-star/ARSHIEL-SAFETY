import React, { useCallback, useEffect, useState } from 'react';
import { BookOpen, Plus, Send, Sparkles, Trash2 } from 'lucide-react';
import { apiFetch } from '../lib/api';

const AI_MODES = [
  'General EHS Advisory',
  'Draft HIRA Matrix',
  'Generate JSA / JHA / SWMS',
  'HAZOP Guideword Prompts',
  '5-Why & Fishbone RCA',
  'Draft Corrective & Preventive Actions (CAPA)',
  'Recommend PTW Hazards & PPE',
  'Toolbox Talk Script',
  'Safety Audit Checklist Generator',
  'Indian OSH Code 2020 / Legal Compliance',
];

export function AiAssistantView() {
  const [mode, setMode] = useState(AI_MODES[0]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; sources?: any[] }[]>([]);
  const [kbDocs, setKbDocs] = useState<any[]>([]);
  const [kbTitle, setKbTitle] = useState('');
  const [kbType, setKbType] = useState('SOP');
  const [kbRef, setKbRef] = useState('');
  const [kbContent, setKbContent] = useState('');

  const loadKb = useCallback(async () => {
    const rows = await apiFetch('/api/ai/knowledge-base');
    setKbDocs(rows);
  }, []);

  useEffect(() => {
    loadKb();
  }, [loadKb]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const userMsg = prompt.trim();
    setMessages((prev) => [...prev, { role: 'user', text: `[${mode}] ${userMsg}` }]);
    setPrompt('');
    setLoading(true);
    try {
      const res = await apiFetch('/api/ai/assistant', {
        method: 'POST',
        body: JSON.stringify({ prompt: userMsg, taskMode: mode }),
      });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: res.answer, sources: res.sourcesUsed },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Error: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddKb = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/ai/knowledge-base', {
      method: 'POST',
      body: JSON.stringify({
        title: kbTitle,
        docType: kbType,
        sourceReference: kbRef || `KB-${Date.now().toString().slice(-4)}`,
        contentText: kbContent,
      }),
    });
    setKbTitle('');
    setKbRef('');
    setKbContent('');
    await loadKb();
  };

  const handleDeleteKb = async (id: string) => {
    await apiFetch(`/api/ai/knowledge-base/${id}`, { method: 'DELETE' });
    await loadKb();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          ARSHIEL AI Safety Assistant &amp; RAG Knowledge Base
        </h1>
        <p className="text-sm text-slate-500">
          Server-side Gemini EHS Copilot grounded in your organization&apos;s approved SOPs, HIRAs, and statutory rules.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-300 rounded-md px-4 py-2.5 text-xs text-amber-950 flex flex-wrap items-center justify-between gap-2">
        <div>
          <strong>AI Transparency &amp; Human Verification Required:</strong> Every AI-generated HIRA, JSA, SOP, RCA, or
          compliance summary is a preliminary <strong>AI Draft</strong> and is never auto-approved. Review citations and
          obtain competent safety officer sign-off prior to field execution.
        </div>
        <span className="font-mono text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-200 text-amber-950">
          STATUS: AI DRAFT ONLY
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* AI Chat & Copilot */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md flex flex-col h-[620px]">
          <div className="p-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>AI Mode:</span>
            </div>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="flex-1 max-w-xs border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            >
              {AI_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-xs text-slate-500 space-y-2 py-8 text-center">
                <p className="font-semibold text-slate-700">Ask ARSHIEL AI to assist with any EHS workflow:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    'Draft a JSA for Confined Space tank cleaning',
                    'Prepare a 5-minute Toolbox Talk on Hot Work & Three Golden Rules',
                    'Summarize OSH Code 2020 contractor safety obligations',
                  ].map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setPrompt(q)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 cursor-pointer"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-3 rounded text-xs whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white ml-8'
                    : 'bg-slate-50 border border-slate-200 text-slate-800 mr-4'
                }`}
              >
                {m.role === 'assistant' && (
                  <div className="mb-1.5 pb-1 border-b border-slate-200 flex items-center justify-between text-[10px] font-bold uppercase text-amber-800">
                    <span>AI-Generated Draft · Requires Competent Human Approval</span>
                    <span>Rev 1.0 Draft</span>
                  </div>
                )}
                <div>{m.text}</div>
                {m.sources && m.sources.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-[11px] text-emerald-800">
                    <strong>Knowledge Base Citations:</strong>{' '}
                    {m.sources.map((s) => `[${s.sourceReference}] ${s.title}`).join(' · ')}
                  </div>
                )}
              </div>
            ))}
            {loading && <div className="text-xs text-slate-400">Generating grounded safety guidance...</div>}
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 flex gap-2">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ask for HIRA, JSA, HAZOP, RCA, PTW controls, or compliance advice..."
              className="flex-1 border border-slate-300 rounded px-3 py-2 text-xs"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-700 text-white rounded cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>
          </form>
        </div>

        {/* Company Knowledge Base Manager */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>Approved AI Knowledge Base ({kbDocs.length})</span>
          </div>

          <form onSubmit={handleAddKb} className="space-y-2 bg-slate-50 border border-slate-200 rounded p-3">
            <div className="text-xs font-bold text-slate-800">Add SOP / Policy / Legal Reference</div>
            <input
              required
              value={kbTitle}
              onChange={(e) => setKbTitle(e.target.value)}
              placeholder="Document Title *"
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={kbType}
                onChange={(e) => setKbType(e.target.value)}
                className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
              >
                {['SOP', 'Safety Policy', 'HIRA Register', 'Emergency Plan', 'OSH Code / Legal', 'Training Material'].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              <input
                value={kbRef}
                onChange={(e) => setKbRef(e.target.value)}
                placeholder="Doc Ref Code"
                className="border border-slate-300 rounded px-2 py-1.5 text-xs bg-white"
              />
            </div>
            <textarea
              required
              rows={3}
              value={kbContent}
              onChange={(e) => setKbContent(e.target.value)}
              placeholder="Paste SOP clauses, safe operating limits, or compliance text for AI citation..."
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs bg-white"
            />
            <button
              type="submit"
              className="w-full py-1.5 text-xs font-semibold bg-slate-900 text-white rounded flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add to Knowledge Base
            </button>
          </form>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {kbDocs.map((d) => (
              <div key={d.id} className="border border-slate-200 rounded p-2.5 text-xs flex justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    [{d.sourceReference}] {d.title}
                  </div>
                  <div className="text-[11px] text-slate-500">{d.docType} · Approved by {d.approvedBy}</div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteKb(d.id)}
                  className="text-red-600 hover:text-red-800 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
