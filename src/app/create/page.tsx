'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Copy, Check, RefreshCw, Code, AlignLeft, Link as LinkIcon, Clock } from 'lucide-react';

type ContentType = 'text' | 'url' | 'code';
type Duration = 5 | 10 | 30;

export default function CreateKeyBox() {
  // Form State
  const [contentType, setContentType] = useState<ContentType>('text');
  const [content, setContent] = useState('');
  const [duration, setDuration] = useState<Duration>(30);
  
  // App States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Success state
  const [result, setResult] = useState<{ access_key: string; expires_in_minutes: number } | null>(null);
  
  // Copy state
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Client-side validations
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

    try {
      const response = await fetch('/api/keybox/create', {
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
        textArea.style.position = 'fixed'; // prevent scrolling to bottom
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
    setContentType('text');
    setDuration(30);
    setResult(null);
    setError(null);
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
              <span>Available for {result.expires_in_minutes} minutes</span>
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
            <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
              <button
                type="button"
                onClick={() => setContentType('text')}
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
                onClick={() => setContentType('url')}
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
                onClick={() => setContentType('code')}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
                  contentType === 'code'
                    ? 'bg-white dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <Code className="w-4 h-4" />
                <span>Code</span>
              </button>
            </div>
          </div>

          {/* Content Editor */}
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

          {/* Expiration Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2.5">
              Expiration Duration
            </label>
            <div className="grid grid-cols-3 gap-2 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
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
            {isSubmitting ? 'Creating...' : 'Create KeyBox'}
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
