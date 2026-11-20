import Link from 'next/link';
import { ArrowLeft, BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import { IMPACT_FACTORS, ImpactFactor } from '@/data/impact-factors';

export const metadata = {
  title: 'Data Sources & Impact Methodology — Saans',
  description: 'Authoritative scientific and governmental citations powering the Saans clean-air impact engine.',
};

function SourcesHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-30 px-4 py-4 sm:px-8">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors focus:ring-2 focus:ring-emerald-500 rounded p-1"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-slate-100">Saans / Sources</span>
        </div>
      </div>
    </header>
  );
}

function SourcesHero() {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">
        Authoritative Data Sources & Impact Calibration
      </h1>
      <p className="text-zinc-400 text-base max-w-3xl leading-relaxed">
        Every numerical value, emission factor, and exposure reduction multiplier in Saans is grounded in
        peer-reviewed literature and statutory Indian government standards (CPCB, ARAI, CEEW, CEA, WHO).{' '}
        <strong className="text-emerald-400 font-semibold">
          The LLM never invents statistics or numbers.
        </strong>{' '}
        Where empirical data is not published, Saans displays a qualitative assessment rather than a manufactured figure.
      </p>
    </div>
  );
}

function FactorBadge({ factor }: { readonly factor: ImpactFactor }) {
  const confStyles = factor.confidence === 'High'
    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800'
    : 'bg-amber-950/80 text-amber-300 border border-amber-800';

  return (
    <div className="flex items-start justify-between gap-2 mb-2">
      <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-0.5 rounded-full">
        {factor.category}
      </span>
      <span className={`text-xs px-2 py-0.5 rounded font-medium ${confStyles}`}>
        {factor.confidence} Confidence
      </span>
    </div>
  );
}

function FactorStats({ factor }: { readonly factor: ImpactFactor }) {
  const hasRange = factor.minReductionPct > 0 || factor.maxReductionPct > 0;
  if (hasRange) {
    return (
      <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3 mb-3">
        <div className="text-xs text-zinc-400 mb-1">Empirical Range / Reduction:</div>
        <div className="text-lg font-extrabold text-emerald-400">
          {factor.minReductionPct}% - {factor.maxReductionPct}%
        </div>
        <div className="text-xs text-zinc-400 mt-0.5">{factor.unit}</div>
      </div>
    );
  }
  return (
    <div className="bg-zinc-950/70 border border-zinc-800/80 rounded-lg p-3 mb-3">
      <div className="text-xs text-zinc-400 mb-1">Qualitative Assessment (No arbitrary numbers):</div>
      <p className="text-sm text-zinc-300 italic">{factor.qualitativeNote}</p>
    </div>
  );
}

function FactorCitation({ factor }: { readonly factor: ImpactFactor }) {
  return (
    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
      <div className="flex items-center gap-1.5 truncate mr-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="truncate">{factor.sourceName}</span>
      </div>
      <a
        href={factor.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition-colors shrink-0 font-medium"
        aria-label={`View source publication for ${factor.name} (opens in new tab)`}
      >
        <span>Citation</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}

function FactorCard({ factor }: { readonly factor: ImpactFactor }) {
  const hasRange = factor.minReductionPct > 0 || factor.maxReductionPct > 0;
  return (
    <article className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors">
      <div>
        <FactorBadge factor={factor} />
        <h2 className="text-lg font-bold text-white mb-2">{factor.name}</h2>
        <FactorStats factor={factor} />
        {factor.qualitativeNote && hasRange && (
          <p className="text-xs text-zinc-400 mb-3 leading-relaxed">{factor.qualitativeNote}</p>
        )}
      </div>
      <FactorCitation factor={factor} />
    </article>
  );
}

export default function SourcesPage() {
  const factors: ImpactFactor[] = Object.values(IMPACT_FACTORS);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <SourcesHeader />
      <main className="max-w-6xl mx-auto px-4 py-8 sm:px-8 flex-1 w-full" id="main-content">
        <SourcesHero />
        <div className="grid gap-6 md:grid-cols-2">
          {factors.map((factor) => (
            <FactorCard key={factor.id} factor={factor} />
          ))}
        </div>
      </main>
      <footer className="border-t border-zinc-800 px-4 py-6 text-center text-xs text-zinc-400 mt-12">
        <p>Saans Clean Air Initiative • Public health awareness without statistical hallucination.</p>
      </footer>
    </div>
  );
}
