import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Mic, MicOff, Sparkles, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../lib/api';
import { StatusTag } from './IconResolver';
import { ModuleKpiStrip } from './ModuleKpiStrip';

export function AiObservationsView({ onOpenMasterKpi }: { onOpenMasterKpi?: () => void }) {
  const { hierarchy } = useAuth();
  const [observations, setObservations] = useState<any[]>([]);
  const [inputSource, setInputSource] = useState<'Photo' | 'Video' | 'Voice' | 'Text'>('Photo');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [plantId, setPlantId] = useState('');
  const [beforePhoto, setBeforePhoto] = useState<string>('');
  const [videoClipName, setVideoClipName] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiDraft, setAiDraft] = useState<any | null>(null);
  const [humanVerified, setHumanVerified] = useState(false);
  const [coachingNotes, setCoachingNotes] = useState('');
  const [listening, setListening] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const loadObservations = useCallback(async () => {
    const rows = await apiFetch('/api/observations');
    setObservations(rows);
  }, []);

  useEffect(() => {
    loadObservations();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [loadObservations]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBeforePhoto(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      setCameraOpen(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setErrorMsg('Camera access unavailable in this browser context. Upload an image file instead.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      setBeforePhoto(canvas.toDataURL('image/jpeg', 0.85));
    }
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setCameraOpen(false);
  };

  const toggleVoiceDictation = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setErrorMsg('Web Speech voice dictation is not supported in this browser.');
      return;
    }
    if (listening) {
      setListening(false);
      return;
    }
    const rec = new SpeechRec();
    rec.lang = 'en-IN';
    rec.onresult = (ev: any) => {
      const transcript = ev.results?.[0]?.[0]?.transcript || '';
      setDescription((prev) => `${prev ? prev + ' ' : ''}${transcript}`);
      setInputSource('Voice');
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.start();
    setListening(true);
  };

  const runAiAnalysis = async () => {
    setErrorMsg(null);
    setAnalyzing(true);
    try {
      const result = await apiFetch('/api/ai/analyze-observation', {
        method: 'POST',
        body: JSON.stringify({
          description,
          location,
          imageDataUrl: beforePhoto || undefined,
        }),
      });
      setAiDraft(result);
      setCoachingNotes(result.bbsCoachingNote || '');
      setHumanVerified(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSubmitObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!humanVerified) {
      setErrorMsg('Mandatory Safety Guardrail: Confirm human Safety Officer review before saving.');
      return;
    }
    const plantObj = hierarchy.plants.find((p) => p.id === plantId);
    await apiFetch('/api/observations', {
      method: 'POST',
      body: JSON.stringify({
        plantId: plantId || null,
        plantName: plantObj?.name || null,
        title: aiDraft?.title || description.slice(0, 70) || 'Workplace Safety Observation',
        observationType: aiDraft?.observationType || 'Unsafe Condition',
        category: aiDraft?.hazardCategory || 'General Safety',
        severity: aiDraft?.suggestedSeverity || 'Medium',
        likelihood: aiDraft?.suggestedLikelihood || 'Possible',
        riskLevel: aiDraft?.suggestedRiskLevel || 'Medium',
        description: aiDraft?.detailedDescription || description,
        location,
        inputSource,
        beforePhotoData: beforePhoto || null,
        aiAnalysis: aiDraft || {},
        humanVerified,
        immediateAction: aiDraft?.immediateAction || '',
        correctiveAction: aiDraft?.correctiveAction || '',
        preventiveAction: aiDraft?.preventiveAction || '',
        coachingNotes,
      }),
    });

    setDescription('');
    setLocation('');
    setBeforePhoto('');
    setAiDraft(null);
    setHumanVerified(false);
    await loadObservations();
  };

  const handleCloseObservation = async (id: string, afterPhotoData?: string) => {
    await apiFetch(`/api/observations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'Closed',
        humanVerified: true,
        ...(afterPhotoData ? { afterPhotoData } : {}),
      }),
    });
    await loadObservations();
  };

  const repeatMatches = location.trim()
    ? observations.filter((o) => o.location && o.location.toLowerCase() === location.trim().toLowerCase()).length
    : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">
          AI Safety Observation &amp; BBS Coaching
        </h1>
        <p className="text-sm text-slate-500">
          Capture site photos, voice dictation, or notes for Gemini multimodal hazard analysis with mandatory Safety Officer verification.
        </p>
      </div>

      <ModuleKpiStrip
        title="AI Observations & BBS Individual KPIs"
        onOpenMasterKpi={onOpenMasterKpi}
        items={[
          { label: 'Total Observations', value: observations.length, hint: 'Photo · Voice · Text' },
          { label: 'Human Officer Verified', value: `${observations.filter((o) => o.humanVerified).length}/${observations.length}`, hint: 'Safety Officer sign-off' },
          { label: 'Open Hazards', value: observations.filter((o) => o.status !== 'Closed').length, hint: 'Pending closure', alert: observations.some((o) => o.status !== 'Closed' && (o.riskLevel === 'High' || o.riskLevel === 'Critical')) },
          { label: 'BBS Closure Rate', value: `${observations.length > 0 ? Math.round((observations.filter((o) => o.status === 'Closed').length / observations.length) * 100) : 100}%`, hint: 'Preventive closure %' },
        ]}
      />

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs px-4 py-2.5 rounded">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Intake & AI Analyzer */}
        <form onSubmit={handleSubmitObservation} className="lg:col-span-5 bg-white border border-slate-200 rounded-md p-4 space-y-3">
          <div className="text-sm font-bold text-slate-900">New Multimodal Safety Observation</div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={plantId}
              onChange={(e) => setPlantId(e.target.value)}
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            >
              <option value="">Select Plant...</option>
              {hierarchy.plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location / Bay"
              className="border border-slate-300 rounded px-2.5 py-1.5 text-xs"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startCamera}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera</span>
            </button>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Photo</span>
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
            </label>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-300 rounded hover:bg-slate-50 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Video</span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setInputSource('Video');
                    setVideoClipName(`${file.name} (${Math.round(file.size / 1024)} KB)`);
                  }
                }}
                className="hidden"
              />
            </label>
            <button
              type="button"
              onClick={toggleVoiceDictation}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs border rounded cursor-pointer ${
                listening ? 'bg-red-50 border-red-300 text-red-700' : 'border-slate-300'
              }`}
            >
              {listening ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              <span>{listening ? 'Listening...' : 'Voice Input'}</span>
            </button>
          </div>
          {videoClipName && (
            <div className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded px-2.5 py-1">
              Video evidence attached: {videoClipName}
            </div>
          )}
          {repeatMatches > 0 && (
            <div className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded px-2.5 py-1 font-medium">
              Repeat Hazard Alert: {repeatMatches} prior observation(s) logged at &ldquo;{location}&rdquo;.
            </div>
          )}

          {cameraOpen && (
            <div className="space-y-2">
              <video ref={videoRef} className="w-full rounded border border-slate-300" />
              <button
                type="button"
                onClick={capturePhoto}
                className="w-full py-1.5 text-xs font-semibold bg-emerald-700 text-white rounded"
              >
                Capture Frame
              </button>
            </div>
          )}

          {beforePhoto && (
            <img
              src={beforePhoto}
              alt="Observation evidence"
              className="w-full h-40 object-cover rounded border border-slate-200"
            />
          )}

          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe hazard, unsafe condition, or safe behavior observed..."
            className="w-full border border-slate-300 rounded px-2.5 py-2 text-xs"
          />

          <button
            type="button"
            onClick={runAiAnalysis}
            disabled={analyzing || (!description && !beforePhoto)}
            className="w-full py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>{analyzing ? 'Analyzing via Gemini Multimodal AI...' : 'Analyze Hazard with ARSHIEL AI'}</span>
          </button>

          {aiDraft && (
            <div className="bg-slate-50 border border-slate-200 rounded p-3 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{aiDraft.title}</span>
                <span className="tabular-nums text-emerald-800 font-semibold">
                  Confidence: {Math.round((aiDraft.confidence || 0.8) * 100)}%
                </span>
              </div>
              <div className="text-slate-700">{aiDraft.detailedDescription}</div>
              <div>
                <strong>Classification:</strong> {aiDraft.observationType} · {aiDraft.hazardCategory} · Risk: {aiDraft.suggestedRiskLevel}
              </div>
              <div><strong>Immediate Action:</strong> {aiDraft.immediateAction}</div>
              <div><strong>CAPA Suggestion:</strong> {aiDraft.correctiveAction}</div>
              <div className="text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                <strong>Uncertainty &amp; Guardrail:</strong> {aiDraft.uncertaintyNotes} — {aiDraft.humanVerificationNotice}
              </div>
            </div>
          )}

          <input
            value={coachingNotes}
            onChange={(e) => setCoachingNotes(e.target.value)}
            placeholder="Positive BBS coaching notes (non-punitive)..."
            className="w-full border border-slate-300 rounded px-2.5 py-1.5 text-xs"
          />

          <label className="flex items-start gap-2 text-xs font-semibold text-emerald-900 bg-emerald-50 border border-emerald-200 rounded p-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={humanVerified}
              onChange={(e) => setHumanVerified(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I confirm a qualified Safety Officer / Reviewer has verified this classification and risk level.
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-2 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded cursor-pointer"
          >
            Save Verified Observation
          </button>
        </form>

        {/* Observations Log */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 font-bold text-sm text-slate-900">
            Observation &amp; BBS Register ({observations.length})
          </div>
          <div className="divide-y divide-slate-100">
            {observations.map((o) => {
              const sameLocCount = o.location
                ? observations.filter((x) => x.location && x.location.toLowerCase() === o.location.toLowerCase()).length
                : 1;
              return (
              <div key={o.id} className="p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-slate-900 tabular-nums">{o.observationNumber}</span>
                      <StatusTag status={o.observationType} />
                      <StatusTag status={o.riskLevel} />
                      <StatusTag status={o.status} />
                      {sameLocCount > 1 && (
                        <span className="text-[11px] font-semibold text-amber-800">
                          Repeat Location ({sameLocCount}×)
                        </span>
                      )}
                      {o.humanVerified && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Verified by {o.verifiedBy}
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-slate-900">{o.title}</div>
                    <div className="text-xs text-slate-600">{o.description}</div>
                    {o.coachingNotes && (
                      <div className="text-xs text-emerald-800">BBS Coaching: {o.coachingNotes}</div>
                    )}
                  </div>
                  {o.status !== 'Closed' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <label className="px-2.5 py-1.5 text-xs font-semibold border border-slate-300 bg-white rounded cursor-pointer hover:bg-slate-50">
                        <span>After Photo + Close</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const r = new FileReader();
                            r.onload = () => handleCloseObservation(o.id, String(r.result || ''));
                            r.readAsDataURL(f);
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => handleCloseObservation(o.id)}
                        className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded cursor-pointer"
                      >
                        Mark Closed
                      </button>
                    </div>
                  )}
                </div>
                {(o.beforePhotoData || o.afterPhotoData) && (
                  <div className="grid grid-cols-2 gap-2 pt-1 max-w-md">
                    {o.beforePhotoData && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase text-slate-500 mb-0.5">Before Condition</div>
                        <img src={o.beforePhotoData} alt="Before" className="h-20 w-full object-cover rounded border border-slate-200" />
                      </div>
                    )}
                    {o.afterPhotoData && (
                      <div>
                        <div className="text-[10px] font-semibold uppercase text-emerald-700 mb-0.5">After Rectification</div>
                        <img src={o.afterPhotoData} alt="After" className="h-20 w-full object-cover rounded border border-emerald-200" />
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
