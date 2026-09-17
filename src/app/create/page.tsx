'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Copy,
  Check,
  RefreshCw,
  Code,
  AlignLeft,
  Link as LinkIcon,
  Clock,
  FileText,
  UploadCloud,
  X,
  FileSpreadsheet,
  FileCode,
  File
} from 'lucide-react';

type ContentType = 'text' | 'url' | 'code' | 'document';
type Duration = 5 | 10 | 30 | 60;

const ALLOWED_DOCUMENT_EXTENSIONS = [
  '.pdf', '.doc', '.docx', '.txt', '.md', '.rtf',
  '.csv', '.xlsx', '.xls', '.pptx', '.ppt',
  '.odt', '.ods', '.odp'
];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB exclusive

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  const match = filename.lastIndexOf('.');
  return match !== -1 ? filename.substring(match).toLowerCase() : '';
}

export default function CreateKeyBox() {
  // Form State
  const [contentType, setContentType] = useState<ContentType>('text');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<Duration>(30);
  
  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // App States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Success state
  const [result, setResult] = useState<{ access_key: string; expires_in_minutes: number } | null>(null);
  
  // Copy state
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    const ext = getFileExtension(selectedFile.name);
    if (!ALLOWED_DOCUMENT_EXTENSIONS.includes(ext)) {
      setError('Please select a supported document format (PDF, DOCX, XLSX, PPTX, TXT, CSV, etc.).');
      return;
    }
    if (selectedFile.size >= MAX_FILE_SIZE_BYTES) {
      setError('File size must be less than 5MB.');
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Client-side validations
    if (contentType === 'document') {
      if (!file) {
        setError('Please select a document file to share.');
        setIsSubmitting(false);
        return;
      }
      if (file.size >= MAX_FILE_SIZE_BYTES) {
        setError('Document must be less than 5MB.');
        setIsSubmitting(false);
        return;
      }
    } else {
      if (!content || content.trim() === '') {
        setError('Please enter some content.');
        setIsSubmitting(false);
        return;
      }

      if (content.length > 5000) {
        setError('Content cannot exceed 5,000 characters.');
        setIsSubmitting(false);
        return;
      }

      if (contentType === 'url') {
        try {
          new URL(content);
        } catch {
          setError('Please enter a valid URL.');
          setIsSubmitting(false);
          return;
        }
      }
    }

    try {
      let response: Response;

      if (contentType === 'document' && file) {
        const formData = new FormData();
        formData.append('content_type', 'document');
        formData.append('duration', duration.toString());
        formData.append('file', file);

        response = await fetch('/api/keybox/create', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/keybox/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content,
            content_type: contentType,
            duration,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        setResult({
          access_key: data.access_key,
          expires_in_minutes: duration,
        });
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    setCopying(true);
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(result.access_key);
        setCopied(true);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = result.access_key;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
      }
    } catch (err) {
      console.error('Copy failed', err);
    } finally {
      setCopying(false);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setContent('');
    setFile(null);
    setContentType('text');
    setDuration(30);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName);
    if (ext === '.pdf') {
      return <FileText className="w-8 h-8 text-rose-500" />;
    }
    if (['.xls', '.xlsx', '.csv'].includes(ext)) {
      return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
    }
    if (['.doc', '.docx'].includes(ext)) {
      return <FileText className="w-8 h-8 text-blue-500" />;
    }
    if (['.txt', '.md', '.rtf'].includes(ext)) {
      return <FileCode className="w-8 h-8 text-amber-500" />;
    }
    return <File className="w-8 h-8 text-zinc-500" />;
  };

  if (result) {
    return (
      <div className="flex flex-col min-h-screen justify-between p-6 sm:p-12 md:p-24 max-w-xl mx-auto">
        <header className="flex items-center">
          <button
            onClick={resetForm}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        </header>

        <main className="flex-1 flex flex-col justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <Check className="w-8 h-8 stroke-[3]" />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Your KeyBox is ready
          </h1>
          
          {/* Key Display */}
          <div className="mt-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-semibold mb-2">
              Access Key
            </div>
            <div className="text-5xl font-extrabold tracking-widest text-zinc-900 dark:text-zinc-50 font-mono select-all">
              {result.access_key}
            </div>
            <div className="mt-4 text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Available for {result.expires_in_minutes === 60 ? '1 hour' : `${result.expires_in_minutes} minutes`}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCopy}
              disabled={copying}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold transition-all duration-150 min-w-[140px]"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Key</span>
                </>
              )}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 font-semibold transition-all duration-150"
            >
              <RefreshCw className="w-4 h-4 text-zinc-400" />
              <span>Create Another</span>
            </button>
          </div>
        </main>

        <footer className="text-center text-xs text-zinc-400 dark:text-zinc-600">
          Make sure to write down the key. It cannot be recovered once expired.
        </footer>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen justify-between p-6 sm:p-12 md:p-24 max-w-2xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">Create KeyBox</span>
      </header>

      {/* Main Creation Flow */}
      <main className="flex-1 flex flex-col justify-center py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Content Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2.5">
              Content Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
              <button
                type="button"
                onClick={() => { setContentType('text'); setError(null); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  contentType === 'text'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <AlignLeft className="w-4 h-4" />
                <span>Text</span>
              </button>
              <button
                type="button"
                onClick={() => { setContentType('url'); setError(null); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  contentType === 'url'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <LinkIcon className="w-4 h-4" />
                <span>URL</span>
              </button>
              <button
                type="button"
                onClick={() => { setContentType('code'); setError(null); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  contentType === 'code'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Code</span>
              </button>
              <button
                type="button"
                onClick={() => { setContentType('document'); setError(null); }}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  contentType === 'document'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Document</span>
              </button>
            </div>
          </div>

          {/* Content Editor / File Dropzone */}
          {contentType === 'document' ? (
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  Upload Document
                </label>
                <span className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
                  Under 5 MB
                </span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.txt,.md,.rtf,.csv,.xlsx,.xls,.pptx,.ppt,.odt,.ods,.odp"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              {!file ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150 flex flex-col items-center justify-center gap-3 ${
                    isDragging
                      ? 'border-zinc-900 bg-zinc-100/80 dark:border-zinc-100 dark:bg-zinc-900/80'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:border-zinc-400 dark:hover:border-zinc-700'
                  }`}
                >
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Click to browse or drag and drop your document
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      PDF, Word, Excel, PowerPoint, Text, CSV, OpenDocument
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-900 shrink-0">
                      {renderFileIcon(file.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {file.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold">
                          {getFileExtension(file.name).replace('.', '') || 'DOC'}
                        </span>
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                      title="Remove file"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <label htmlFor="content" className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                  {contentType === 'text' && 'Text Content'}
                  {contentType === 'url' && 'Link URL'}
                  {contentType === 'code' && 'Code Snippet'}
                </label>
                <span
                  className={`text-xs font-medium ${
                    content.length > 4800
                      ? 'text-rose-500 font-semibold'
                      : 'text-zinc-400 dark:text-zinc-500'
                  }`}
                >
                  {content.length.toLocaleString()} / 5,000
                </span>
              </div>
              
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  contentType === 'text'
                    ? 'Paste or type your temporary text here...'
                    : contentType === 'url'
                    ? 'https://example.com/some/destination'
                    : '// Paste your code snippet here. Line breaks, tabs, and indentation will be preserved.'
                }
                rows={8}
                maxLength={5000}
                className={`w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-950 dark:focus:ring-zinc-50 focus:border-transparent transition-all ${
                  contentType === 'code' ? 'font-mono whitespace-pre tab-size-4' : ''
                }`}
              />
            </div>
          )}

          {/* Expiration Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2.5">
              Expiration Duration
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
              <button
                type="button"
                onClick={() => setDuration(5)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  duration === 5
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                5 Min
              </button>
              <button
                type="button"
                onClick={() => setDuration(10)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  duration === 10
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                10 Min
              </button>
              <button
                type="button"
                onClick={() => setDuration(30)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  duration === 30
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                30 Min
              </button>
              <button
                type="button"
                onClick={() => setDuration(60)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  duration === 60
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                1 Hour
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold shadow transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (contentType === 'document' ? 'Uploading Document...' : 'Creating...') : 'Create KeyBox'}
          </button>
        </form>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-400 dark:text-zinc-600 pt-6">
        &copy; {new Date().getFullYear()} KeyBox. Built securely & anonymously.
      </footer>
    </div>
  );
}
