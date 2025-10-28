
import React, { useState, useMemo, useEffect } from 'react';
import * as QRCode from 'qrcode';
import { supabase } from './supabase';

const TOTAL_WORDS = 12;

const CopyIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
);

const ClearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);


// Reusable panel for a single wallet's seed phrase
interface SeedPanelProps {
  title: string;
}

const SeedPanel: React.FC<SeedPanelProps> = ({ title }) => {
  const [words, setWords] = useState<string[]>(Array(TOTAL_WORDS).fill(''));
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'idle' | 'generating' | 'error'>('idle');

  const sanitizeAndCapitalize = (word: string): string => {
    const sanitized = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!sanitized) return '';
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  };

  const handleWordChange = (index: number, value: string) => {
    const firstWord = value.trim().split(/\s+/)[0] || '';
    const newWords = [...words];
    newWords[index] = sanitizeAndCapitalize(firstWord);
    setWords(newWords);
    setCopyStatus('idle');
  };

  const isComplete = useMemo(() => words.every(word => word.trim() !== ''), [words]);
  const isPristine = useMemo(() => words.every(word => word.trim() === ''), [words]);

  const handleCopyToClipboard = () => {
    if (!isComplete) return;
    const seedPhrase = words.join(' ');
    navigator.clipboard.writeText(seedPhrase)
      .then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2500);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        alert('Failed to copy seed phrase.');
      });
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text') || '';
    const pastedWords = pastedText.trim().split(/\s+/).filter(Boolean);

    const startIndex = pastedWords.length > 1
      ? 0
      : parseInt(event.currentTarget.dataset.index || '0', 10);

    if (pastedWords.length > 0) {
      const newWords = [...words];
      const wordsToFill = pastedWords.slice(0, TOTAL_WORDS - startIndex);

      wordsToFill.forEach((word, i) => {
        const targetIndex = startIndex + i;
        if (targetIndex < TOTAL_WORDS) {
          newWords[targetIndex] = sanitizeAndCapitalize(word);
        }
      });
      setWords(newWords);
      setCopyStatus('idle');
    }
  };

  const handleClearAll = () => {
    setWords(Array(TOTAL_WORDS).fill(''));
    setCopyStatus('idle');
    setQrDataUrl(null);
    setQrStatus('idle');
  };

  const handleGenerateQR = async () => {
    if (!isComplete) return;
    try {
      setQrStatus('generating');
      const seedPhrase = words.join(' ');
      const url = await QRCode.toDataURL(seedPhrase, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
      });
      setQrDataUrl(url);
      setQrStatus('idle');
    } catch (e) {
      console.error('Failed to generate QR:', e);
      setQrStatus('error');
      alert('Failed to generate QR code.');
    }
  };

  const handleClearQR = () => {
    setQrDataUrl(null);
    setQrStatus('idle');
  };

  return (
    <main className="bg-gray-800 shadow-2xl rounded-lg p-6 md:p-8">
      <h2 className="text-2xl font-semibold mb-4 text-cyan-300">{title}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {words.map((word, index) => (
          <div key={index} className="relative">
            <label htmlFor={`word-${title}-${index}`} className="absolute -top-2.5 left-2 inline-block bg-gray-800 px-1 text-sm font-medium text-gray-400">
              Word {index + 1}
            </label>
            <input
              id={`word-${title}-${index}`}
              type="text"
              data-index={index}
              value={word}
              onChange={(e) => handleWordChange(index, e.target.value)}
              onPaste={handlePaste}
              className="w-full bg-gray-700 border-2 border-gray-600 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
              autoComplete="off"
            />
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <button
          onClick={handleCopyToClipboard}
          disabled={!isComplete || copyStatus === 'copied'}
          className={`
            inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-md transition-all duration-300 ease-in-out
            ${!isComplete 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : copyStatus === 'copied'
              ? 'bg-green-600 text-white'
              : 'bg-cyan-600 text-white hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transform hover:scale-105'
          }
        `}
        >
          {copyStatus === 'copied' ? (
            <>
              <CheckIcon />
              Copied!
            </>
          ) : (
            <>
              <CopyIcon />
              Copy to Clipboard
            </>
          )}
        </button>

        <button
          onClick={handleClearAll}
          disabled={isPristine}
          className={`
            inline-flex items-center justify-center w-full sm:w-auto px-6 py-4 text-lg font-semibold rounded-md transition-all duration-300 ease-in-out
            ${isPristine
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/50 transform hover:scale-105'
            }
          `}
          aria-label="Clear all words"
        >
          <ClearIcon />
          Clear All
        </button>

        <button
          onClick={handleGenerateQR}
          disabled={!isComplete || qrStatus === 'generating'}
          className={`
            inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-md transition-all duration-300 ease-in-out
            ${!isComplete
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : qrStatus === 'generating'
              ? 'bg-gray-700 text-gray-300 cursor-wait'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 transform hover:scale-105'
            }
          `}
        >
          {qrStatus === 'generating' ? 'Generating QR…' : 'Generate QR Code'}
        </button>
      </div>

      {qrDataUrl && (
        <div className="mt-8 flex flex-col items-center">
          <div className="bg-white p-4 rounded-lg shadow-lg">
            <img src={qrDataUrl} alt={`Seed phrase QR - ${title}`} className="w-64 h-64" />
          </div>
          <div className="mt-4 flex gap-4">
            <a
              href={qrDataUrl}
              download={`seed-phrase-qr-${title.replace(/\s+/g,'-').toLowerCase()}.png`}
              className="px-6 py-3 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/50"
            >
              Download PNG
            </a>
            <button
              onClick={handleClearQR}
              className="px-6 py-3 rounded-md bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
            >
              Clear QR
            </button>
          </div>
          <p className="mt-3 text-gray-400 text-sm text-center max-w-xl">
            Note: Some wallets may not support scanning seed phrases directly via QR. If scanning fails in Trust Wallet, use the text copy and paste.
          </p>
        </div>
      )}
    </main>
  );
};


const App: React.FC = () => {
  const [words, setWords] = useState<string[]>(Array(TOTAL_WORDS).fill(''));
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrStatus, setQrStatus] = useState<'idle' | 'generating' | 'error'>('idle');
  const [dualMode, setDualMode] = useState<boolean>(false);
  type WalletRow = { id: string; name: string; words: string[]; created_at: string };
  const [deviceId, setDeviceId] = useState<string>('');
  const [savedWallets, setSavedWallets] = useState<WalletRow[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  type ToastVariant = 'success' | 'error' | 'info';
  const [toast, setToast] = useState<{ open: boolean; message: string; variant: ToastVariant }>({ open: false, message: '', variant: 'info' });
  const [confirmState, setConfirmState] = useState<{ open: boolean; title: string; message: string; confirmText: string; cancelText: string; onConfirm: null | (() => void) }>({ open: false, title: 'Confirm', message: '', confirmText: 'OK', cancelText: 'Cancel', onConfirm: null });
  const [choiceState, setChoiceState] = useState<{ open: boolean; title: string; message: string; primaryLabel: string; secondaryLabel: string; cancelText: string; onPrimary: null | (() => void); onSecondary: null | (() => void) }>({ open: false, title: 'Save Options', message: '', primaryLabel: 'Update Current', secondaryLabel: 'Save New', cancelText: 'Cancel', onPrimary: null, onSecondary: null });

  const sanitizeAndCapitalize = (word: string): string => {
    const sanitized = word.toLowerCase().replace(/[^a-z]/g, '');
    if (!sanitized) return '';
    return sanitized.charAt(0).toUpperCase() + sanitized.slice(1);
  };

  const handleWordChange = (index: number, value: string) => {
    // When typing or pasting a value into a single field,
    // we only take the first word from the input value.
    const firstWord = value.trim().split(/\s+/)[0] || '';
    const newWords = [...words];
    newWords[index] = sanitizeAndCapitalize(firstWord);
    setWords(newWords);
    setCopyStatus('idle');
  };

  const isComplete = useMemo(() => words.every(word => word.trim() !== ''), [words]);
  const isPristine = useMemo(() => words.every(word => word.trim() === ''), [words]);

  const handleCopyToClipboard = () => {
    if (!isComplete) return;

    const seedPhrase = words.join(' ');
    navigator.clipboard.writeText(seedPhrase)
      .then(() => {
        setCopyStatus('copied');
        setTimeout(() => setCopyStatus('idle'), 2500);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Failed to copy seed phrase.', 'error');
      });
  };
  
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text') || '';
    const pastedWords = pastedText.trim().split(/\s+/).filter(Boolean);

    // If the clipboard contains a full phrase (multiple words), import from the start.
    // Otherwise, treat it as a single-word paste into the focused field.
    const startIndex = pastedWords.length > 1
      ? 0
      : parseInt(event.currentTarget.dataset.index || '0', 10);

    if (pastedWords.length > 0) {
      const newWords = [...words];
      const wordsToFill = pastedWords.slice(0, TOTAL_WORDS - startIndex);

      wordsToFill.forEach((word, i) => {
        const targetIndex = startIndex + i;
        if (targetIndex < TOTAL_WORDS) {
          newWords[targetIndex] = sanitizeAndCapitalize(word);
        }
      });
      setWords(newWords);
      setCopyStatus('idle');
    }
  };

  const handleClearAll = () => {
    setWords(Array(TOTAL_WORDS).fill(''));
    setCopyStatus('idle');
    setQrDataUrl(null);
    setQrStatus('idle');
  }

  const handleGenerateQR = async () => {
    if (!isComplete) return;
    try {
      setQrStatus('generating');
      const seedPhrase = words.join(' ');
      const url = await QRCode.toDataURL(seedPhrase, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
      });
      setQrDataUrl(url);
      setQrStatus('idle');
    } catch (e) {
      console.error('Failed to generate QR:', e);
      setQrStatus('error');
      showToast('Failed to generate QR code.', 'error');
    }
  };

  const handleClearQR = () => {
    setQrDataUrl(null);
    setQrStatus('idle');
  };

  // Device ID persistence
  useEffect(() => {
    const key = 'spm_device_id';
    let id = localStorage.getItem(key) || '';
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? (crypto as Crypto).randomUUID()
        : Math.random().toString(36).slice(2);
      localStorage.setItem(key, id);
    }
    setDeviceId(id);
  }, []);

  // Load all wallets (no device filter)
  const loadWallets = async () => {
    const { data, error } = await supabase
      .from('wallets')
      .select('id,name,words,created_at')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Failed to load wallets', error);
      return;
    }
    setSavedWallets(data || []);
  };

  useEffect(() => {
    loadWallets();
  }, []);

  // Insert new wallet
  const insertWallet = async () => {
    const name = `Wallet ${savedWallets.length + 1}`;
    const { error } = await supabase.from('wallets').insert({
      device_id: deviceId,
      name,
      words,
    });
    if (error) {
      console.error('Save failed', error);
      showToast('Failed to save.', 'error');
      return;
    }
    await loadWallets();
    setSelectedWalletId('');
    showToast('Saved to Supabase.', 'success');
  };

  // Update selected wallet words (supports add/remove/change words)
  const updateWallet = async () => {
    if (!selectedWalletId) return;
    const { error } = await supabase.from('wallets').update({ words }).eq('id', selectedWalletId);
    if (error) {
      console.error('Update failed', error);
      showToast('Failed to update.', 'error');
      return;
    }
    await loadWallets();
    showToast('Wallet updated.', 'success');
  };

  // Save current words to Supabase (insert or update by user choice)
  const handleSaveToSupabase = async () => {
    if (!deviceId) return;
    if (isPristine) {
      showToast('Nothing to save.', 'info');
      return;
    }
    if (selectedWalletId) {
      setChoiceState({
        open: true,
        title: 'Save Wallet',
        message: 'Update the selected wallet or save as a new one?',
        primaryLabel: 'Update Current',
        secondaryLabel: 'Save New',
        cancelText: 'Cancel',
        onPrimary: async () => { setChoiceState(prev => ({ ...prev, open: false })); await updateWallet(); },
        onSecondary: async () => { setChoiceState(prev => ({ ...prev, open: false })); await insertWallet(); },
      });
      return;
    }
    await insertWallet();
  };

  const handleSelectWallet = (id: string) => {
    setSelectedWalletId(id);
    const row = savedWallets.find(w => w.id === id);
    if (row) {
      const arr = Array.isArray(row.words) ? row.words : Array(TOTAL_WORDS).fill('');
      // Ensure exactly 12 positions
      const next = Array(TOTAL_WORDS).fill('');
      for (let i = 0; i < TOTAL_WORDS; i++) next[i] = (arr[i] || '') as string;
      setWords(next);
      setCopyStatus('idle');
      setQrDataUrl(null);
      setQrStatus('idle');
    }
  };

  const handleDeleteWallet = () => {
    if (!selectedWalletId) {
      showToast('Select a wallet first.', 'info');
      return;
    }
    setConfirmState({
      open: true,
      title: 'Delete Wallet',
      message: 'Are you sure you want to delete this wallet? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      onConfirm: async () => {
        const { error } = await supabase.from('wallets').delete().eq('id', selectedWalletId);
        if (error) {
          console.error('Delete failed', error);
          showToast('Failed to delete.', 'error');
          return;
        }
        setSelectedWalletId('');
        await loadWallets();
        showToast('Wallet deleted.', 'success');
      }
    });
  };

  const showToast = (message: string, variant: ToastVariant = 'info') => {
    setToast({ open: true, message, variant });
    window.clearTimeout((showToast as any)._t);
    (showToast as any)._t = window.setTimeout(() => setToast(prev => ({ ...prev, open: false })), 2500);
  };

  const closeConfirm = () => setConfirmState(prev => ({ ...prev, open: false, onConfirm: null }));
  const handleConfirmProceed = async () => {
    const act = confirmState.onConfirm;
    closeConfirm();
    if (act) await act();
  };

  const closeChoice = () => setChoiceState(prev => ({ ...prev, open: false, onPrimary: null, onSecondary: null }));
  const handleChoicePrimary = async () => { const a = choiceState.onPrimary; closeChoice(); if (a) await a(); };
  const handleChoiceSecondary = async () => { const a = choiceState.onSecondary; closeChoice(); if (a) await a(); };

  // Device ID utilities removed from UI scope to avoid confusion


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-start md:justify-center p-4 pb-24 md:pb-6 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400">Seed Phrase Manager</h1>
          <p className="text-gray-400 mt-2">Enter your 12-word recovery phrase below.</p>
        </header>

        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-8" role="alert">
          <strong className="font-bold text-sm sm:text-base">Security Warning!</strong>
          <span className="block sm:inline ml-2 text-xs sm:text-sm">Never enter your seed phrase on a device you don't trust. This tool is intended for secure environments. The creator is not responsible for any loss of funds.</span>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 max-w-full flex-wrap">
            <select
              value={selectedWalletId}
              onChange={(e) => handleSelectWallet(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-sm rounded-md px-3 py-2 text-gray-200 max-w-[70vw]"
            >
              <option value="">Load saved wallet…</option>
              {savedWallets.map(w => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <button
              onClick={handleSaveToSupabase}
              disabled={isPristine}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${isPristine ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
            >
              Save
            </button>
            <button
              onClick={handleDeleteWallet}
              disabled={!selectedWalletId}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-all duration-200 ${!selectedWalletId ? 'bg-gray-700 text-gray-500 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
            >
              Delete
            </button>
          </div>
          <button
            onClick={() => setDualMode(v => !v)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-all duration-200
              ${dualMode ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-700 text-white hover:bg-gray-600'}
            `}
          >
            {dualMode ? 'Dual Mode: On' : 'Dual Mode: Off'}
          </button>
        </div>

        {dualMode && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <SeedPanel title="Wallet A" />
            <SeedPanel title="Wallet B" />
          </div>
        )}

        <main className={dualMode ? 'hidden' : 'bg-gray-800 shadow-2xl rounded-lg p-6 md:p-8'}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {words.map((word, index) => (
              <div key={index} className="relative">
                <label htmlFor={`word-${index}`} className="absolute -top-2.5 left-2 inline-block bg-gray-800 px-1 text-sm font-medium text-gray-400">
                  Word {index + 1}
                </label>
                <input
                  id={`word-${index}`}
                  type="text"
                  data-index={index}
                  value={word}
                  onChange={(e) => handleWordChange(index, e.target.value)}
                  onPaste={handlePaste}
                  className="w-full bg-gray-700 border-2 border-gray-600 rounded-md px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-200"
                  autoComplete="off"
                />
              </div>
            ))}
          </div>

          <div className="mt-8 hidden md:flex justify-center items-center gap-4">
            <button
              onClick={handleCopyToClipboard}
              disabled={!isComplete || copyStatus === 'copied'}
              className={`
                inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-md transition-all duration-300 ease-in-out
                ${!isComplete 
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                  : copyStatus === 'copied'
                  ? 'bg-green-600 text-white'
                  : 'bg-cyan-600 text-white hover:bg-cyan-700 focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transform hover:scale-105'
                }
              `}
            >
              {copyStatus === 'copied' ? (
                <>
                  <CheckIcon />
                  Copied!
                </>
              ) : (
                <>
                  <CopyIcon />
                  Copy to Clipboard
                </>
              )}
            </button>

            <button
              onClick={handleClearAll}
              disabled={isPristine}
              className={`
                inline-flex items-center justify-center w-full sm:w-auto px-6 py-4 text-lg font-semibold rounded-md transition-all duration-300 ease-in-out
                ${isPristine
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-500/50 transform hover:scale-105'
                }
              `}
              aria-label="Clear all words"
            >
              <ClearIcon />
              Clear All
            </button>

            <button
              onClick={handleGenerateQR}
              disabled={!isComplete || qrStatus === 'generating'}
              className={`
                inline-flex items-center justify-center w-full sm:w-auto px-8 py-4 text-lg font-semibold rounded-md transition-all duration-300 ease-in-out
                ${!isComplete
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : qrStatus === 'generating'
                  ? 'bg-gray-700 text-gray-300 cursor-wait'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/50 transform hover:scale-105'
                }
              `}
            >
              {qrStatus === 'generating' ? 'Generating QR…' : 'Generate QR Code'}
            </button>
          </div>

          {qrDataUrl && (
            <div className="mt-8 flex flex-col items-center">
              <div className="bg-white p-4 rounded-lg shadow-lg">
                <img src={qrDataUrl} alt="Seed phrase QR" className="w-64 h-64" />
              </div>
              <div className="mt-4 flex gap-4">
                <a
                  href={qrDataUrl}
                  download={`seed-phrase-qr.png`}
                  className="px-6 py-3 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-500/50"
                >
                  Download PNG
                </a>
                <button
                  onClick={handleClearQR}
                  className="px-6 py-3 rounded-md bg-gray-700 text-white hover:bg-gray-600 focus:outline-none focus:ring-4 focus:ring-gray-500/50"
                >
                  Clear QR
                </button>
              </div>
              <p className="mt-3 text-gray-400 text-sm text-center max-w-xl">
                Note: Some wallets may not support scanning seed phrases directly via QR. If scanning fails in Trust Wallet, use the text copy and paste.
              </p>
            </div>
          )}
        </main>

        {!dualMode && (
          <div
            className="fixed bottom-0 left-0 right-0 md:hidden z-50 bg-gray-800/95 backdrop-blur border-t border-gray-700 px-3 py-3 flex items-center justify-between"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <button
              onClick={handleCopyToClipboard}
              disabled={!isComplete || copyStatus === 'copied'}
              className={`${!isComplete
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : copyStatus === 'copied'
                ? 'bg-green-600 text-white'
                : 'bg-cyan-600 text-white active:bg-cyan-700'
              } flex-1 mx-1 px-4 py-3 text-sm font-semibold rounded-md inline-flex items-center justify-center`}
            >
              {copyStatus === 'copied' ? (
                <>
                  <CheckIcon />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon />
                  Copy
                </>
              )}
            </button>
            <button
              onClick={handleSaveToSupabase}
              disabled={isPristine}
              className={`${isPristine
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-emerald-600 text-white active:bg-emerald-700'
              } flex-1 mx-1 px-4 py-3 text-sm font-semibold rounded-md inline-flex items-center justify-center`}
            >
              Save
            </button>
            <button
              onClick={handleClearAll}
              disabled={isPristine}
              className={`${isPristine
                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white active:bg-red-700'
              } flex-1 mx-1 px-4 py-3 text-sm font-semibold rounded-md inline-flex items-center justify-center`}
              aria-label="Clear all words"
            >
              <ClearIcon />
              Clear
            </button>
            <button
              onClick={handleGenerateQR}
              disabled={!isComplete || qrStatus === 'generating'}
              className={`${!isComplete
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : qrStatus === 'generating'
                ? 'bg-gray-700 text-gray-300 cursor-wait'
                : 'bg-indigo-600 text-white active:bg-indigo-700'
              } flex-1 mx-1 px-4 py-3 text-sm font-semibold rounded-md inline-flex items-center justify-center`}
            >
              {qrStatus === 'generating' ? 'QR…' : 'QR'}
            </button>
          </div>
        )}

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Secure Seed Phrase Tool. All rights reserved.</p>
        </footer>
      </div>

      {confirmState.open && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={closeConfirm} />
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl p-4 shadow-2xl md:max-w-md md:mx-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <div className="h-1.5 w-12 bg-gray-600 rounded-full mx-auto mb-3 md:hidden" />
            <h3 className="text-lg font-semibold text-white mb-1">{confirmState.title}</h3>
            <p className="text-gray-300 text-sm mb-4">{confirmState.message}</p>
            <div className="flex gap-3">
              <button
                onClick={closeConfirm}
                className="flex-1 px-4 py-3 text-sm font-semibold rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                {confirmState.cancelText}
              </button>
              <button
                onClick={handleConfirmProceed}
                className="flex-1 px-4 py-3 text-sm font-semibold rounded-md bg-red-600 text-white hover:bg-red-700"
              >
                {confirmState.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {choiceState.open && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/50" onClick={closeChoice} />
          <div className="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl p-4 shadow-2xl md:max-w-md md:mx-auto md:top-1/2 md:-translate-y-1/2 md:rounded-2xl">
            <div className="h-1.5 w-12 bg-gray-600 rounded-full mx-auto mb-3 md:hidden" />
            <h3 className="text-lg font-semibold text-white mb-1">{choiceState.title}</h3>
            <p className="text-gray-300 text-sm mb-4">{choiceState.message}</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={closeChoice}
                className="px-4 py-3 text-sm font-semibold rounded-md bg-gray-700 text-gray-200 hover:bg-gray-600"
              >
                {choiceState.cancelText}
              </button>
              <button
                onClick={handleChoiceSecondary}
                className="px-4 py-3 text-sm font-semibold rounded-md bg-cyan-600 text-white hover:bg-cyan-700"
              >
                {choiceState.secondaryLabel}
              </button>
              <button
                onClick={handleChoicePrimary}
                className="px-4 py-3 text-sm font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {choiceState.primaryLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast.open && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[55] md:bottom-6"
          style={{ bottom: dualMode ? '24px' : '96px', paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div
            className={`${toast.variant === 'success' ? 'bg-emerald-600' : toast.variant === 'error' ? 'bg-red-600' : 'bg-gray-700'} text-white rounded-full px-4 py-3 text-sm font-semibold shadow-lg`}
          >
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
