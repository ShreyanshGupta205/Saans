import Link from 'next/link';
import { AlertTriangle, ArrowLeft, HeartPulse, Info, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'About Saans — Smog Navigation Platform',
  description: 'Methodology, architectural assumptions, limitations, and critical health advisory.',
};

function AboutHeader() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-30 px-4 py-4 sm:px-8">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors focus:ring-2 focus:ring-emerald-500 rounded p-1">
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
        <div className="flex items-center gap-2">
          <Info className="w-5 h-5 text-emerald-400" />
          <span className="font-bold text-slate-100">About Saans (साँस)</span>
        </div>
      </div>
    </header>
  );
}

function ClinicalDisclaimer() {
  return (
    <section aria-labelledby="health-advisory-title" className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <h2 id="health-advisory-title" className="text-lg font-bold text-amber-200 mb-2">Critical Health & Emergency Disclaimer</h2>
          <div className="text-sm text-amber-100/90 space-y-2 leading-relaxed">
            <p><strong>1. Not a Substitute for Medical Care:</strong> Saans is an environmental exposure advisory tool, not a medical diagnosis system.</p>
            <p><strong>2. Emergency Symptoms:</strong> If anyone experiences severe breathlessness, stridor, wheezing, blue lips, or acute asthma attacks, <span className="text-white underline font-semibold">seek emergency hospital medical care immediately</span>.</p>
            <p><strong>3. Prescription Medications:</strong> Never stop or reduce prescribed medications, inhalers, or steroids without a physician.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function MethodologySection() {
  return (
    <section aria-labelledby="assumptions-title" className="space-y-4">
      <h2 id="assumptions-title" className="text-xl font-bold text-white flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-400" />
        Key Methodology & Assumptions
      </h2>
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-4 text-sm text-zinc-300 leading-relaxed">
        <div>
          <h3 className="font-semibold text-white mb-1">1. Ambient Air Quality Sourcing</h3>
          <p>Ambient PM2.5/PM10 concentrations and 24h forecasts are retrieved from Open-Meteo Copernicus models with 15-minute in-memory caching keyed by coordinates rounded to 2 decimals (~1.1 km resolution).</p>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-1">2. Indian National AQI Math</h3>
          <p>AQI is calculated via statutory October 2014 CPCB NAQI piecewise linear breakpoint math matching official Indian health bands (0-50 Good to 401-500 Severe).</p>
        </div>
        <div>
          <h3 className="font-semibold text-white mb-1">3. Inhalation Exposure & Infiltration Physics</h3>
          <p>Inhaled dose combines indoor infiltration factors (0.65-0.85 unpurified vs 0.18-0.22 HEPA) with minute ventilation volumes (0.45 m³/h rest to 1.60 m³/h transit).</p>
        </div>
      </div>
    </section>
  );
}

function LimitationsSection() {
  return (
    <section aria-labelledby="limitations-title" className="space-y-4">
      <h2 id="limitations-title" className="text-xl font-bold text-white flex items-center gap-2">
        <HeartPulse className="w-5 h-5 text-emerald-400" />
        Technical Limitations
      </h2>
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-3 text-sm text-zinc-300 leading-relaxed">
        <ul className="list-disc list-inside space-y-2">
          <li><strong>Micro-climate point sources:</strong> Adjacent waste burning or tandoors can cause hyper-local spikes exceeding regional models.</li>
          <li><strong>Client-side state:</strong> Profiles reside in browser localStorage with zero server PII. Clearing cache resets preferences.</li>
          <li><strong>Serverless rate limits:</strong> In-memory sliding window operates per instance; optional Upstash Redis coordinates multi-region clouds.</li>
        </ul>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <AboutHeader />
      <main className="max-w-4xl mx-auto px-4 py-8 sm:px-8 flex-1 w-full space-y-8" id="main-content">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight mb-3">About Saans (साँस) — Clean Air Platform</h1>
          <p className="text-zinc-300 text-lg leading-relaxed">Saans is an open-source clean air assistant designed for Indian urban families and RWAs navigating winter smog in Delhi-NCR.</p>
        </div>
        <ClinicalDisclaimer />
        <MethodologySection />
        <LimitationsSection />
        <div className="flex gap-4 pt-4">
          <Link href="/sources" className="px-4 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white transition-colors">View Scientific Citations</Link>
          <Link href="/" className="px-4 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-sm font-medium text-white transition-colors">Open Dashboard</Link>
        </div>
      </main>
      <footer className="border-t border-zinc-800 px-4 py-6 text-center text-xs text-zinc-400 mt-12">
        <p>Saans Clean Air Initiative • MIT Licensed • Built for Indian Urban Families & RWAs</p>
      </footer>
    </div>
  );
}
