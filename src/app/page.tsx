import Link from 'next/link';
import { ShieldCheck, Plus, KeyRound } from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen justify-between p-6 sm:p-12 md:p-24 max-w-5xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-lg hover:opacity-85 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-black dark:bg-white flex items-center justify-center text-white dark:text-black font-mono font-bold text-base">
            K
          </div>
          <span className="text-zinc-900 dark:text-zinc-50 font-bold">KeyBox</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-800/60 px-2.5 py-1 rounded-full border border-zinc-200/50 dark:border-zinc-700/30">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Anonymous & Encrypted V1</span>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col justify-center items-center py-12 text-center max-w-2xl mx-auto">
        <span className="inline-flex px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/40 text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-6 border border-zinc-200/60 dark:border-zinc-700/20">
          Temporary Content Sharing
        </span>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-b from-zinc-900 via-zinc-800 to-zinc-600 dark:from-zinc-50 dark:via-zinc-200 dark:to-zinc-500 bg-clip-text text-transparent leading-none">
          Share. Lock. Unlock.
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-zinc-500 dark:text-zinc-400 font-normal leading-relaxed max-w-lg">
          Share temporary content with a simple 6-digit key. No accounts. No hassle.
        </p>

        {/* Primary Actions */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full justify-center">
          <Link
            href="/create"
            className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold shadow-sm hover:shadow transition-all duration-200 border border-transparent dark:border-zinc-800"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            <span>Create KeyBox</span>
          </Link>
          <Link
            href="/retrieve"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-950 dark:text-zinc-50 font-semibold shadow-sm transition-all duration-200"
          >
            <KeyRound className="w-4 h-4 text-zinc-500" />
            <span>Open KeyBox</span>
          </Link>
        </div>

        {/* Supporting text */}
        <p className="mt-8 text-xs text-zinc-400 dark:text-zinc-500 max-w-xs font-light">
          Content automatically expires after the selected time.
        </p>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-400 dark:text-zinc-600 border-t border-zinc-200/50 dark:border-zinc-800/40 pt-6">
        &copy; {new Date().getFullYear()} KeyBox. Built securely & anonymously.
      </footer>
    </div>
  );
}
