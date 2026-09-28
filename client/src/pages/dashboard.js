import { ArrowRight, BadgeCheck, Building2, Layers3, PhoneCall, Plus, Sparkles, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiError, listVendors } from '../API/vendorAPI';

function Dashboard() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    listVendors().then(({ data }) => { if (active) setVendors(data.vendors || []); })
      .catch((requestError) => { if (active) setError(apiError(requestError, 'Could not load workspace activity')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categoryCount = useMemo(() => new Set(vendors.map((vendor) => vendor.businessType).filter(Boolean)).size, [vendors]);
  const metrics = [
    { label: 'Total vendors', value: vendors.length, note: 'Across your network', icon: Users, tone: 'bg-red-50 text-brand-600' },
    { label: 'Approved', value: vendors.filter((vendor) => vendor.status === 'Approved').length, note: 'Ready for sourcing', icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Business types', value: categoryCount, note: 'Supplier categories', icon: Layers3, tone: 'bg-violet-50 text-violet-600' },
    { label: 'Callable vendors', value: vendors.filter((vendor) => vendor.phone).length, note: 'Contact number available', icon: PhoneCall, tone: 'bg-blue-50 text-blue-600' },
  ];
  const recent = vendors.slice(0, 5);

  return (
    <section className="space-y-6 animate-fade-up">
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon, tone }) => (
          <article key={label} className="surface-card group p-5 transition duration-300 hover:-translate-y-1 hover:shadow-soft">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{label}</p>
                {loading ? <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-slate-100" /> : <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>}
              </div>
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></div>
            </div>
            <p className="mt-4 text-xs text-slate-400">{note}</p>
          </article>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
        <article className="surface-card overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-slate-900">Recently added vendors</h2>
              <p className="mt-1 text-xs text-slate-500">The latest suppliers in your workspace</p>
            </div>
            <button type="button" onClick={() => navigate('/vendor-list')} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">
              View all <ArrowRight size={15} />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {loading && [...Array(4)].map((_, index) => <div key={index} className="flex animate-pulse items-center gap-4 px-5 py-4 sm:px-6"><div className="h-10 w-10 rounded-xl bg-slate-100" /><div className="flex-1"><div className="h-3 w-32 rounded bg-slate-100" /><div className="mt-2 h-2.5 w-20 rounded bg-slate-100" /></div></div>)}
            {!loading && recent.map((vendor) => (
              <div key={vendor.id} className="flex items-center gap-3 px-5 py-4 transition hover:bg-slate-50 sm:px-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-semibold text-slate-600">{vendor.name?.[0]?.toUpperCase() || 'V'}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{vendor.name}</p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">{vendor.businessType}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${vendor.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{vendor.status}</span>
              </div>
            ))}
            {!loading && !recent.length && <div className="px-6 py-12 text-center"><Building2 size={28} className="mx-auto text-slate-300" /><p className="mt-3 text-sm font-medium text-slate-700">No vendors yet</p><p className="mt-1 text-xs text-slate-500">Add your first vendor to start building the network.</p></div>}
          </div>
        </article>

        <div className="space-y-6">
          <article className="relative overflow-hidden rounded-2xl bg-[#17202e] p-6 text-white shadow-soft">
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-600/25 blur-2xl" />
            <div className="relative">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><Sparkles size={21} className="text-red-300" /></div>
              <h2 className="mt-5 text-xl font-semibold">Ready to source smarter?</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">Organize suppliers, select the right contacts, and prepare a focused call brief.</p>
              <button type="button" onClick={() => navigate('/vendor-list')} className="focus-ring mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 transition hover:-translate-y-0.5 hover:bg-red-50">
                Open vendor list <ArrowRight size={16} />
              </button>
            </div>
          </article>

          <article className="surface-card p-5">
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Quick action</p>
            <button type="button" onClick={() => navigate('/vendor-list')} className="focus-ring mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-left transition hover:border-brand-300 hover:bg-brand-50">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Plus size={19} /></span>
              <span><span className="block text-sm font-semibold text-slate-800">Add a vendor</span><span className="mt-0.5 block text-xs text-slate-500">Manual entry or bulk import</span></span>
            </button>
          </article>
        </div>
      </div>
    </section>
  );
}

export default Dashboard;
