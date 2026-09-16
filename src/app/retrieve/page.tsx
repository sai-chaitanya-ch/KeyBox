'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  KeyRound,
  Copy,
  Check,
  ExternalLink,
  Clock,
  FileText,
  Globe,
  Code,
  Download,
  FileSpreadsheet,
  FileCode,
  File
} from 'lucide-react';

interface DocumentData {
  fileName: string;
  fileSize: number;
  fileType: string;
  downloadUrl: string;
}

interface KeyBoxData {
  content: string;
  content_type: 'text' | 'url' | 'code' | 'document';
  expires_at: string;
  document?: DocumentData;
}

function formatFileSize(bytes?: number): string {
  if (!bytes && bytes !== 0) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename?: string): string {
  if (!filename) return '';
  const match = filename.lastIndexOf('.');
  return match !== -1 ? filename.substring(match).toLowerCase() : '';
}

export default function RetrieveKeyBox() {
  const [key, setKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyboxData, setKeyboxData] = useState<KeyBoxData | null>(null);
  
  // Clipboard states
  const [copied, setCopied] = useState(false);
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState<string>('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (key.length !== 6) {
      setError('Key must be exactly 6 digits.');
      return;
    }
    setError(null);
    setIsLoading(true);
    setKeyboxData(null);
    setTimeLeft('');

    try {
      const response = await fetch('/api/keybox/retrieve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ access_key: key }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setKeyboxData(data);
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handles countdown updates when data is loaded
  useEffect(() => {
    if (!keyboxData) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const expiresAt = new Date(keyboxData.expires_at).getTime();

    const updateCountdown = () => {
      const diff = expiresAt - Date.now();
      if (diff <= 0) {
        setTimeLeft('Expired');
        setError('This KeyBox has expired.');
        setKeyboxData(null);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
      } else {
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateCountdown();
    timerRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [keyboxData]);

  const handleCopyContent = async () => {
    if (!keyboxData) return;
    const textToCopy = keyboxData.document?.downloadUrl || keyboxData.content;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopied(true);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
      }
    } catch (err) {
      console.error('Failed to copy', err);
    } finally {
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenNew = () => {
    setKey('');
    setKeyboxData(null);
    setError(null);
    setTimeLeft('');
  };

  const renderFileIcon = (fileName?: string) => {
    const ext = getFileExtension(fileName);
    if (ext === '.pdf') {
      return <FileText className="w-10 h-10 text-rose-500" />;
    }
    if (['.xls', '.xlsx', '.csv'].includes(ext)) {
      return <FileSpreadsheet className="w-10 h-10 text-emerald-500" />;
    }
    if (['.doc', '.docx'].includes(ext)) {
      return <FileText className="w-10 h-10 text-blue-500" />;
    }
    if (['.txt', '.md', '.rtf'].includes(ext)) {
      return <FileCode className="w-10 h-10 text-amber-500" />;
    }
    return <File className="w-10 h-10 text-zinc-500" />;
  };

  const isPreviewable = (fileName?: string) => {
    const ext = getFileExtension(fileName);
    return ['.pdf', '.txt', '.csv', '.md'].includes(ext);
  };

  return (
    <div className="flex flex-col min-h-screen justify-between p-6 sm:p-12 md:p-24 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Retrieve KeyBox</span>
      </header>

      {/* Main retrieval form */}
      <main className="flex-1 flex flex-col justify-center py-8">
        {!keyboxData ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 text-zinc-950 dark:text-zinc-50 flex items-center justify-center mx-auto mb-4">
                <KeyRound className="w-6 h-6" />
              </div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">Open a KeyBox</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Enter the 6-digit key to access the shared content.
              </p>
            </div>

            <div>
              <label htmlFor="key" className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2.5 text-center">
                6-Digit Access Key
              </label>
              
              <input
                id="key"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={key}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setKey(val);
                  if (error) setError(null);
                }}
                placeholder="000000"
                className="w-full text-center text-4xl font-extrabold tracking-[0.7em] pl-[0.7em] py-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder-zinc-200 dark:placeholder-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50 focus:border-transparent font-mono transition-all"
                disabled={isLoading}
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || key.length !== 6}
              className="w-full flex items-center justify-center py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold shadow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Retrieving...' : 'Open KeyBox'}
            </button>
          </form>
        ) : (
          /* KeyBox Contents Viewer */
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Header info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-100/80 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-zinc-200 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 flex items-center justify-center">
                  {keyboxData.content_type === 'text' && <FileText className="w-4.5 h-4.5" />}
                  {keyboxData.content_type === 'url' && <Globe className="w-4.5 h-4.5" />}
                  {keyboxData.content_type === 'code' && <Code className="w-4.5 h-4.5" />}
                  {keyboxData.content_type === 'document' && <FileText className="w-4.5 h-4.5" />}
                </div>
                <div>
                  <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-bold">
                    Content Type
                  </div>
                  <div className="text-sm font-semibold capitalize text-zinc-900 dark:text-zinc-100">
                    {keyboxData.content_type}
                  </div>
                </div>
              </div>

              {timeLeft && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-200/50 dark:bg-zinc-850/80 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Expires in {timeLeft}</span>
                </div>
              )}
            </div>

            {/* Content box */}
            <div className="relative border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 overflow-hidden shadow-sm">
              {keyboxData.content_type === 'document' ? (
                /* Document Viewer */
                <div className="p-8 flex flex-col items-center justify-center text-center min-h-[240px]">
                  <div className="mb-4 p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-800/50">
                    {renderFileIcon(keyboxData.document?.fileName || keyboxData.content)}
                  </div>
                  
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 max-w-md break-all">
                    {keyboxData.document?.fileName || keyboxData.content}
                  </h2>

                  <div className="flex items-center gap-2 mt-2 mb-6">
                    <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                      {getFileExtension(keyboxData.document?.fileName || keyboxData.content).replace('.', '') || 'DOC'}
                    </span>
                    <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                      {formatFileSize(keyboxData.document?.fileSize)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {keyboxData.document?.downloadUrl && (
                      <a
                        href={keyboxData.document.downloadUrl}
                        download={keyboxData.document.fileName}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-200 text-white dark:text-zinc-950 text-sm font-semibold transition-colors shadow-sm"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download Document</span>
                      </a>
                    )}

                    {keyboxData.document?.downloadUrl && isPreviewable(keyboxData.document.fileName) && (
                      <a
                        href={keyboxData.document.downloadUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 text-sm font-semibold transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Preview</span>
                      </a>
                    )}

                    {keyboxData.document?.downloadUrl && (
                      <button
                        onClick={handleCopyContent}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 text-sm font-medium transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : keyboxData.content_type === 'url' ? (
                /* URL Viewer */
                <div className="p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                  <Globe className="w-12 h-12 text-zinc-300 dark:text-zinc-700 mb-4" />
                  <p className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Destination URL
                  </p>
                  <p className="text-base font-bold text-zinc-900 dark:text-zinc-50 break-all max-w-md mb-6 px-4">
                    {keyboxData.content}
                  </p>
                  <a
                    href={keyboxData.content}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-5 py-2.5 rounded-lg bg-zinc-950 hover:bg-zinc-800 dark:bg-zinc-50 dark:hover:bg-zinc-250 text-white dark:text-zinc-950 text-sm font-semibold transition-colors"
                  >
                    <span>Visit Link</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : keyboxData.content_type === 'code' ? (
                /* Code Viewer */
                <div className="flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">code_snippet</span>
                    <button
                      onClick={handleCopyContent}
                      className="text-xs flex items-center gap-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                    </button>
                  </div>
                  <pre className="p-4 overflow-auto max-h-[400px] text-xs font-mono text-zinc-800 dark:text-zinc-200 bg-zinc-50/30 dark:bg-zinc-950/20 whitespace-pre tab-size-4 leading-relaxed select-all">
                    <code>{keyboxData.content}</code>
                  </pre>
                </div>
              ) : (
                /* Plain Text Viewer */
                <div className="flex flex-col">
                  <div className="flex items-center justify-between px-4 py-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
                    <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Plain Text</span>
                    <button
                      onClick={handleCopyContent}
                      className="text-xs flex items-center gap-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors"
                    >
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                    </button>
                  </div>
                  <div className="p-6 max-h-[400px] overflow-auto text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed select-all">
                    {keyboxData.content}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-center pt-2">
              <button
                onClick={handleOpenNew}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                <span>Open Another KeyBox</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-400 dark:text-zinc-600 pt-6">
        &copy; {new Date().getFullYear()} KeyBox. Built securely & anonymously.
      </footer>
    </div>
  );
}
