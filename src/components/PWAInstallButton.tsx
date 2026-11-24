import React, { useState } from 'react';
import { Check, Download, Share2, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`inline-flex items-center gap-1.5 rounded bg-slate-900 hover:bg-slate-800 text-white font-semibold transition cursor-pointer ${
          compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
        }`}
        title="Install ARSHIEL SAFETY on Android, iOS, or Laptop"
      >
        <Download className="w-3.5 h-3.5 text-amber-400" />
        <span>Install App</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className={`inline-flex items-center gap-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition cursor-pointer ${
          compact ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-xs'
        }`}
        title="Install on Android, iPhone/iPad, or Laptop"
      >
        <Smartphone className="w-3.5 h-3.5 text-emerald-700" />
        <span className="hidden sm:inline">{isIOS ? 'Install on iOS' : 'Get App'}</span>
      </button>

      {showGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-lg bg-white border border-slate-200 p-5 space-y-3 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="font-display font-bold text-slate-900">
                Install ARSHIEL SAFETY App
              </div>
              <button type="button" onClick={() => setShowGuide(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Free to use and share across Android, iOS (iPhone/iPad), and Windows/Mac laptops with offline field support.
            </p>
            <div className="space-y-2 text-xs text-slate-700">
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                <div className="font-bold text-slate-900">iPhone / iPad (iOS Safari)</div>
                <div>1. Tap the <strong>Share</strong> icon in Safari toolbar.</div>
                <div>2. Scroll down and tap <strong>Add to Home Screen</strong>.</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                <div className="font-bold text-slate-900">Android (Chrome / Edge)</div>
                <div>Tap browser menu <strong>⋮</strong> &rarr; <strong>Install App</strong> or <strong>Add to Home screen</strong>.</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
                <div className="font-bold text-slate-900">Laptop / Desktop (Chrome / Edge)</div>
                <div>Click the <strong>Install</strong> icon in the browser address bar to launch ARSHIEL SAFETY as a standalone desktop app.</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="w-full py-2 rounded bg-slate-900 text-white text-xs font-semibold cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const ShareAppButton: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareUrl = window.location.origin;
    const shareData = {
      title: 'ARSHIEL SAFETY — Enterprise EHS AI Platform',
      text: 'Free to use & share Enterprise EHS Management Platform (PTW, HIRA, ISO, OSHWC, OSHA, AI Safety) by Jonathan Thadanki.',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch {
      // Fallback to clipboard copy if user cancels or share fails
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition cursor-pointer"
      title="Share free access link with your team"
    >
      {copied ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
      <span>{copied ? 'Link Copied!' : 'Share Free'}</span>
    </button>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div className="fixed bottom-16 lg:bottom-4 left-4 z-50 flex items-center gap-2 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
      <WifiOff className="w-3.5 h-3.5" />
      <span>Offline Mode — Field drafts queued locally</span>
    </div>
  );
};
