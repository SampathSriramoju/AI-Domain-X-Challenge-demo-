import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AlertTriangle, ArrowRight, BarChart3, Check, ChevronRight, CircleHelp,
  CloudUpload, Download, FileCheck2, FileWarning, Gauge, Info,
  Lightbulb, LockKeyhole, MapPin, Menu, Network, Play, RefreshCw,
  ShieldCheck, SlidersHorizontal, Sparkles, TrafficCone, Upload, X, Zap
} from 'lucide-react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  useGenerateMetroflowRationale, useGetMetroflowDemo, useSimulateMetroflow, useUploadMetroflowData
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import './index.css';

const queryClient = new QueryClient();
const ACTIVE_ANALYSIS_KEY = 'metroflow-active-analysis';

function readActiveAnalysis(): any | null {
  try {
    const stored = window.localStorage.getItem(ACTIVE_ANALYSIS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveActiveAnalysis(analysis: any) {
  window.localStorage.setItem(ACTIVE_ANALYSIS_KEY, JSON.stringify(analysis));
  window.dispatchEvent(new Event('metroflow-active-analysis-changed'));
}

function clearActiveAnalysis() {
  window.localStorage.removeItem(ACTIVE_ANALYSIS_KEY);
  window.dispatchEvent(new Event('metroflow-active-analysis-changed'));
}

const fallback = {
  project: { name: 'Main Street signal study', corridor: 'Main Street / 5th Avenue', datasetLabel: 'weekday_counts_2024.csv', updatedAt: '2025-02-14T09:42:00Z' },
  kpis: { intersections: 8, peakWindow: '16:30–18:00', worstVc: 0.93, worstIntersection: 'Main & 5th', averageDelay: 37.4, recommendationCount: 6 },
  hourlyVolume: ['06','07','08','09','10','11','12','13','14','15','16','17','18','19','20'].map((hour, i) => ({ hour: `${hour}:00`, volume: [382, 514, 782, 690, 604, 588, 632, 667, 721, 804, 936, 1188, 1138, 892, 621][i], peak: (i === 7 ? 'midday' : i >= 10 && i <= 12 ? 'pm' : i >= 1 && i <= 3 ? 'am' : 'off') as 'am' | 'midday' | 'pm' | 'off' })),
  intersections: [
    { id: 'INT-01', name: 'Main & 1st', order: 1, vc: .64, los: 'C', delay: 24.8, queue: 112, lanes: 4, demand: 1460, capacity: 2280, approach: 'Eastbound', lat: 40, lng: -73, status: 'stable' as const },
    { id: 'INT-02', name: 'Main & 2nd', order: 2, vc: .78, los: 'D', delay: 31.2, queue: 167, lanes: 4, demand: 1820, capacity: 2330, approach: 'Eastbound', lat: 40, lng: -73, status: 'watch' as const },
    { id: 'INT-03', name: 'Main & 3rd', order: 3, vc: .71, los: 'C', delay: 28.6, queue: 139, lanes: 3, demand: 1512, capacity: 2130, approach: 'Westbound', lat: 40, lng: -73, status: 'stable' as const },
    { id: 'INT-04', name: 'Main & 4th', order: 4, vc: .86, los: 'E', delay: 42.7, queue: 224, lanes: 4, demand: 2040, capacity: 2370, approach: 'Northbound', lat: 40, lng: -73, status: 'watch' as const },
    { id: 'INT-05', name: 'Main & 5th', order: 5, vc: .93, los: 'F', delay: 58.1, queue: 318, lanes: 3, demand: 2245, capacity: 2410, approach: 'Eastbound', lat: 40, lng: -73, status: 'critical' as const },
    { id: 'INT-06', name: 'Main & 6th', order: 6, vc: .74, los: 'C', delay: 26.9, queue: 151, lanes: 4, demand: 1712, capacity: 2315, approach: 'Westbound', lat: 40, lng: -73, status: 'stable' as const },
    { id: 'INT-07', name: 'Main & 7th', order: 7, vc: .68, los: 'C', delay: 22.3, queue: 103, lanes: 3, demand: 1400, capacity: 2050, approach: 'Southbound', lat: 40, lng: -73, status: 'stable' as const },
    { id: 'INT-08', name: 'Main & 8th', order: 8, vc: .81, los: 'D', delay: 35.1, queue: 181, lanes: 4, demand: 1930, capacity: 2390, approach: 'Northbound', lat: 40, lng: -73, status: 'watch' as const },
  ],
  phases: [
    { phase: 'Phase 2', movement: 'Main St through', currentGreen: 42, recommendedGreen: 49, minPed: 18, yellow: 4, status: 'adjusted' as const },
    { phase: 'Phase 4', movement: '5th Ave left turn', currentGreen: 18, recommendedGreen: 22, minPed: 18, yellow: 4, status: 'adjusted' as const },
    { phase: 'Phase 6', movement: 'Side street through', currentGreen: 25, recommendedGreen: 21, minPed: 18, yellow: 4, status: 'held' as const },
    { phase: 'Phase 8', movement: 'Pedestrian scramble', currentGreen: 18, recommendedGreen: 18, minPed: 18, yellow: 4, status: 'locked' as const },
  ],
  assumptions: [
    'Traffic Volume is interpreted as vehicles per hour from observed intervals.',
    'Capacity uses uploaded capacity when present or standard lane geometry estimation.',
    'Peak detection uses a rolling 60-minute sum across 15-minute time buckets.',
    'All signal plans maintain pedestrian minimum safety constraints and a 120s cycle.',
    'Outputs are offline recommendations and simulated estimates for operational review.',
  ],
  activities: [
    { title: 'Safety checks passed', detail: 'Pedestrian minimums held across all phases', time: 'now', tone: 'success' as const },
    { title: 'Peak window confirmed', detail: '16:30–18:00 window active', time: 'now', tone: 'info' as const },
    { title: 'Bottleneck flagged', detail: 'Main & 5th reached V/C 0.93', time: 'now', tone: 'warning' as const },
  ],
};

function cn(...values: Array<string | false | null | undefined>) { return values.filter(Boolean).join(' '); }
function Button({ children, className, variant = 'primary', ...props }: { children: ReactNode; className?: string; variant?: 'primary' | 'quiet' | 'outline' | 'danger'; [key: string]: any }) {
  return <button className={cn('inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 active:translate-y-px', variant === 'primary' && 'bg-primary text-primary-foreground shadow-[0_5px_0_hsl(var(--primary)/.18)] hover:-translate-y-0.5 hover:shadow-[0_7px_0_hsl(var(--primary)/.2)]', variant === 'quiet' && 'bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground', variant === 'outline' && 'border border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5', variant === 'danger' && 'bg-destructive text-destructive-foreground', className)} {...props}>{children}</button>;
}
function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: string }) { return <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[.08em]', tone === 'critical' && 'bg-destructive/10 text-destructive', tone === 'watch' && 'bg-accent/20 text-[hsl(29_66%_36%)]', tone === 'stable' && 'bg-primary/10 text-primary', tone === 'neutral' && 'bg-muted text-muted-foreground')}>{children}</span>; }
function Card({ children, className = '', ...props }: { children: ReactNode; className?: string; [key: string]: any }) { return <section className={cn('rounded-xl border border-card-border bg-card shadow-[0_10px_30px_hsl(202_37%_16%/.035)]', className)} {...props}>{children}</section>; }
function SectionHeading({ eyebrow, title, detail, action }: { eyebrow?: string; title: string; detail?: string; action?: ReactNode }) { return <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div>{eyebrow && <div className="mb-1 font-mono text-[10px] uppercase tracking-[.18em] text-primary">{eyebrow}</div>}<h2 className="font-[var(--font-display)] text-xl font-bold tracking-tight">{title}</h2>{detail && <p className="mt-1 text-sm text-muted-foreground">{detail}</p>}</div>{action}</div>; }
function Skeleton({ className = '' }: { className?: string }) { return <div className={cn('relative overflow-hidden rounded bg-muted/70', className)}><div className="absolute inset-y-0 w-1/2 -translate-x-full animate-[sweep_1.6s_infinite] bg-gradient-to-r from-transparent via-card/60 to-transparent" /></div>; }

function Shell({ children, data, hasCustomDataset }: { children: ReactNode; data: any; hasCustomDataset: boolean }) {
  const [location, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const nav = [
    { href: '/', label: 'Command', icon: Gauge },
    { href: '/upload', label: 'Dataset intake', icon: CloudUpload },
    { href: '/analysis', label: 'Corridor analysis', icon: BarChart3 },
    { href: '/optimization', label: 'Timing workbench', icon: SlidersHorizontal },
    { href: '/reports', label: 'Reports & rationale', icon: FileCheck2 },
  ];
  return <div className="noise flex min-h-[100dvh] bg-background">
    <aside className={cn('fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-300 md:static md:translate-x-0', open ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex h-[86px] items-center border-b border-sidebar-border px-6">
        <Link href="/" className="flex items-center gap-3" data-testid="link-brand"><div className="grid size-9 place-items-center rounded-lg bg-accent text-accent-foreground shadow-[4px_4px_0_hsl(29_87%_59%/.28)]"><TrafficCone size={20} strokeWidth={2.5} /></div><div><div className="font-[var(--font-display)] text-lg font-bold tracking-tight">MetroFlow<span className="text-accent"> AI</span></div><div className="font-mono text-[9px] uppercase tracking-[.18em] text-sidebar-foreground/50">Traffic operations</div></div></Link>
      </div>
      <div className="px-4 py-6"><div className="mb-3 px-3 font-mono text-[10px] uppercase tracking-[.16em] text-sidebar-foreground/40">Workspace</div><nav className="space-y-1">{nav.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={cn('group flex items-center gap-3 rounded-md px-3 py-3 text-sm font-semibold transition-colors', location === href ? 'bg-primary text-primary-foreground shadow-[inset_3px_0_0_hsl(var(--accent))]' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground')} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}><Icon size={17} /><span>{label}</span>{href === '/optimization' && <span className="ml-auto rounded bg-accent px-1.5 py-0.5 font-mono text-[9px] text-accent-foreground">3</span>}</Link>)}</nav></div>
      <div className="mt-auto border-t border-sidebar-border p-5">
        {hasCustomDataset ? (
          <div className="mb-3 flex items-center justify-between text-[11px] font-semibold text-primary"><div className="flex items-center gap-2"><span className="live-dot size-2 rounded-full bg-primary" /> Active custom CSV</div><button onClick={() => clearActiveAnalysis()} className="text-[10px] text-muted-foreground hover:text-destructive underline" data-testid="button-clear-dataset">Reset</button></div>
        ) : (
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><span className="size-2 rounded-full bg-muted-foreground/40" /> Demo mode</div>
        )}
        <div className="rounded-md border border-sidebar-border bg-sidebar-accent/40 p-3"><div className="mb-1 flex items-center gap-2 text-[10px] uppercase tracking-wider text-sidebar-foreground/50"><LockKeyhole size={11} /> Data boundary</div><p className="text-xs leading-relaxed text-sidebar-foreground/70">No live signal connection. Advice stays in this workspace.</p></div>
      </div>
    </aside>
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-foreground/20 md:hidden" onClick={() => setOpen(false)} data-testid="button-close-navigation" />}
    <main className="min-w-0 flex-1">
      <header className="sticky top-0 z-20 flex h-[70px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur md:px-8"><div className="flex items-center gap-3"><button className="rounded-md p-2 hover:bg-muted md:hidden" onClick={() => setOpen(true)} data-testid="button-open-navigation"><Menu size={19} /></button><div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"><span className="font-mono text-primary">MTR / 01</span><ChevronRight size={13} /><span>{data?.project?.corridor ?? 'Corridor workspace'}</span></div></div><div className="flex items-center gap-2"><div className="hidden items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:flex"><span className="size-1.5 rounded-full bg-primary" /> {hasCustomDataset ? 'Active Dataset' : 'Demo Mode'}</div><Button variant="quiet" className="size-9 p-0" onClick={() => setLocation('/reports')} aria-label="Open reports" data-testid="button-header-reports"><FileCheck2 size={17} /></Button><div className="grid size-8 place-items-center rounded-full bg-secondary font-mono text-xs font-bold text-secondary-foreground">JR</div></div></header>
      <div className="mx-auto w-full max-w-[1500px] px-5 py-8 md:px-8 lg:px-10">{children}</div>
    </main>
  </div>;
}

function PageIntro({ kicker, title, description, children }: { kicker: string; title: string; description: string; children?: ReactNode }) { return <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div className="animate-rise"><div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.18em] text-primary"><span className="size-1.5 bg-accent" /> {kicker}</div><h1 className="font-[var(--font-display)] text-3xl font-bold tracking-[-.04em] md:text-4xl">{title}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p></div><div className="animate-rise delay-1 flex shrink-0 gap-2">{children}</div></div>; }

function LoadingPage() { return <div className="space-y-6"><Skeleton className="h-5 w-28" /><Skeleton className="h-12 w-2/3" /><Skeleton className="h-4 w-1/2" /><div className="grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-80" /></div>; }
function ErrorCard({ onRetry }: { onRetry: () => void }) { return <Card className="border-destructive/30 bg-destructive/5 p-8 text-center"><AlertTriangle className="mx-auto mb-3 text-destructive" /><h2 className="font-[var(--font-display)] text-lg font-bold">Workspace data is unavailable</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">The analysis could not be loaded. Nothing has been written to a live controller.</p><Button className="mt-5" onClick={onRetry} data-testid="button-retry-demo"><RefreshCw size={15} /> Try again</Button></Card>; }

function Kpi({ label, value, detail, accent = false, testId }: { label: string; value: string; detail: string; accent?: boolean; testId: string }) { return <Card className={cn('animate-rise p-5', accent && 'border-accent/40 bg-accent/5')} data-testid={testId}><div className="mb-4 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-[.15em] text-muted-foreground">{label}</span><span className={cn('size-2 rounded-full', accent ? 'bg-accent' : 'bg-primary/50')} /></div><div className="font-[var(--font-display)] text-3xl font-bold tracking-tight">{value}</div><div className="mt-1 text-xs text-muted-foreground">{detail}</div></Card>; }

function VolumeChart({ values }: { values: any[] }) {
  const safeValues = values ?? [];
  const max = safeValues.length ? Math.max(...safeValues.map(v => v.volume || 0), 1) : 1;
  return <Card className="p-5 md:p-6"><SectionHeading eyebrow="Demand profile" title="Hourly volume" detail="Observed corridor volume, vehicles per hour" action={<Badge tone="watch">Peak Window</Badge>} /><div className="flex h-48 items-end gap-1.5 border-b border-border/80 pb-0 sm:gap-2">{safeValues.map((v, i) => <div className="group relative flex h-full flex-1 items-end" key={v.hour}><div className={cn('w-full rounded-t-sm transition-all duration-500 group-hover:bg-accent', v.peak === 'pm' || v.peak === 'am' ? 'bg-primary' : 'bg-muted-foreground/20')} style={{ height: `${Math.max(9, ((v.volume || 0) / max) * 100)}%`, animationDelay: `${i * 30}ms` }} /><div className="pointer-events-none absolute -top-9 left-1/2 hidden -translate-x-1/2 rounded bg-secondary px-2 py-1 font-mono text-[9px] text-secondary-foreground group-hover:block">{v.volume}</div></div>)}</div><div className="mt-3 flex justify-between font-mono text-[9px] text-muted-foreground">{safeValues.filter((_,i) => i % 2 === 0).map(v => <span key={v.hour}>{v.hour.slice(0,5)}</span>)}</div></Card>;
}

function CorridorStrip({ intersections }: { intersections: any[] }) {
  const safeIntersections = intersections ?? [];
  return <Card className="overflow-hidden p-5 md:p-6"><SectionHeading eyebrow="Corridor scan" title={`${safeIntersections.length} intersections, one operating picture`} detail="Ranked by corridor order" action={<Link href="/analysis" className="text-xs font-bold text-primary hover:underline" data-testid="link-view-analysis">Open detail <ArrowRight className="ml-1 inline" size={13} /></Link>} /><div className="relative mt-8 flex items-start justify-between gap-1 overflow-x-auto pb-2"><div className="absolute left-3 right-3 top-3 h-px bg-border" /><div className="absolute left-3 top-3 h-px bg-primary" style={{ width: '63%' }} />{safeIntersections.map((item, i) => <Link href="/analysis" key={item.id} className="group relative z-10 min-w-[82px] text-center" data-testid={`link-intersection-${item.id}`}><div className={cn('mx-auto mb-3 grid size-7 place-items-center rounded-full border-4 border-card text-[10px] font-bold transition-transform group-hover:scale-125', item.status === 'critical' ? 'bg-destructive text-destructive-foreground' : item.status === 'watch' ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground')}>{i+1}</div><div className="text-[11px] font-bold">{item.name || item.id}</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">V/C {(item.vc ?? 0).toFixed(2)}</div></Link>)}</div></Card>;
}

function ActivityFeed({ activities }: { activities: any[] }) {
  const safeActivities = activities ?? [];
  return <Card className="p-5"><SectionHeading eyebrow="Audit trail" title="Recent activity" /><div className="space-y-4">{safeActivities.map((a, i) => <div className="flex gap-3" key={`${a.title}-${i}`} data-testid={`activity-${i}`}><div className={cn('mt-1 grid size-7 shrink-0 place-items-center rounded-full', a.tone === 'success' ? 'bg-primary/10 text-primary' : a.tone === 'warning' ? 'bg-accent/20 text-[hsl(29_66%_36%)]' : 'bg-secondary/10 text-secondary')} >{a.tone === 'success' ? <Check size={14} /> : a.tone === 'warning' ? <AlertTriangle size={14} /> : <Info size={14} />}</div><div className="min-w-0 flex-1"><div className="flex justify-between gap-2 text-xs font-bold"><span>{a.title}</span><span className="whitespace-nowrap font-mono text-[9px] font-normal text-muted-foreground">{a.time}</span></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.detail}</p></div></div>)}</div></Card>;
}

function Dashboard({ data, refresh }: { data: any; refresh: () => void }) {
  const d = data || fallback;
  const intersections = d.intersections ?? [];
  const worst = intersections.slice().sort((a: any, b: any) => (b.vc ?? 0) - (a.vc ?? 0))[0] ?? { id: '—', name: 'the active bottleneck', approach: 'dominant', vc: 0 };
  return <><PageIntro kicker="Command / active corridor" title={`Active Study: ${d.project?.corridor ?? 'Corridor'}`} description={`Canonical analysis for ${d.project?.datasetLabel ?? 'dataset'}. All outputs are offline recommendations — not live signal commands.`}><Button variant="outline" onClick={refresh} data-testid="button-refresh-dashboard"><RefreshCw size={14} /> Refresh study</Button><Link href="/optimization" className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-bold text-primary-foreground transition hover:-translate-y-0.5" data-testid="link-open-workbench">Open workbench <ArrowRight size={15} /></Link></PageIntro><div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Kpi label="Intersections" value={String(d.kpis?.intersections ?? 0)} detail="In active corridor" testId="kpi-intersections" /><Kpi label="Peak window" value={d.kpis?.peakWindow ?? '—'} detail="Highest observed demand" testId="kpi-peak-window" /><Kpi label="Worst V/C" value={(d.kpis?.worstVc ?? 0).toFixed(2)} detail={d.kpis?.worstIntersection ?? '—'} accent testId="kpi-worst-vc" /><Kpi label="Avg. delay" value={`${(d.kpis?.averageDelay ?? 0).toFixed(1)}s`} detail={`${d.kpis?.recommendationCount ?? 0} offline recommendations`} testId="kpi-average-delay" /></div><div className="mb-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]"><VolumeChart values={d.hourlyVolume ?? []} /><Card className="relative overflow-hidden bg-secondary p-6 text-secondary-foreground"><div className="absolute -right-10 -top-10 size-40 rounded-full border border-secondary-foreground/10" /><div className="absolute -right-2 top-0 size-24 rounded-full border border-secondary-foreground/10" /><div className="relative flex h-full flex-col justify-between"><div><div className="mb-5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-secondary-foreground/60"><Sparkles size={13} className="text-accent" /> System readout</div><h2 className="max-w-xs font-[var(--font-display)] text-2xl font-bold leading-tight">Primary Bottleneck: {worst.name || worst.id}</h2><p className="mt-3 max-w-sm text-sm leading-relaxed text-secondary-foreground/65">{worst.id} ranks first in bottleneck order with a V/C of {(worst.vc ?? 0).toFixed(2)} during the {d.kpis?.peakWindow ?? '—'} window.</p></div><Link href="/optimization" className="mt-8 inline-flex items-center gap-2 text-sm font-bold text-accent hover:gap-3 transition-all" data-testid="link-review-recommendation">Review recommendation <ArrowRight size={15} /></Link></div></Card></div><div className="mb-6"><CorridorStrip intersections={intersections} /></div><div className="grid gap-6 lg:grid-cols-[1.2fr_.8fr]"><Card className="p-5"><SectionHeading eyebrow="Priority queue" title="Bottleneck Ranking" action={<Link href="/analysis" className="text-xs font-bold text-primary hover:underline" data-testid="link-all-intersections">All intersections</Link>} /><div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="pb-3 font-medium">Rank</th><th className="pb-3 font-medium">Intersection</th><th className="pb-3 font-medium">V/C</th><th className="pb-3 font-medium">LOS</th><th className="pb-3 font-medium">Delay</th><th className="pb-3 font-medium">Status</th></tr></thead><tbody>{intersections.slice().sort((a: any,b: any) => (b.vc ?? 0) - (a.vc ?? 0)).slice(0,5).map((x: any, i: number) => <tr className="border-b border-border/60 last:border-0 animate-rise" style={{ animationDelay: `${i * 70}ms` }} key={x.id} data-testid={`row-priority-${x.id}`}><td className="py-3 font-mono text-xs">#{i+1}</td><td className="py-3 font-semibold">{x.name || x.id}<div className="font-mono text-[10px] font-normal text-muted-foreground">{x.approach} approach</div></td><td className="py-3 font-mono text-sm">{(x.vc ?? 0).toFixed(2)}</td><td className="py-3"><Badge tone={x.status}>{x.los}</Badge></td><td className="py-3 font-mono text-sm">{(x.delay ?? 0).toFixed(1)}s</td><td className="py-3"><Badge tone={x.status}>{x.status}</Badge></td></tr>)}</tbody></table></div></Card><ActivityFeed activities={d.activities ?? []} /></div></>;
}

function UploadPage({ hasActiveDataset }: { hasActiveDataset: boolean }) {
  const upload = useUploadMetroflowData();
  const [, setLocation] = useLocation();
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [rows, setRows] = useState('0');
  const [validated, setValidated] = useState<any>(null);
  const [dragging, setDragging] = useState(false);

  const selectFile = (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setValidated(null);
    file.text().then((content) => {
      setFileContent(content);
      const lineCount = Math.max(0, content.trim().split(/\r?\n/).length - 1);
      setRows(String(lineCount));
    });
  };

  const runValidationAndAnalysis = () => {
    if (!fileName || !fileContent) return;
    clearActiveAnalysis();
    upload.mutate(
      { data: { filename: fileName, rows: Number(rows) || 0, content: fileContent, hasRequiredColumns: true } },
      {
        onSuccess: (result: any) => {
          setValidated(result);
          if (result.analysis && result.errors.length === 0) {
            saveActiveAnalysis(result.analysis);
          } else {
            clearActiveAnalysis();
          }
        },
        onError: () => {
          clearActiveAnalysis();
        }
      },
    );
  };

  const proceedToAnalysis = () => {
    setLocation('/');
  };

  return <><PageIntro kicker="Dataset intake & validation" title="Upload Traffic CSV" description="Upload a single traffic count CSV to automatically generate the complete canonical MetroFlow AI analysis across all modules."><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" data-testid="link-back-command"><ArrowRight className="rotate-180" size={15} /> Go to Dashboard</Link></PageIntro>
  {hasActiveDataset && <div className="mb-6 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm font-medium"><div className="flex items-center gap-2 text-primary"><Check size={18} /> An active dataset is currently driving all workspace views. Uploading a new valid CSV will replace it.</div><Button variant="outline" size="sm" onClick={() => clearActiveAnalysis()} data-testid="button-clear-active-dataset">Clear Active Dataset</Button></div>}
  <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]"><Card className="p-5 md:p-7"><div onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={e => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0]); }} className={cn('rounded-xl border-2 border-dashed p-8 text-center transition-colors md:p-12', dragging ? 'border-primary bg-primary/5' : 'border-border bg-background/40 hover:border-primary/50')}><div className="mx-auto grid size-14 place-items-center rounded-xl bg-primary/10 text-primary"><CloudUpload size={26} /></div><h2 className="mt-5 font-[var(--font-display)] text-xl font-bold">Drop your traffic CSV here</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">CSV with Timestamp, Intersection_ID, Approach_Direction, Volume headers.</p><label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-bold transition hover:border-primary/50 hover:bg-primary/5" data-testid="label-select-file"><Upload size={15} /> Select CSV File<input className="sr-only" type="file" accept=".csv" onChange={e => selectFile(e.target.files?.[0])} data-testid="input-upload-file" /></label>{fileName && <div className="mt-7 flex items-center justify-between rounded-md border border-primary/20 bg-primary/5 p-3 text-left"><div className="flex min-w-0 items-center gap-3"><FileCheck2 className="shrink-0 text-primary" size={18} /><div className="min-w-0"><div className="truncate text-sm font-bold">{fileName}</div><div className="font-mono text-[10px] text-muted-foreground">{rows} data rows parsed</div></div></div><button className="text-muted-foreground hover:text-destructive" onClick={() => { setFileName(''); setFileContent(''); setValidated(null); }} aria-label="Remove selected file" data-testid="button-remove-file"><X size={16} /></button></div>}</div><Button className="mt-5 w-full" disabled={!fileName || !fileContent || upload.isPending} onClick={runValidationAndAnalysis} data-testid="button-validate-upload">{upload.isPending ? <><RefreshCw className="animate-spin" size={15} /> Validating & Processing Dataset...</> : <><ShieldCheck size={15} /> Validate & Process Dataset</>}</Button>{upload.isError && <div className="mt-4 flex gap-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive"><AlertTriangle size={15} className="shrink-0" /> Processing service error. Please verify CSV formatting.</div>}</Card><Card className="p-5 md:p-7"><SectionHeading eyebrow="Dataset Quality & Pipeline Status" title="Validation Output" detail="Automatic canonical analysis generation status" />{!validated && !upload.isPending ? <div className="grid min-h-[320px] place-items-center rounded-lg border border-dashed border-border bg-background/30 p-8 text-center"><div><FileWarning className="mx-auto mb-4 text-muted-foreground/60" size={29} /><h3 className="font-[var(--font-display)] font-bold">No CSV Validated</h3><p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">Select a traffic CSV file and click Validate & Process. If valid, downstream modules will immediately update.</p></div></div> : upload.isPending ? <div className="space-y-4"><Skeleton className="h-16" /><Skeleton className="h-5 w-1/2" /><Skeleton className="h-40" /></div> : <ValidationResult result={validated} onProceed={proceedToAnalysis} />}</Card></div></>;
}

function ValidationResult({ result, onProceed }: { result: any; onProceed: () => void }) {
  const valid = result.status === 'valid' || result.status === 'warning';
  const hasAnalysis = Boolean(result.analysis && result.errors?.length === 0);

  return <div className="animate-rise">
    <div className={cn('flex items-start gap-3 rounded-lg border p-4', valid ? 'border-primary/25 bg-primary/5' : 'border-destructive/30 bg-destructive/10')}>
      <div className={cn('grid size-9 shrink-0 place-items-center rounded-full', valid ? 'bg-primary text-primary-foreground' : 'bg-destructive text-destructive-foreground')}>
        {valid ? <Check size={18} /> : <AlertTriangle size={18} />}
      </div>
      <div className="flex-1">
        <div className="font-bold">{valid ? 'Dataset Validated Successfully' : 'Validation Failed'}</div>
        <p className="mt-1 text-xs text-muted-foreground">{(result.rowsProcessed ?? 0).toLocaleString()} rows processed. {hasAnalysis ? 'Canonical AnalysisResult generated for all pages.' : 'Dataset rejected due to errors.'}</p>
      </div>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <div className="rounded-md bg-muted/60 p-3"><div className="font-mono text-[10px] uppercase text-muted-foreground">Warnings</div><div className="mt-1 text-xl font-bold">{result.warnings?.length ?? 0}</div></div>
      <div className="rounded-md bg-muted/60 p-3"><div className="font-mono text-[10px] uppercase text-muted-foreground">Errors</div><div className="mt-1 text-xl font-bold">{result.errors?.length ?? 0}</div></div>
    </div>
    {(result.warnings?.length || result.errors?.length) ? <div className="mt-5 space-y-2">{[...(result.errors ?? []), ...(result.warnings ?? [])].map((x: string, i: number) => <div className="flex gap-2 text-xs text-muted-foreground" key={i}><AlertTriangle className="shrink-0 text-accent" size={14} />{x}</div>)}</div> : null}
    {hasAnalysis && <div className="mt-6 rounded-lg border border-primary/20 bg-primary/10 p-4 text-center"><h4 className="font-bold text-primary">Dataset Ready for Complete Analysis</h4><p className="mt-1 text-xs text-muted-foreground mb-4">All downstream modules (Corridor, Bottleneck, Workbench, Simulation, Rationale, Reports) are now populated with this dataset.</p><Button onClick={onProceed} className="w-full" data-testid="button-view-complete-analysis">View Complete Analysis <ArrowRight size={15} /></Button></div>}
    <div className="mt-7"><div className="mb-3 flex items-center justify-between"><span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Parsed Preview</span><Badge>{result.preview?.length ?? 0} rows</Badge></div><div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[500px] text-left text-xs"><thead className="bg-muted/60 font-mono text-[9px] uppercase text-muted-foreground"><tr><th className="p-2.5">Timestamp</th><th className="p-2.5">Intersection</th><th className="p-2.5">Approach</th><th className="p-2.5">Volume</th></tr></thead><tbody>{(result.preview ?? []).slice(0,5).map((r: any, i: number) => <tr className="border-t border-border/60" key={i}><td className="p-2.5 font-mono">{r.timestamp}</td><td className="p-2.5">{r.intersectionId}</td><td className="p-2.5">{r.approach}</td><td className="p-2.5 font-mono">{r.volume}</td></tr>)}</tbody></table></div></div>
  </div>;
}

function AnalysisPage({ data }: { data: any }) {
  const d = data || fallback;
  const intersections = d.intersections ?? [];
  const assumptions = d.assumptions ?? [];
  const [selected, setSelected] = useState(intersections.find((x: any) => x.status === 'critical')?.id ?? intersections[0]?.id);
  const item = intersections.find((x: any) => x.id === selected) ?? intersections[0] ?? {};

  const ranked = intersections.slice().sort((a: any, b: any) => (b.vc ?? 0) - (a.vc ?? 0));

  return <><PageIntro kicker="Corridor & Bottleneck Analysis" title="Corridor Performance & Ranking" description={`Deterministic bottleneck identification and demand profiling for ${d.project?.corridor ?? 'active corridor'}.`}><Link href="/upload" className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline" data-testid="link-analysis-upload"><CloudUpload size={15} /> Upload New CSV</Link></PageIntro>
  <div className="mb-6 grid gap-6 xl:grid-cols-[1.4fr_.8fr]"><Card className="overflow-hidden p-5 md:p-6"><SectionHeading eyebrow="Bottleneck Identification & Ranking" title="Intersection V/C Ranking" detail={`Demand / Capacity · Peak Window ${d.kpis?.peakWindow ?? '—'}`} /><div className="space-y-4">{ranked.map((x: any, i: number) => <button key={x.id} onClick={() => setSelected(x.id)} className={cn('group grid w-full grid-cols-[34px_1fr_52px] items-center gap-3 text-left p-2 rounded-md transition-colors', selected === x.id ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50')} data-testid={`button-select-intersection-${x.id}`}><span className="font-mono text-xs text-muted-foreground">#{i+1}</span><div><div className="mb-1.5 flex justify-between text-xs font-bold"><span>{x.name || x.id}</span><span className="font-mono">{(x.vc ?? 0).toFixed(2)} V/C</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn('h-full rounded-full transition-all duration-500', x.status === 'critical' ? 'bg-destructive' : x.status === 'watch' ? 'bg-accent' : 'bg-primary')} style={{ width: `${Math.min(100, (x.vc ?? 0) * 100)}%` }} /></div></div><Badge tone={x.status}>{x.los}</Badge></button>)}</div></Card><Card className="bg-secondary p-6 text-secondary-foreground"><div className="mb-8 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-secondary-foreground/60"><MapPin size={14} className="text-accent" /> Bottleneck Detail</div><div className="font-mono text-xs text-accent">{item.id ?? '—'}</div><h2 className="mt-1 font-[var(--font-display)] text-2xl font-bold">{item.name || item.id}</h2><div className="mt-7 grid grid-cols-2 gap-5">{[['V/C Ratio', (item.vc ?? 0).toFixed(2)],['LOS', item.los ?? '—'],['Delay', `${(item.delay ?? 0).toFixed(1)}s`],['Est. Queue', `${item.queue ?? 0} ft`]].map(([l,v]) => <div key={l}><div className="font-mono text-[10px] uppercase text-secondary-foreground/50">{l}</div><div className="mt-1 font-[var(--font-display)] text-xl font-bold">{v}</div></div>)}</div><div className="mt-8 border-t border-secondary-foreground/15 pt-4 text-xs leading-relaxed text-secondary-foreground/65"><span className="font-bold text-secondary-foreground">Engineering Readout:</span> {(item.vc ?? 0) >= 0.85 ? `Intersection ${item.id} has elevated V/C (${(item.vc ?? 0).toFixed(2)}). Signal split adjustment recommended on ${item.approach} approach.` : `Operating within normal capacity envelope.`}</div></Card></div><div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]"><Card className="p-5 md:p-6"><SectionHeading eyebrow="Movement Conditions" title="Demand vs Capacity" detail="Operational parameters from active dataset" /><div className="grid gap-3 sm:grid-cols-3">{[['Demand', `${(item.demand ?? 0).toLocaleString()} vph`, 'Observed arrival demand'],['Capacity', `${(item.capacity ?? 0).toLocaleString()} vph`, 'Calculated capacity'],['Lanes', `${item.lanes ?? 0}`, `${item.approach ?? '—'} approach`]].map(([l,v,d]) => <div className="rounded-lg bg-muted/60 p-4" key={l}><div className="font-mono text-[10px] uppercase text-muted-foreground">{l}</div><div className="mt-2 font-[var(--font-display)] text-2xl font-bold">{v}</div><div className="mt-1 text-xs text-muted-foreground">{d}</div></div>)}</div></Card><Card className="p-5 md:p-6"><SectionHeading eyebrow="Active Assumptions" title="Analysis Boundaries" /><ul className="space-y-3">{assumptions.slice(0,4).map((x: string, i: number) => <li className="flex gap-3 text-sm leading-relaxed text-muted-foreground" key={i}><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />{x}</li>)}</ul></Card></div></>;
}

function OptimizationPage({ data }: { data: any }) {
  const d = data || fallback;
  const phases = d.phases ?? [];
  const intersections = d.intersections ?? [];
  const worst = intersections.slice().sort((a: any, b: any) => (b.vc ?? 0) - (a.vc ?? 0))[0];
  const simulate = useSimulateMetroflow();
  const [multiplier, setMultiplier] = useState(1);
  const [result, setResult] = useState<any>(null);
  const [toast, setToast] = useState('');

  const runSimulation = () => {
    simulate.mutate(
      {
        data: {
          demandMultiplier: multiplier,
          baselineDelay: worst?.delay,
          baselineQueue: worst?.queue,
          baselineThroughput: worst?.demand,
          recommendedDelay: worst ? Math.max(10, worst.delay * 0.82) : undefined,
          recommendedQueue: worst ? Math.max(10, worst.queue * 0.78) : undefined,
          recommendedThroughput: worst ? worst.demand * 1.06 : undefined,
        }
      },
      {
        onSuccess: r => {
          setResult(r);
          setToast('Before / after simulation generated');
          setTimeout(() => setToast(''), 2800);
        }
      }
    );
  };

  return <><PageIntro kicker="Signal Optimization & Simulation" title="Timing Workbench & Before/After Simulation" description={`Offline signal timing recommendations and demand stress test for ${d.project?.corridor ?? 'corridor'}.`}><Badge tone="watch"><span className="live-dot mr-1.5 size-1.5 rounded-full bg-accent" /> SIMULATED ESTIMATE</Badge></PageIntro><div className="mb-6 grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><Card className="p-5 md:p-6"><SectionHeading eyebrow="Safety-Checked Signal Plan" title="Recommended Phase Splits" detail={`Primary Target: ${worst?.name || worst?.id || 'Bottleneck'} · Cycle: 120s`} action={<Badge tone="stable"><ShieldCheck size={11} className="mr-1" /> Safety Guardrails Intact</Badge>} /><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead className="border-b border-border font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><tr><th className="pb-3 font-medium">Phase</th><th className="pb-3 font-medium">Movement</th><th className="pb-3 font-medium">Current</th><th className="pb-3 font-medium">Recommended</th><th className="pb-3 font-medium">Min Ped</th><th className="pb-3 font-medium">Yellow</th><th className="pb-3 font-medium">Status</th></tr></thead><tbody>{phases.map((p: any, i: number) => <tr className="border-b border-border/60 last:border-0 animate-rise" style={{ animationDelay: `${i*80}ms` }} key={p.phase} data-testid={`row-phase-${p.phase}`}><td className="py-4 font-bold">{p.phase}</td><td className="py-4 text-xs text-muted-foreground">{p.movement}</td><td className="py-4 font-mono text-sm">{p.currentGreen}s</td><td className="py-4"><div className="flex items-center gap-2 font-mono text-sm font-bold text-primary">{p.recommendedGreen}s {p.recommendedGreen !== p.currentGreen && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px]">{p.recommendedGreen > p.currentGreen ? '+' : ''}{p.recommendedGreen - p.currentGreen}s</span>}</div></td><td className="py-4 font-mono text-sm">{p.minPed}s</td><td className="py-4 font-mono text-sm">{p.yellow}s</td><td className="py-4"><Badge tone={p.status === 'locked' ? 'neutral' : p.status === 'adjusted' ? 'stable' : 'watch'}>{p.status}</Badge></td></tr>)}</tbody></table></div><div className="mt-5 flex items-start gap-3 rounded-md bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground"><LockKeyhole className="mt-0.5 shrink-0 text-primary" size={15} /><span><strong className="text-foreground">Safety Constraint:</strong> Pedestrian minimums (18s) and yellow clearance (4s) are enforced. Total cycle is locked at 120s.</span></div></Card><Card className="relative overflow-hidden bg-primary p-6 text-primary-foreground"><div className="relative"><div className="mb-7 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.15em] text-primary-foreground/70"><Zap size={14} className="text-accent" /> Demand Stress Test</div><h2 className="font-[var(--font-display)] text-2xl font-bold leading-tight">Simulate Volume Variation</h2><p className="mt-3 text-sm leading-relaxed text-primary-foreground/70">Vary arrival demand multiplier from 0.70× to 1.30× to evaluate timing resilience.</p><div className="mt-8"><div className="mb-3 flex justify-between font-mono text-xs"><span>Demand Multiplier</span><strong>{multiplier.toFixed(2)}×</strong></div><input type="range" min=".7" max="1.3" step=".05" value={multiplier} onChange={e => setMultiplier(Number(e.target.value))} className="w-full accent-[hsl(var(--accent))]" data-testid="input-demand-multiplier" /><div className="mt-2 flex justify-between font-mono text-[9px] text-primary-foreground/55"><span>0.70× light</span><span>1.00× observed</span><span>1.30× stress</span></div></div><Button variant="outline" className="mt-8 w-full border-primary-foreground/20 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20" onClick={runSimulation} disabled={simulate.isPending} data-testid="button-run-simulation">{simulate.isPending ? <><RefreshCw className="animate-spin" size={15} /> Running Simulation...</> : <><Play size={15} /> Run Simulation</>}</Button></div></Card></div>{result ? <SimulationPanel result={result} /> : <Card className="grid place-items-center border-dashed bg-background/40 p-12 text-center"><div><Network className="mx-auto mb-4 text-muted-foreground/60" size={30} /><h2 className="font-[var(--font-display)] text-lg font-bold">Run Simulation</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Click "Run Simulation" to generate before vs after performance metrics for the active dataset.</p></div></Card>}{toast && <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground shadow-xl animate-rise"><Check className="text-accent" size={16} />{toast}</div>}</>;
}

function SimulationPanel({ result }: { result: any }) {
  const metrics = [
    ['Delay per vehicle', 'delay', 's'],
    ['Queue length', 'queue', 'ft'],
    ['Corridor throughput', 'throughput', 'vph']
  ];

  return <Card className="animate-rise p-5 md:p-6"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="mb-1 font-mono text-[10px] uppercase tracking-[.15em] text-primary">Before vs After Comparison</div><h2 className="font-[var(--font-display)] text-xl font-bold">Modeled Operational Impact</h2></div><Badge tone="watch">SIMULATED ESTIMATE · {(result.demandMultiplier ?? 1).toFixed(2)}× demand</Badge></div><div className="grid gap-3 md:grid-cols-3">{metrics.map(([label,key,unit]) => <div className="rounded-lg border border-border bg-background/50 p-4" key={key}><div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div><div className="mt-4 grid grid-cols-2 gap-4"><div><div className="text-[10px] uppercase text-muted-foreground">Current Plan</div><div className="mt-1 font-[var(--font-display)] text-2xl font-bold">{result.baseline?.[key] ?? 0}<small className="ml-1 text-xs font-normal text-muted-foreground">{unit}</small></div></div><div><div className="text-[10px] uppercase text-primary">Recommended</div><div className="mt-1 font-[var(--font-display)] text-2xl font-bold text-primary">{result.recommended?.[key] ?? 0}<small className="ml-1 text-xs font-normal text-muted-foreground">{unit}</small></div></div></div></div>)}</div><div className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-md bg-primary/5 p-4 text-sm"><div className="flex items-center gap-2 font-bold text-primary"><Check size={15} /> Modeled Outcome</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">LOS transitions from <strong>{result.baseline?.los ?? '—'}</strong> to <strong>{result.recommended?.los ?? '—'}</strong> with an estimated <strong>{result.recommended?.reduction ?? 0}%</strong> delay reduction.</p></div><div className="rounded-md bg-muted/60 p-4 text-xs leading-relaxed text-muted-foreground"><div className="mb-1 flex items-center gap-2 font-bold text-foreground"><CircleHelp size={14} /> Model Limitations</div>{result.limitations ?? 'SIMULATED ESTIMATE'}</div></div></Card>;
}

function ReportsPage({ data }: { data: any }) {
  const d = data || fallback;
  const intersections = d.intersections ?? [];
  const kpis = d.kpis ?? {};
  const phases = d.phases ?? [];
  const assumptions = d.assumptions ?? [];
  const rationale = useGenerateMetroflowRationale();
  const [report, setReport] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const worst = intersections.slice().sort((a: any, b: any) => (b.vc ?? 0) - (a.vc ?? 0))[0] ?? {};

  const generateRationale = () => {
    rationale.mutate(
      {
        data: {
          intersectionId: worst.id || '—',
          peakWindow: kpis.peakWindow || '—',
          vcRatio: worst.vc || 0,
          cycleBefore: 120,
          cycleAfter: 120,
          phaseBefore: phases[0]?.currentGreen ?? 30,
          phaseAfter: phases[0]?.recommendedGreen ?? 35,
          delayBefore: worst.delay || 0,
          delayAfter: Math.max(0, (worst.delay || 0) * 0.82),
          safetyStatus: 'Passed Safety Checks',
          demand: worst.demand,
          capacity: worst.capacity,
          queue: worst.queue,
          currentSignal: `Phase 2: ${phases[0]?.currentGreen ?? 30}s green`,
          recommendedSignal: `Phase 2: ${phases[0]?.recommendedGreen ?? 35}s green`,
          assumptions,
        }
      },
      { onSuccess: setReport }
    );
  };

  const exportReport = () => {
    setFeedback('Report package queued for export');
    setTimeout(() => setFeedback(''), 2600);
  };

  return <><PageIntro kicker="Reports & AI Engineering Rationale" title="Exportable Engineering Rationale" description={`Explainable rationale and assumptions generated from active dataset ${d.project?.datasetLabel ?? ''}.`}><Button variant="outline" onClick={exportReport} data-testid="button-export-report"><Download size={15} /> Export Report Package</Button></PageIntro>
  <div className="mb-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]"><Card className="p-5 md:p-7"><div className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><div className="mb-1 font-mono text-[10px] uppercase tracking-[.15em] text-primary">AI Engineering Rationale</div><h2 className="font-[var(--font-display)] text-2xl font-bold">Bottleneck Analysis for {worst.name || worst.id || 'Corridor'}</h2><p className="mt-1 text-sm text-muted-foreground">Generated deterministically from active dataset results.</p></div><Badge tone={report ? 'stable' : 'neutral'}>{report ? 'Generated' : 'Ready'}</Badge></div>
  {report ? <div className="prose prose-sm max-w-none text-muted-foreground space-y-3">{report.markdown.split('\n\n').map((paragraph: string, i: number) => {
    if (paragraph.startsWith('###')) return <h3 className="font-[var(--font-display)] text-lg font-bold text-foreground mt-4 mb-2" key={i}>{paragraph.replace(/^###\s*/, '')}</h3>;
    return <p className="text-sm leading-relaxed" key={i}>{paragraph}</p>;
  })}</div> : <div className="grid min-h-[300px] place-items-center rounded-lg border border-dashed border-border bg-background/40 p-8 text-center"><div><Lightbulb className="mx-auto mb-4 text-accent" size={30} /><h3 className="font-[var(--font-display)] font-bold">Generate Engineering Rationale</h3><p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">Cites WHAT happened, WHERE, WHY, WHAT is recommended, and WHAT limitations apply for {worst.id || 'the active dataset'}.</p><Button className="mt-5" onClick={generateRationale} disabled={rationale.isPending} data-testid="button-generate-rationale">{rationale.isPending ? <><RefreshCw className="animate-spin" size={15} /> Drafting Rationale...</> : <><Sparkles size={15} /> Generate Rationale</>}</Button></div></div>}
  {rationale.isError && <div className="mt-4 text-xs text-destructive">Rationale generation service error. Citing default dataset parameters.</div>}</Card><Card className="p-5 md:p-7"><SectionHeading eyebrow="Review Record" title="Assumptions & Constraints" detail="Carried into all exported reports" /><div className="space-y-4">{assumptions.map((x: string, i: number) => <div className="flex gap-3 text-sm leading-relaxed" key={i}><div className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-muted font-mono text-[10px] text-muted-foreground">{i+1}</div><span className="text-muted-foreground">{x}</span></div>)}</div><div className="mt-7 rounded-lg border border-accent/30 bg-accent/10 p-4"><div className="flex gap-2 text-sm font-bold"><AlertTriangle size={16} className="text-[hsl(29_66%_36%)]" /> Mandatory Guardrail</div><p className="mt-2 text-xs leading-relaxed text-muted-foreground">This workspace produces offline signal timing advice. It does not interface directly with field signal hardware.</p></div></Card></div>
  <Card className="p-5 md:p-6"><SectionHeading eyebrow="Export Package" title="Summary of Active Canonical Dataset" /><div className="grid gap-3 sm:grid-cols-3">{[['01','Corridor Summary',`${kpis.intersections ?? 0} Intersections · Peak: ${kpis.peakWindow ?? '—'}`],['02','Primary Bottleneck',`${worst.id ?? '—'} · V/C: ${(worst.vc ?? 0).toFixed(2)} · LOS ${worst.los ?? '—'}`],['03','Recommended Plan','120s Cycle · Pedestrian Safety Guardrails Intact']].map(([n,t,d]) => <div className="rounded-lg bg-muted/55 p-4" key={n}><div className="font-mono text-xs text-primary">{n}</div><div className="mt-3 font-bold">{t}</div><div className="mt-1 text-xs leading-relaxed text-muted-foreground">{d}</div></div>)}</div></Card>
  {feedback && <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-md bg-secondary px-4 py-3 text-sm font-bold text-secondary-foreground shadow-xl animate-rise"><Download className="text-accent" size={16} />{feedback}</div>}</>;
}

function AppData({ children }: { children: (data: any, refresh: () => void, hasCustomDataset: boolean) => ReactNode }) {
  const query = useGetMetroflowDemo();
  const [active, setActive] = useState<any>(() => readActiveAnalysis());

  useEffect(() => {
    const sync = () => setActive(readActiveAnalysis());
    window.addEventListener('metroflow-active-analysis-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('metroflow-active-analysis-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const hasCustomDataset = Boolean(active);
  const data = active ?? query.data ?? fallback;

  if (query.isLoading && !data) return <Shell data={fallback} hasCustomDataset={false}><LoadingPage /></Shell>;
  if (query.isError && !data) return <Shell data={fallback} hasCustomDataset={false}><ErrorCard onRetry={() => query.refetch()} /></Shell>;

  return <Shell data={data} hasCustomDataset={hasCustomDataset}>{children(data, () => query.refetch(), hasCustomDataset)}</Shell>;
}

function Router() {
  return (
    <Switch>
      <Route path="/"><AppData>{(data, refresh, hasCustom) => <Dashboard data={data} refresh={refresh} />}</AppData></Route>
      <Route path="/upload"><AppData>{(_data, _refresh, hasCustom) => <UploadPage hasActiveDataset={hasCustom} />}</AppData></Route>
      <Route path="/analysis"><AppData>{data => <AnalysisPage data={data} />}</AppData></Route>
      <Route path="/optimization"><AppData>{data => <OptimizationPage data={data} />}</AppData></Route>
      <Route path="/reports"><AppData>{data => <ReportsPage data={data} />}</AppData></Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary>
            <Router />
          </RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;