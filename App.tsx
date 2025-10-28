
import React, { useState, useMemo } from 'react';
import * as QRCode from 'qrcode';

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


const App: React.FC = () => {
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
        alert('Failed to copy seed phrase.');
      });
  };
  
  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pastedText = event.clipboardData.getData('text');
    const pastedWords = pastedText.trim().split(/\s+/);
    
    const startIndex = parseInt(event.currentTarget.dataset.index || '0', 10);
    
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
      alert('Failed to generate QR code.');
    }
  };

  const handleClearQR = () => {
    setQrDataUrl(null);
    setQrStatus('idle');
  };


  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-4xl mx-auto">
        <header className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-cyan-400">Seed Phrase Manager</h1>
          <p className="text-gray-400 mt-2">Enter your 12-word recovery phrase below.</p>
        </header>

        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative mb-8" role="alert">
          <strong className="font-bold">Security Warning!</strong>
          <span className="block sm:inline ml-2">Never enter your seed phrase on a device you don't trust. This tool is intended for secure environments. The creator is not responsible for any loss of funds.</span>
        </div>

        <main className="bg-gray-800 shadow-2xl rounded-lg p-6 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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

        <footer className="text-center mt-8 text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Secure Seed Phrase Tool. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
