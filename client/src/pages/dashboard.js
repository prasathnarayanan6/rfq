import { createPortal } from 'react-dom';
import { ArrowRight, BadgeCheck, Building2, Check, FileText, GitCompareArrows, Inbox, Layers3, Mail, MessageCircle, PhoneCall, Plus, Radio, RefreshCw, Send, ShieldCheck, Sparkles, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiError, listOutreachRequests, listQuotes, listVendors, queueOutreach } from '../API/vendorAPI';
import { Checkbox, TextField } from '@mui/material';

const shortId = (id = '') => String(id).split('-')[0].toUpperCase();
const formatMoney = (amount, currency = 'INR') => amount === null || amount === undefined || amount === '' ? 'Not specified'
  : new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency || 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(Number(amount));

function OutreachModal({ compose, form, errors, submitting, onChange, onToggle, onClose, onSubmit }) {
  if (!compose) return null;
  const isWhatsApp = compose.channel === 'whatsapp';
  const ChannelIcon = isWhatsApp ? MessageCircle : Mail;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="outreach-dialog-title" className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-50 shadow-[0_32px_90px_-28px_rgba(15,23,42,.7)] sm:max-h-[92vh] sm:max-w-3xl sm:rounded-[2rem]">
        <header className="relative shrink-0 overflow-hidden bg-[#111827] px-5 py-5 text-white sm:px-7 sm:py-6">
          <div className={`pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full blur-3xl ${isWhatsApp ? 'bg-emerald-500/20' : 'bg-blue-500/20'}`} />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-start gap-4"><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 ${isWhatsApp ? 'text-emerald-300' : 'text-blue-300'}`}><ChannelIcon size={21} /></span><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-slate-400">Request {shortId(compose.request.id)}</p><h2 id="outreach-dialog-title" className="mt-1 text-2xl font-semibold">Queue {isWhatsApp ? 'WhatsApp' : 'email'} outreach</h2><p className="mt-1 text-sm leading-5 text-slate-300">Prepare a quotation request for vendors linked to this sourcing requirement.</p></div></div>
            <button type="button" onClick={onClose} className="focus-ring rounded-xl border border-white/10 bg-white/[.07] p-2.5 text-slate-300 hover:bg-white/15 hover:text-white" aria-label="Close"><X size={19} /></button>
          </div>
        </header>
        <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand-600">Requirement</p><p className="mt-2 text-sm leading-6 text-slate-700">{compose.request.requirements}</p></div>
            <fieldset><div className="flex items-center justify-between gap-3"><legend className="text-sm font-semibold text-slate-800">Recipients</legend><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{form.vendorIds.length} selected</span></div><p className="mt-1 text-xs text-slate-500">Only vendors with a configured {isWhatsApp ? 'WhatsApp number' : 'email address'} are available.</p>
              <div className={`mt-3 grid gap-2 rounded-2xl border p-2 sm:grid-cols-2 ${errors.vendorIds ? 'border-red-300 bg-red-50/40' : 'border-slate-200 bg-slate-100/70'}`}>{compose.eligible.map((vendor) => { const selected = form.vendorIds.includes(String(vendor.id)); return <label key={vendor.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 transition ${selected ? 'border-brand-200 bg-white shadow-sm' : 'border-transparent hover:bg-white'}`}><Checkbox checked={selected} onChange={() => onToggle(String(vendor.id))} size="small" slotProps={{ input: { 'aria-label': `Select ${vendor.name}` } }} /><span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold ${selected ? 'bg-brand-50 text-brand-700' : 'bg-white text-slate-500'}`}>{vendor.name?.[0]}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-slate-800">{vendor.name}</span><span className="block truncate text-[11px] text-slate-500">{isWhatsApp ? vendor.whatsapp : vendor.email}</span></span></label>; })}{!compose.eligible.length && <p className="col-span-full py-6 text-center text-sm text-slate-500">No eligible recipients for this channel.</p>}</div>{errors.vendorIds && <p className="mt-1.5 text-xs text-red-600">{errors.vendorIds}</p>}
            </fieldset>
            <TextField
              fullWidth multiline rows={7} label="Message" value={form.message}
              onChange={(event) => onChange(event.target.value)} error={Boolean(errors.message)}
              helperText={errors.message || `${form.message.length}/5000`}
              slotProps={{ htmlInput: { maxLength: 5000 } }}
              sx={{ '& .MuiOutlinedInput-root': { alignItems: 'flex-start' }, '& .MuiFormHelperText-root': { textAlign: errors.message ? 'left' : 'right' } }}
            />
          </div>
          <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="text-emerald-600" /> Stored first, then delivered when provider credentials are ready.</div><div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={onClose} className="secondary-button">Cancel</button><button type="submit" disabled={submitting || !compose.eligible.length} className="primary-button min-w-[11.5rem]"><Send size={15} /> {submitting ? 'Queuing…' : `Queue ${isWhatsApp ? 'WhatsApp' : 'Email'}`}</button></div></footer>
        </form>
      </div>
    </div>, document.body,
  );
}

function Dashboard() {
  const [vendors, setVendors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState('');
  const [activityError, setActivityError] = useState('');
  const [notice, setNotice] = useState(null);
  const [compose, setCompose] = useState(null);
  const [outreachForm, setOutreachForm] = useState({ vendorIds: [], message: '' });
  const [outreachErrors, setOutreachErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    Promise.allSettled([listVendors(), listOutreachRequests(), listQuotes()]).then(([vendorResult, requestResult, quoteResult]) => {
      if (!active) return;
      if (vendorResult.status === 'fulfilled') setVendors(vendorResult.value.data.vendors || []); else setError(apiError(vendorResult.reason, 'Could not load workspace activity'));
      if (requestResult.status === 'fulfilled') setRequests(requestResult.value.data.requests || []); else setActivityError(apiError(requestResult.reason, 'Outreach tracking is unavailable until its database migration is applied.'));
      if (quoteResult.status === 'fulfilled') setQuotes(quoteResult.value.data.quotes || []);
      setLoading(false); setActivityLoading(false);
    });
    return () => { active = false; };
  }, []);

  const categoryCount = useMemo(() => new Set(vendors.map((vendor) => vendor.businessType).filter(Boolean)).size, [vendors]);
  const metrics = [
    { label: 'Total vendors', value: vendors.length, note: 'Across your network', icon: Users, tone: 'bg-red-50 text-brand-600', busy: loading },
    { label: 'Approved', value: vendors.filter((vendor) => vendor.status === 'Approved').length, note: 'Ready for sourcing', icon: BadgeCheck, tone: 'bg-emerald-50 text-emerald-600', busy: loading },
    { label: 'Business types', value: categoryCount, note: 'Supplier categories', icon: Layers3, tone: 'bg-violet-50 text-violet-600', busy: loading },
    { label: 'Sourcing requests', value: requests.length, note: 'Call-linked requirements', icon: FileText, tone: 'bg-blue-50 text-blue-600', busy: activityLoading },
    { label: 'WhatsApp ready', value: vendors.filter((vendor) => vendor.whatsapp).length, note: 'Messaging route available', icon: MessageCircle, tone: 'bg-emerald-50 text-emerald-600', busy: loading },
    { label: 'Quotes received', value: quotes.length, note: 'Ready to compare', icon: GitCompareArrows, tone: 'bg-amber-50 text-amber-600', busy: activityLoading },
  ];
  const recent = vendors.slice(0, 5);

  const openCompose = (request, channel) => {
    const eligible = request.vendors.filter((vendor) => channel === 'whatsapp' ? vendor.whatsapp : vendor.email);
    setCompose({ request, channel, eligible });
    setOutreachForm({ vendorIds: eligible.map((vendor) => String(vendor.id)), message: `Please provide a quotation for the following requirement: ${request.requirements}\n\nInclude pricing, availability, delivery timeline, taxes, and payment terms.\nReference: ${request.id}` });
    setOutreachErrors({});
  };
  const toggleRecipient = (vendorId) => { setOutreachForm((current) => ({ ...current, vendorIds: current.vendorIds.includes(vendorId) ? current.vendorIds.filter((id) => id !== vendorId) : [...current.vendorIds, vendorId] })); setOutreachErrors((current) => ({ ...current, vendorIds: undefined })); };
  const submitOutreach = async (event) => {
    event.preventDefault();
    const errors = {};
    if (!outreachForm.vendorIds.length) errors.vendorIds = 'Choose at least one vendor';
    if (outreachForm.message.trim().length < 10) errors.message = 'Write a useful message of at least 10 characters';
    if (Object.keys(errors).length) return setOutreachErrors(errors);
    setSubmitting(true);
    try {
      const { data } = await queueOutreach(compose.request.id, { channel: compose.channel, ...outreachForm });
      const countKey = compose.channel === 'whatsapp' ? 'whatsappCount' : 'emailCount';
      setRequests((current) => current.map((request) => request.id === compose.request.id ? { ...request, [countKey]: Number(request[countKey] || 0) + data.messages.length } : request));
      const sentCount = data.messages.filter((message) => message.status === 'Sent').length;
      const failedCount = data.messages.filter((message) => message.status === 'Failed').length;
      const providerName = compose.channel === 'whatsapp' ? 'WhatsApp' : 'SMTP';
      const message = !data.providerReady
        ? `${data.messages.length} message(s) saved. They will deliver after ${providerName} credentials are connected.`
        : failedCount
          ? `${failedCount} message(s) could not be delivered. Check the ${providerName} credentials and try again.`
          : sentCount
            ? `${sentCount} email message(s) sent successfully.`
            : `${data.messages.length} message(s) queued for delivery.`;
      setNotice({ type: failedCount ? 'error' : 'success', message });
      setCompose(null);
    } catch (requestError) { setNotice({ type: 'error', message: apiError(requestError, 'Could not queue outreach') }); }
    finally { setSubmitting(false); }
  };

  return (
    <section className="space-y-6 animate-fade-up">
      {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}><span className="flex items-center gap-2">{notice.type === 'success' && <Check size={16} />}{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button></div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">{metrics.map(({ label, value, note, icon: Icon, tone, busy }) => <article key={label} className="surface-card group p-5 transition duration-300 hover:-translate-y-1 hover:shadow-soft"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-500">{label}</p>{busy ? <div className="mt-3 h-9 w-16 animate-pulse rounded-lg bg-slate-100" /> : <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>}</div><div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></div></div><p className="mt-4 text-xs text-slate-400">{note}</p></article>)}</div>

      <article className="surface-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><h2 className="font-semibold text-slate-900">Sourcing request ledger</h2><span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700">Request ID</span></div><p className="mt-1 text-xs text-slate-500">Every call request becomes the shared record for voice, WhatsApp, email, and quotations.</p></div><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500"><Radio size={14} className="text-emerald-600" /> Reply monitor ready · providers pending</div></div>
        {activityError && <div className="m-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 sm:m-6">{activityError}</div>}
        <div className="overflow-x-auto"><table className="w-full min-w-[1040px]"><thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Request', 'Requirement', 'Vendors', 'Activity', 'Quotes', 'Outreach'].map((heading) => <th key={heading} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-slate-500 first:pl-6 last:pr-6">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{activityLoading && [...Array(3)].map((_, index) => <tr key={index} className="animate-pulse">{[...Array(6)].map((__, cell) => <td key={cell} className="px-5 py-5"><div className="h-3 w-24 rounded bg-slate-100" /></td>)}</tr>)}{!activityLoading && requests.map((request) => <RequestRow key={request.id} request={request} onCompose={openCompose} />)}</tbody></table>{!activityLoading && !requests.length && !activityError && <div className="px-6 py-14 text-center"><Inbox size={28} className="mx-auto text-slate-300" /><h3 className="mt-3 font-semibold text-slate-800">No sourcing requests yet</h3><p className="mt-1 text-sm text-slate-500">Create a vendor call to generate a request ID and begin outreach.</p><button type="button" onClick={() => navigate('/vendor-list')} className="primary-button mt-5"><PhoneCall size={16} /> Create a vendor call</button></div>}</div>
      </article>

      <article className="surface-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><div className="flex items-center gap-2"><GitCompareArrows size={18} className="text-brand-600" /><h2 className="font-semibold text-slate-900">Quotation comparison</h2></div><p className="mt-1 text-xs text-slate-500">Structured quotes detected by the WhatsApp and email monitoring agents.</p></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">{quotes.length} quote{quotes.length === 1 ? '' : 's'}</span></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px]"><thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Vendor', 'Request', 'Channel', 'Quoted total', 'Delivery', 'Payment terms', 'Status'].map((heading) => <th key={heading} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-slate-500 first:pl-6 last:pr-6">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{quotes.map((quote) => <QuoteRow key={quote.id} quote={quote} />)}</tbody></table>{!activityLoading && !quotes.length && <div className="px-6 py-14 text-center"><GitCompareArrows size={30} className="mx-auto text-slate-300" /><h3 className="mt-3 font-semibold text-slate-800">Quotes will appear here automatically</h3><p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-slate-500">When the WhatsApp or email agent recognizes pricing in a vendor reply, it creates a comparison row linked to the request ID.</p></div>}</div>
      </article>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><RecentVendors vendors={recent} loading={loading} onViewAll={() => navigate('/vendor-list')} /><div className="space-y-6"><article className="relative overflow-hidden rounded-2xl bg-[#17202e] p-6 text-white shadow-soft"><div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-brand-600/25 blur-2xl" /><div className="relative"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10"><Sparkles size={21} className="text-red-300" /></div><h2 className="mt-5 text-xl font-semibold">Provider-ready outreach</h2><p className="mt-2 text-sm leading-6 text-slate-300">Requests and replies are stored now. Add WhatsApp and SMTP credentials later to activate delivery and monitoring.</p><div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><RefreshCw size={14} /> Queue remains safe until connected</div></div></article><article className="surface-card p-5"><p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400">Quick action</p><button type="button" onClick={() => navigate('/vendor-list')} className="focus-ring mt-3 flex w-full items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4 text-left hover:border-brand-300 hover:bg-brand-50"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white"><Plus size={19} /></span><span><span className="block text-sm font-semibold text-slate-800">Start a request</span><span className="mt-0.5 block text-xs text-slate-500">Create a call and outreach brief</span></span></button></article></div></div>

      <OutreachModal compose={compose} form={outreachForm} errors={outreachErrors} submitting={submitting} onChange={(message) => { setOutreachForm((current) => ({ ...current, message })); setOutreachErrors((current) => ({ ...current, message: undefined })); }} onToggle={toggleRecipient} onClose={() => { if (!submitting) setCompose(null); }} onSubmit={submitOutreach} />
    </section>
  );
}

function RequestRow({ request, onCompose }) {
  const whatsappEligible = request.vendors.some((vendor) => vendor.whatsapp);
  const emailEligible = request.vendors.some((vendor) => vendor.email);
  return <tr className="transition hover:bg-slate-50/70"><td className="py-4 pl-6 pr-5"><span className="rounded-lg bg-slate-900 px-2.5 py-1.5 font-mono text-xs font-semibold text-white" title={request.id}>{shortId(request.id)}</span><p className="mt-2 text-[10px] text-slate-400">{new Date(request.createdAt).toLocaleDateString()}</p></td><td className="max-w-sm px-5 py-4"><p className="truncate text-sm font-semibold text-slate-800">{request.businessType}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{request.requirements}</p></td><td className="px-5 py-4 text-sm text-slate-600"><span className="inline-flex items-center gap-1.5"><Users size={14} /> {request.vendors.length}</span></td><td className="px-5 py-4"><div className="flex gap-2"><span className="rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-700">WA {request.whatsappCount || 0}</span><span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700">Mail {request.emailCount || 0}</span></div></td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.quoteCount ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>{request.quoteCount || 0} received</span></td><td className="py-4 pl-5 pr-6"><div className="flex gap-2"><button type="button" disabled={!whatsappEligible} onClick={() => onCompose(request, 'whatsapp')} className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40" title={!whatsappEligible ? 'No selected vendor has a WhatsApp number' : undefined}><MessageCircle size={14} /> WhatsApp</button><button type="button" disabled={!emailEligible} onClick={() => onCompose(request, 'email')} className="focus-ring inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-40" title={!emailEligible ? 'No selected vendor has an email address' : undefined}><Mail size={14} /> Email</button></div></td></tr>;
}

function QuoteRow({ quote }) {
  return <tr className="hover:bg-slate-50/70"><td className="py-4 pl-6 pr-5"><p className="text-sm font-semibold text-slate-800">{quote.vendorName}</p><p className="mt-0.5 text-xs text-slate-500">{quote.detectedLanguage || quote.businessType}</p></td><td className="px-5 py-4"><span className="font-mono text-xs font-semibold text-slate-600">{shortId(quote.requestId)}</span></td><td className="px-5 py-4"><span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${quote.channel === 'whatsapp' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{quote.channel === 'whatsapp' ? <MessageCircle size={12} /> : <Mail size={12} />}{quote.channel}</span></td><td className="px-5 py-4 text-sm font-semibold text-slate-900">{formatMoney(quote.totalAmount, quote.currency)}</td><td className="px-5 py-4 text-sm text-slate-600">{quote.deliveryDays ? `${quote.deliveryDays} days` : 'Not specified'}</td><td className="max-w-xs truncate px-5 py-4 text-sm text-slate-600" title={quote.englishSummary || quote.paymentTerms || quote.rawText}>{quote.paymentTerms || quote.englishSummary || 'See original reply'}</td><td className="py-4 pl-5 pr-6"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quote.needsReview ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'}`}>{quote.needsReview ? 'Needs review' : quote.status}</span></td></tr>;
}

function RecentVendors({ vendors, loading, onViewAll }) {
  return <article className="surface-card overflow-hidden"><div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6"><div><h2 className="font-semibold text-slate-900">Recently added vendors</h2><p className="mt-1 text-xs text-slate-500">The latest suppliers in your workspace</p></div><button type="button" onClick={onViewAll} className="focus-ring inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-brand-600 hover:bg-brand-50">View all <ArrowRight size={15} /></button></div><div className="divide-y divide-slate-100">{loading && [...Array(3)].map((_, index) => <div key={index} className="flex animate-pulse items-center gap-4 px-5 py-4 sm:px-6"><div className="h-10 w-10 rounded-xl bg-slate-100" /><div className="h-3 w-32 rounded bg-slate-100" /></div>)}{!loading && vendors.map((vendor) => <div key={vendor.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 sm:px-6"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 font-semibold text-slate-600">{vendor.name?.[0]?.toUpperCase() || 'V'}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800">{vendor.name}</p><p className="mt-0.5 truncate text-xs text-slate-500">{vendor.businessType}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${vendor.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{vendor.status}</span></div>)}{!loading && !vendors.length && <div className="px-6 py-10 text-center"><Building2 size={27} className="mx-auto text-slate-300" /><p className="mt-3 text-sm text-slate-500">No vendors yet</p></div>}</div></article>;
}

export default Dashboard;
