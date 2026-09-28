import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Bot, Building2, Check, Clock3, Download, FileSpreadsheet, Mail, MapPin, MessageSquareText, Phone, PhoneCall, Plus, Search, ShieldCheck, Sparkles, Upload, UploadCloud, UserPlus, Users, Wand2, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiError, initiateVendorCall, listVendors, prepareVendors, saveVendors } from '../API/vendorAPI';
import { rowsFromFile, validateVendor } from './vendorImport';

const emptyVendor = { name: '', businessType: '', contact: '', phone: '', whatsapp: '', email: '', location: '', status: 'Pending' };
const fields = [
  { name: 'name', label: 'Vendor name', placeholder: 'e.g. Bright Tools', required: true },
  { name: 'businessType', label: 'Business type', placeholder: 'e.g. Hardware', required: true },
  { name: 'contact', label: 'Contact person', placeholder: 'Full name' },
  { name: 'phone', label: 'Contact number', placeholder: '+91 98765 43210', type: 'tel' },
  { name: 'whatsapp', label: 'WhatsApp number', placeholder: '+91 98765 43210', type: 'tel' },
  { name: 'email', label: 'Email address', placeholder: 'sales@vendor.com', type: 'email' },
  { name: 'location', label: 'Location', placeholder: 'City or address' },
];
const briefPrompts = [
  { label: 'Pricing & MOQ', text: 'Discuss unit pricing, volume discounts, and minimum order quantity.' },
  { label: 'Delivery timeline', text: 'Confirm stock availability, dispatch time, and expected delivery schedule.' },
  { label: 'Payment terms', text: 'Ask about payment terms, credit period, and accepted payment methods.' },
];

function FormField({ field, value, error, onChange, compact = false }) {
  return (
    <label className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-slate-700`}>
      {field.label} {field.required && <span className="text-brand-600">*</span>}
      <input
        type={field.type || 'text'} value={value ?? ''} placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
        className={`field-control ${compact ? 'py-2 text-sm' : ''} ${error ? 'border-red-300 bg-red-50/40 focus:border-red-400 focus:ring-red-300' : ''}`}
      />
      {error && <span className="mt-1 block text-xs font-medium text-red-600">{error}</span>}
    </label>
  );
}

function ModalShell({ title, description, onClose, children, wide = true }) {
  return createPortal(
    <div role="dialog" aria-modal="true" aria-labelledby="vendor-dialog-title" className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className={`max-h-[94vh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl ${wide ? 'sm:max-w-4xl' : 'sm:max-w-2xl'}`}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-5 py-5 backdrop-blur sm:px-6">
          <div>
            <h2 id="vendor-dialog-title" className="text-xl font-semibold tracking-tight text-ink">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-500">{description}</p>
          </div>
          <button type="button" onClick={onClose} className="focus-ring shrink-0 rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800" aria-label="Close">
            <X size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function CallModalShell({ onClose, children }) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="call-dialog-title"
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-50 shadow-[0_32px_90px_-28px_rgba(15,23,42,.7)] sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[2rem]">
        <header className="relative shrink-0 overflow-hidden bg-[#111827] px-5 pb-6 pt-5 text-white sm:px-7 sm:pb-7 sm:pt-6">
          <div className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-orange-400/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-red-300 shadow-inner sm:flex">
                <PhoneCall size={23} />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[.07] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.14em] text-red-200">
                  <Sparkles size={11} /> AI voice outreach
                </span>
                <h2 id="call-dialog-title" className="mt-3 text-2xl font-semibold tracking-tight sm:text-[1.7rem]">Create a vendor call</h2>
                <p className="mt-1.5 max-w-2xl text-sm leading-5 text-slate-300">Choose who the agent should contact and give it a clear, focused conversation objective.</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="focus-ring shrink-0 rounded-xl border border-white/10 bg-white/[.07] p-2.5 text-slate-300 transition hover:bg-white/15 hover:text-white" aria-label="Close">
              <X size={19} />
            </button>
          </div>
          <div className="relative mt-5 flex items-center gap-3 text-xs text-slate-400 sm:ml-16">
            <span className="flex items-center gap-1.5 text-white"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold">1</span> Audience</span>
            <span className="h-px w-7 bg-white/15" />
            <span className="flex items-center gap-1.5 text-white"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold">2</span> Brief</span>
            <span className="h-px w-7 bg-white/15" />
            <span className="flex items-center gap-1.5"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold">3</span> Queue</span>
          </div>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function ActionModalShell({ eyebrow, title, description, icon: Icon, onClose, children, wide = true }) {
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="action-dialog-title"
      className="modal-backdrop fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className={`flex max-h-[96vh] w-full flex-col overflow-hidden rounded-t-[2rem] border border-white/10 bg-slate-50 shadow-[0_32px_90px_-28px_rgba(15,23,42,.7)] sm:max-h-[92vh] sm:rounded-[2rem] ${wide ? 'sm:max-w-4xl' : 'sm:max-w-3xl'}`}>
        <header className="relative shrink-0 overflow-hidden bg-[#111827] px-5 pb-6 pt-5 text-white sm:px-7 sm:py-6">
          <div className="pointer-events-none absolute -right-16 -top-28 h-64 w-64 rounded-full bg-brand-600/25 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/4 h-52 w-52 rounded-full bg-orange-400/10 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-red-200 shadow-inner sm:h-12 sm:w-12">
                <Icon size={22} />
              </span>
              <div>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[.16em] text-red-200"><Sparkles size={11} /> {eyebrow}</span>
                <h2 id="action-dialog-title" className="mt-1.5 text-2xl font-semibold tracking-tight">{title}</h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-slate-300">{description}</p>
              </div>
            </div>
            <button type="button" onClick={onClose} className="focus-ring shrink-0 rounded-xl border border-white/10 bg-white/[.07] p-2.5 text-slate-300 transition hover:bg-white/15 hover:text-white" aria-label="Close">
              <X size={19} />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>,
    document.body,
  );
}

function StatusBadge({ status }) {
  const approved = status === 'Approved';
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${approved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><span className={`h-1.5 w-1.5 rounded-full ${approved ? 'bg-emerald-500' : 'bg-amber-500'}`} />{status}</span>;
}

function VendorList() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [category, setCategory] = useState('All Vendors');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [newVendor, setNewVendor] = useState(emptyVendor);
  const [errors, setErrors] = useState({});
  const [pasteText, setPasteText] = useState('');
  const [drafts, setDrafts] = useState([]);
  const [notice, setNotice] = useState(null);
  const [callForm, setCallForm] = useState({ businessType: '', vendorIds: [], conversationBrief: '' });
  const [callErrors, setCallErrors] = useState({});
  const [callSubmitting, setCallSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    listVendors().then(({ data }) => { if (active) setVendors(data.vendors || []); })
      .catch((error) => { if (active) setNotice({ type: 'error', message: apiError(error, 'Could not load vendors') }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!modal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [modal]);

  const categories = useMemo(() => ['All Vendors', ...new Set(vendors.map((vendor) => vendor.businessType).filter(Boolean))], [vendors]);
  const callableVendors = useMemo(() => vendors.filter((vendor) => String(vendor.phone || '').trim()), [vendors]);
  const callableBusinessTypes = useMemo(() => [...new Set(callableVendors.map((vendor) => vendor.businessType).filter(Boolean))], [callableVendors]);
  const callVendors = callableVendors.filter((vendor) => vendor.businessType === callForm.businessType);
  const selectedCallVendors = callVendors.filter((vendor) => callForm.vendorIds.includes(String(vendor.id)));
  const normalizedSearch = search.trim().toLowerCase();
  const visible = vendors.filter((vendor) => (category === 'All Vendors' || vendor.businessType === category)
    && [vendor.name, vendor.businessType, vendor.contact, vendor.phone, vendor.whatsapp, vendor.email, vendor.location]
      .join(' ').toLowerCase().includes(normalizedSearch));

  const openModal = (type) => { setNotice(null); setModal(type); };
  const closeModal = () => {
    if (saving || preparing || callSubmitting) return;
    setModal(null); setNewVendor(emptyVendor); setErrors({}); setDrafts([]); setPasteText('');
    setCallForm({ businessType: '', vendorIds: [], conversationBrief: '' }); setCallErrors({});
  };

  const addVendor = async (event) => {
    event.preventDefault();
    const nextErrors = validateVendor(newVendor);
    if (Object.keys(nextErrors).length) return setErrors(nextErrors);
    setSaving(true);
    try {
      const { data } = await saveVendors([newVendor]);
      setVendors((current) => [...data.vendors, ...current]);
      setCategory('All Vendors');
      setNotice({ type: 'success', message: `${newVendor.name} was added successfully.` });
      setSaving(false); closeModal();
    } catch (error) {
      setNotice({ type: 'error', message: apiError(error, 'Could not save vendor') }); setSaving(false);
    }
  };

  const prepare = async (source) => {
    setPreparing(true);
    try {
      const { data } = await prepareVendors(source);
      setDrafts(data.drafts.map((draft) => ({ ...draft, selected: !draft.duplicate, duplicateChoice: draft.duplicate ? 'review' : 'keep' })));
      setModal('review'); setNotice(null);
    } catch (error) {
      setNotice({ type: 'error', message: apiError(error, 'Could not organize vendor list') });
    } finally { setPreparing(false); }
  };

  const uploadFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = await rowsFromFile(file);
      if (!rows.length) throw new Error('This file has no vendor rows');
      await prepare({ rows });
    } catch (error) { setNotice({ type: 'error', message: error.message || 'Could not read file' }); }
    finally { event.target.value = ''; }
  };

  const changeDraft = (index, change) => setDrafts((current) => current.map((draft, position) => position === index ? { ...draft, ...change } : draft));
  const saveSelected = async () => {
    const selected = drafts.filter((draft) => draft.selected && draft.duplicateChoice === 'keep');
    if (!selected.length) return setNotice({ type: 'error', message: 'Select at least one vendor to save.' });
    const invalid = selected.filter((draft) => Object.keys(validateVendor(draft.vendor)).length);
    if (invalid.length) return setNotice({ type: 'error', message: `Fix mandatory or invalid details in ${invalid.length} selected row(s).` });
    setSaving(true);
    try {
      const { data } = await saveVendors(selected.map((draft) => ({ ...draft.vendor, status: 'Pending' })));
      setVendors((current) => [...data.vendors, ...current]); setCategory('All Vendors');
      setNotice({ type: 'success', message: `${data.vendors.length} vendor(s) saved to your catalog.` });
      setSaving(false); closeModal();
    } catch (error) { setNotice({ type: 'error', message: apiError(error, 'Could not save vendors') }); setSaving(false); }
  };

  const downloadTemplate = () => {
    const sheet = XLSX.utils.json_to_sheet([{ 'Vendor Name': 'Example Supplies Pvt. Ltd.', 'Business Type': 'Office Supplies',
      'Contact Person': '', 'Contact Number': '+91 98765 43210', 'WhatsApp Number': '+91 98765 43210', Email: '', Location: '' }]);
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Vendors');
    XLSX.writeFile(book, 'vendor-import-template.xlsx');
  };

  const openCallModal = () => {
    const businessType = category !== 'All Vendors' && callableBusinessTypes.includes(category) ? category : callableBusinessTypes[0] || '';
    setCallForm({ businessType, vendorIds: callableVendors.filter((vendor) => vendor.businessType === businessType).map((vendor) => String(vendor.id)), conversationBrief: '' });
    setCallErrors({}); setNotice(null); setModal('call');
  };
  const changeCallBusinessType = (businessType) => {
    setCallForm((current) => ({ ...current, businessType, vendorIds: callableVendors.filter((vendor) => vendor.businessType === businessType).map((vendor) => String(vendor.id)) }));
    setCallErrors((current) => ({ ...current, businessType: undefined, vendorIds: undefined }));
  };
  const toggleCallVendor = (vendorId) => {
    setCallForm((current) => ({ ...current, vendorIds: current.vendorIds.includes(vendorId) ? current.vendorIds.filter((id) => id !== vendorId) : [...current.vendorIds, vendorId] }));
    setCallErrors((current) => ({ ...current, vendorIds: undefined }));
  };
  const addBriefPrompt = (text) => {
    setCallForm((current) => ({
      ...current,
      conversationBrief: current.conversationBrief.trim() ? `${current.conversationBrief.trim()} ${text}` : text,
    }));
    setCallErrors((current) => ({ ...current, conversationBrief: undefined }));
  };
  const startCallProcess = async (event) => {
    event.preventDefault();
    const nextErrors = {};
    if (!callForm.businessType) nextErrors.businessType = 'Choose a business type';
    if (!callForm.vendorIds.length) nextErrors.vendorIds = 'Choose at least one vendor with a contact number';
    if (callForm.conversationBrief.trim().length < 10) nextErrors.conversationBrief = 'Describe the conversation in at least 10 characters';
    if (Object.keys(nextErrors).length) return setCallErrors(nextErrors);
    setCallSubmitting(true);
    try {
      const { data } = await initiateVendorCall(callForm);
      const count = data.callRequest.vendors.length;
      setCallSubmitting(false); closeModal();
      setNotice({ type: 'success', message: `Call process ${data.callRequest.id} queued for ${count} vendor(s).` });
    } catch (error) {
      setNotice({ type: 'error', message: apiError(error, 'The call process could not be initiated') }); setCallSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 animate-fade-up">
      <div className="surface-card overflow-hidden">
        <div className="flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 sm:flex"><Building2 size={23} /></div>
            <div>
              <h2 className="text-lg font-semibold text-ink">Build your vendor network</h2>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">Add suppliers one by one, import a spreadsheet, or prepare a focused outreach call for vendors with contact numbers.</p>
              <button type="button" onClick={downloadTemplate} className="focus-ring mt-2 inline-flex items-center gap-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-brand-600"><Download size={14} /> Download import template</button>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button type="button" onClick={openCallModal} disabled={!callableVendors.length} title={!callableVendors.length ? 'Add a contact number to a vendor first' : undefined} className="secondary-button"><PhoneCall size={17} /> Create a Call</button>
            <button type="button" onClick={() => openModal('import')} className="secondary-button"><Upload size={17} /> Bulk import</button>
            <button type="button" onClick={() => openModal('create')} className="primary-button"><Plus size={17} /> Add Vendor</button>
          </div>
        </div>
      </div>

      {notice && <div role="status" className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3.5 text-sm shadow-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
        <span className="flex items-center gap-2">{notice.type === 'success' && <Check size={16} className="shrink-0" />}{notice.message}</span>
        <button type="button" onClick={() => setNotice(null)} className="focus-ring rounded p-0.5" aria-label="Dismiss message"><X size={16} /></button>
      </div>}

      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
        <div className="flex min-w-max gap-2">
          {categories.map((item) => {
            const count = item === 'All Vendors' ? vendors.length : vendors.filter((vendor) => vendor.businessType === item).length;
            return <button key={item} type="button" onClick={() => setCategory(item)} className={`focus-ring rounded-full border px-4 py-2 text-sm font-medium transition ${category === item ? 'border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-300' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}>{item}<span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] ${category === item ? 'bg-white/15 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span></button>;
          })}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold text-ink">{category}</h2>
            <p className="mt-1 text-xs text-slate-500">{loading ? 'Loading your vendor network…' : `${visible.length} ${visible.length === 1 ? 'vendor' : 'vendors'} found`}</p>
          </div>
          <label className="relative w-full sm:w-72"><span className="sr-only">Search vendors</span><Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendors…" className="focus-ring w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:bg-white" /></label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full">
            <thead><tr className="border-b border-slate-100 bg-slate-50/80">{['Vendor', 'Business Type', 'Contact Person', 'Contact Number', 'WhatsApp', 'Email', 'Location', 'Status'].map((heading) => <th key={heading} className="px-5 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[.08em] text-slate-500 first:sticky first:left-0 first:z-[1] first:bg-slate-50 sm:px-6">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">
              {loading && [...Array(4)].map((_, index) => <tr key={index} className="animate-pulse">{[...Array(8)].map((__, cell) => <td key={cell} className="px-5 py-5 sm:px-6"><div className="h-3 w-24 rounded bg-slate-100" /></td>)}</tr>)}
              {!loading && visible.map((vendor) => (
                <tr key={vendor.id} className="group transition hover:bg-slate-50/80">
                  <td className="sticky left-0 z-[1] bg-white px-5 py-4 group-hover:bg-slate-50 sm:px-6"><div className="flex items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-bold text-slate-600">{vendor.name?.[0]?.toUpperCase() || 'V'}</div><span className="max-w-48 truncate text-sm font-semibold text-slate-800">{vendor.name}</span></div></td>
                  <td className="px-5 py-4 text-sm text-slate-600 sm:px-6"><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium">{vendor.businessType}</span></td>
                  <td className="px-5 py-4 text-sm text-slate-600 sm:px-6">{vendor.contact || <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-4 text-sm sm:px-6">{vendor.phone ? <a className="font-medium text-slate-700 hover:text-brand-600" href={`tel:${vendor.phone.replace(/[^+\d]/g, '')}`} aria-label={`Call ${vendor.contact || vendor.name} at ${vendor.phone}`}>{vendor.phone}</a> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-4 text-sm sm:px-6">{vendor.whatsapp ? <a className="font-medium text-emerald-600 hover:text-emerald-700" href={`https://wa.me/${vendor.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label={`Message ${vendor.contact || vendor.name} on WhatsApp`}>{vendor.whatsapp}</a> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-4 text-sm sm:px-6">{vendor.email ? <a className="text-slate-600 hover:text-brand-600" href={`mailto:${vendor.email}`}>{vendor.email}</a> : <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-4 text-sm text-slate-600 sm:px-6">{vendor.location || <span className="text-slate-300">—</span>}</td>
                  <td className="px-5 py-4 sm:px-6"><StatusBadge status={vendor.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && !visible.length && <div className="px-6 py-16 text-center"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Users size={25} /></div><h3 className="mt-4 font-semibold text-slate-800">No vendors found</h3><p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{search ? 'Try a different search term or business type.' : 'Add a vendor or import a list to start building your network.'}</p>{!search && <button type="button" onClick={() => openModal('create')} className="primary-button mt-5"><Plus size={16} /> Add your first vendor</button>}</div>}
        </div>
      </div>

      {modal === 'create' && <ActionModalShell eyebrow="Supplier onboarding" title="Add a new vendor" description="Build a complete supplier profile with the details your team needs for sourcing and outreach." icon={UserPlus} onClose={closeModal}>
        <form onSubmit={addVendor} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3">
              <ShieldCheck size={18} className="mt-0.5 shrink-0 text-blue-600" />
              <div><p className="text-sm font-semibold text-blue-950">Create a reliable vendor record</p><p className="mt-0.5 text-xs leading-5 text-blue-700">Vendor name, business type, and at least one contact route are required. You can complete the rest later.</p></div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[.9fr_1.1fr]">
              <div className="space-y-4">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Building2 size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand-600">Company profile</p><h3 className="font-semibold text-slate-900">Vendor identity</h3></div></div>
                  <div className="space-y-4">
                    {fields.filter((field) => ['name', 'businessType'].includes(field.name)).map((field) => <FormField key={field.name} field={field} value={newVendor[field.name]} error={errors[field.name]} onChange={(value) => { setNewVendor((current) => ({ ...current, [field.name]: value })); setErrors((current) => ({ ...current, [field.name]: undefined })); }} />)}
                    <label className="block text-sm font-medium text-slate-700">Approval status<select value={newVendor.status} onChange={(event) => setNewVendor((current) => ({ ...current, status: event.target.value }))} className="field-control"><option>Pending</option><option>Approved</option></select><span className="mt-1.5 block text-xs font-normal text-slate-400">Use Pending when the supplier still needs verification.</span></label>
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><MapPin size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-amber-600">Optional</p><h3 className="font-semibold text-slate-900">Location</h3></div></div>
                  {fields.filter((field) => field.name === 'location').map((field) => <FormField key={field.name} field={field} value={newVendor[field.name]} error={errors[field.name]} onChange={(value) => { setNewVendor((current) => ({ ...current, [field.name]: value })); setErrors((current) => ({ ...current, [field.name]: undefined })); }} />)}
                </section>
              </div>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="mb-5 flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Mail size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-600">Contact channels</p><h3 className="font-semibold text-slate-900">How to reach this vendor</h3></div></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {fields.filter((field) => ['contact', 'phone', 'whatsapp', 'email'].includes(field.name)).map((field) => <FormField key={field.name} field={field} value={newVendor[field.name]} error={errors[field.name]} onChange={(value) => { setNewVendor((current) => ({ ...current, [field.name]: value })); setErrors((current) => ({ ...current, [field.name]: undefined })); }} />)}
                </div>
                <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-700"><Phone size={14} className="text-brand-600" /> Calls use the Contact number</div><p className="mt-1 text-xs leading-5 text-slate-500">WhatsApp is stored separately so messaging and voice outreach always use the correct channel.</p></div>
              </section>
            </div>
          </div>
          <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="shrink-0 text-emerald-600" /> Supplier details remain editable after creation.</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={closeModal} className="secondary-button">Cancel</button><button type="submit" disabled={saving} className="primary-button min-w-[10rem]"><UserPlus size={16} /> {saving ? 'Saving vendor…' : 'Add Vendor'}</button></div>
          </footer>
        </form>
      </ActionModalShell>}

      {modal === 'import' && <ActionModalShell eyebrow="Smart data intake" title="Bulk import vendors" description="Bring in a spreadsheet or paste an unstructured list. Nothing is saved until you review every organized record." icon={UploadCloud} onClose={closeModal}>
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mb-4 grid grid-cols-3 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {[['1', 'Import', Upload], ['2', 'Organize', Wand2], ['3', 'Review', Check]].map(([number, label, Icon], index) => <div key={label} className={`flex items-center justify-center gap-2 px-2 py-3 text-xs font-semibold ${index < 2 ? 'border-r border-slate-100' : ''}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full ${index === 0 ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'}`}>{index === 0 ? number : <Icon size={12} />}</span><span className={index === 0 ? 'text-slate-900' : 'text-slate-500'}>{label}</span></div>)}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><FileSpreadsheet size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-emerald-600">Option 01</p><h3 className="font-semibold text-slate-900">Upload a spreadsheet</h3><p className="mt-1 text-xs leading-5 text-slate-500">Best for structured vendor lists with column headings.</p></div></div>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={uploadFile} aria-label="Upload vendor Excel file" className="sr-only" />
                <button type="button" disabled={preparing} onClick={() => fileInputRef.current?.click()} className="focus-ring group mt-5 flex min-h-[14rem] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 px-6 py-7 transition hover:border-brand-300 hover:bg-brand-50/40">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-brand-600 shadow-card transition group-hover:-translate-y-1"><UploadCloud size={25} /></span>
                  <span className="mt-4 text-sm font-semibold text-slate-800">Choose a file to import</span>
                  <span className="mt-1 text-xs text-slate-500">Excel or CSV · .xlsx, .xls, .csv</span>
                  <span className="mt-4 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">Browse files</span>
                </button>
              </section>

              <section className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><MessageSquareText size={18} /></span><div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600">Option 02</p><h3 className="font-semibold text-slate-900">Paste an unstructured list</h3><p className="mt-1 text-xs leading-5 text-slate-500">Useful for copied emails, notes, or mixed contact details.</p></div></div>
                <label className="mt-5 flex flex-1 flex-col text-xs font-semibold uppercase tracking-[.08em] text-slate-500">Paste vendor data<textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={9} placeholder={'Bright Tools, Hardware, +91 98765 43210\nMetro Papers — Office Supplies — sales@metro.example\n…'} className="focus-ring mt-2 min-h-[14rem] flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-normal leading-6 normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:border-brand-400 focus:bg-white" /><span className="mt-2 text-right text-[10px] font-medium normal-case tracking-normal text-slate-400">{pasteText.length} characters</span></label>
              </section>
            </div>
          </div>
          <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="shrink-0 text-emerald-600" /><span><strong className="font-semibold text-slate-700">Review before saving.</strong> The organizer never adds vendors automatically.</span></div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row"><button type="button" onClick={closeModal} className="secondary-button">Cancel</button><button type="button" disabled={!pasteText.trim() || preparing} onClick={() => prepare({ text: pasteText })} className="primary-button min-w-[12rem]"><Wand2 size={16} /> {preparing ? 'Organizing list…' : 'Organize pasted list'}</button></div>
          </footer>
        </div>
      </ActionModalShell>}

      {modal === 'call' && <CallModalShell onClose={closeModal}>
        <form onSubmit={startCallProcess} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[.92fr_1.08fr]">
              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Users size={18} /></span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-brand-600">Step 01</p>
                    <h3 className="mt-0.5 font-semibold text-slate-900">Choose your audience</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Only vendors with a valid contact number can be selected.</p>
                  </div>
                </div>

                <label className="mt-5 block text-xs font-semibold uppercase tracking-[.08em] text-slate-500">
                  Business type <span className="text-brand-600">*</span>
                  <span className="relative mt-2 block">
                    <Building2 size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <select value={callForm.businessType} onChange={(event) => changeCallBusinessType(event.target.value)} className={`focus-ring w-full appearance-none rounded-xl border bg-slate-50 py-3 pl-10 pr-9 text-sm font-medium text-slate-800 transition focus:bg-white ${callErrors.businessType ? 'border-red-300' : 'border-slate-200 focus:border-brand-400'}`}>
                      <option value="">Choose a business type</option>
                      {callableBusinessTypes.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </span>
                  {callErrors.businessType && <span className="mt-1.5 block text-xs normal-case tracking-normal text-red-600">{callErrors.businessType}</span>}
                </label>

                <fieldset className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <legend className="text-xs font-semibold uppercase tracking-[.08em] text-slate-500">Reachable vendors <span className="text-brand-600">*</span></legend>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{callForm.vendorIds.length} selected</span>
                  </div>
                  <div className={`mt-2.5 max-h-[13rem] space-y-2 overflow-y-auto rounded-2xl border p-2 ${callErrors.vendorIds ? 'border-red-300 bg-red-50/30' : 'border-slate-200 bg-slate-50/80'}`}>
                    {callVendors.map((vendor) => {
                      const selected = callForm.vendorIds.includes(String(vendor.id));
                      return (
                        <label key={vendor.id} className={`group flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all ${selected ? 'border-brand-200 bg-white shadow-sm ring-1 ring-brand-100' : 'border-transparent hover:border-slate-200 hover:bg-white'}`}>
                          <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleCallVendor(String(vendor.id))} />
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition ${selected ? 'bg-brand-600 text-white' : 'bg-white text-slate-500 shadow-sm'}`}>{selected ? <Check size={17} /> : vendor.name?.[0]?.toUpperCase()}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-800">{vendor.name}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500"><Phone size={11} /> {vendor.phone}</span>
                          </span>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${selected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        </label>
                      );
                    })}
                    {!callVendors.length && <div className="py-7 text-center"><Phone size={20} className="mx-auto text-slate-300" /><p className="mt-2 text-sm text-slate-500">No callable vendors in this category.</p></div>}
                  </div>
                  {callErrors.vendorIds && <span className="mt-1.5 block text-xs text-red-600">{callErrors.vendorIds}</span>}
                </fieldset>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><MessageSquareText size={18} /></span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[.14em] text-violet-600">Step 02</p>
                    <h3 className="mt-0.5 font-semibold text-slate-900">Brief the voice agent</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Describe the outcome you want, important questions, and any boundaries.</p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex flex-wrap gap-2">
                    {briefPrompts.map((prompt) => <button key={prompt.label} type="button" onClick={() => addBriefPrompt(prompt.text)} className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-semibold text-slate-600 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"><Plus size={12} /> {prompt.label}</button>)}
                  </div>
                  <label className="block text-xs font-semibold uppercase tracking-[.08em] text-slate-500">
                    Conversation brief <span className="text-brand-600">*</span>
                    <span className="relative mt-2 block">
                      <textarea value={callForm.conversationBrief} onChange={(event) => { setCallForm((current) => ({ ...current, conversationBrief: event.target.value })); setCallErrors((current) => ({ ...current, conversationBrief: undefined })); }} rows={7} maxLength={4000} placeholder="Example: Ask about availability for 500 units, volume pricing, delivery to Chennai, payment terms, and request a written quotation…" className={`focus-ring min-h-[11.5rem] w-full resize-none rounded-2xl border bg-slate-50 px-4 py-3 text-sm font-normal leading-6 normal-case tracking-normal text-slate-800 placeholder:text-slate-400 focus:bg-white ${callErrors.conversationBrief ? 'border-red-300' : 'border-slate-200 focus:border-brand-400'}`} />
                      <span className="absolute bottom-3 right-3 rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 shadow-sm">{callForm.conversationBrief.length}/4000</span>
                    </span>
                    {callErrors.conversationBrief && <span className="mt-1.5 block text-xs normal-case tracking-normal text-red-600">{callErrors.conversationBrief}</span>}
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5"><Users size={14} className="text-brand-600" /><p className="mt-1.5 text-lg font-semibold text-slate-900">{selectedCallVendors.length}</p><p className="text-[10px] text-slate-500">Contacts</p></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5"><Bot size={14} className="text-violet-600" /><p className="mt-1.5 truncate text-sm font-semibold text-slate-900">Voice AI</p><p className="mt-1 text-[10px] text-slate-500">Agent</p></div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2.5"><Clock3 size={14} className="text-blue-600" /><p className="mt-1.5 truncate text-sm font-semibold text-slate-900">Queued</p><p className="mt-1 text-[10px] text-slate-500">Schedule</p></div>
                </div>
              </section>
            </div>
          </div>

          <footer className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={16} className="shrink-0 text-emerald-600" /><span><strong className="font-semibold text-slate-700">Ready to queue.</strong> Review your audience and brief before starting.</span></div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={closeModal} className="secondary-button">Cancel</button>
              <button type="submit" disabled={callSubmitting} className="primary-button min-w-[12.5rem]"><PhoneCall size={16} /> {callSubmitting ? 'Preparing call…' : 'Initiate Call Process'}</button>
            </div>
          </footer>
        </form>
      </CallModalShell>}

      {modal === 'review' && <ModalShell title="Review organized vendors" description="Correct suggestions, resolve any matches, and choose exactly which vendors to save." onClose={closeModal}>
        {notice?.type === 'error' && <p role="alert" className="mx-5 mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">{notice.message}</p>}
        <div className="p-5 sm:p-6"><div className="mb-4 flex items-center justify-between gap-3"><p className="text-sm text-slate-600">{drafts.length} draft row(s) ready for review</p><span className="text-xs text-slate-400">Uncheck any row to skip it</span></div><div className="space-y-4">{drafts.map((draft, index) => {
          const rowErrors = validateVendor(draft.vendor);
          return <article key={draft.draftId + index} className={`rounded-2xl border p-4 transition ${draft.selected ? 'border-slate-200 bg-white shadow-sm' : 'border-slate-200 bg-slate-50 opacity-70'}`}><div className="mb-3 flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-semibold text-slate-800"><input type="checkbox" className="h-4 w-4 rounded accent-[#e30613]" checked={draft.selected} onChange={(event) => changeDraft(index, { selected: event.target.checked })} /> Include row {index + 1}</label>{draft.duplicate && <label className="text-xs font-medium text-amber-700">Possible duplicate <select aria-label={`Resolve duplicate row ${index + 1}`} value={draft.duplicateChoice} onChange={(event) => changeDraft(index, { duplicateChoice: event.target.value, selected: event.target.value === 'keep' })} className="ml-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5"><option value="review">Review</option><option value="keep">Keep anyway</option><option value="skip">Skip</option></select></label>}</div>
            <p className="break-words rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600"><strong className="text-slate-700">Source:</strong> {draft.source}</p>{draft.warnings.map((warning) => <p key={warning} className="mt-2 text-xs font-medium text-amber-700">{warning}</p>)}
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map((field) => <FormField key={field.name} compact field={field} value={draft.vendor[field.name]} error={draft.selected ? rowErrors[field.name] : undefined} onChange={(value) => changeDraft(index, { vendor: { ...draft.vendor, [field.name]: value } })} />)}</div>
          </article>;
        })}</div></div>
        <div className="sticky bottom-0 flex flex-col-reverse gap-2 border-t border-slate-100 bg-white/95 p-4 backdrop-blur sm:flex-row sm:justify-end"><button type="button" onClick={closeModal} className="secondary-button">Cancel</button><button type="button" disabled={saving} onClick={saveSelected} className="primary-button">{saving ? 'Saving vendors…' : 'Save selected vendors'}</button></div>
      </ModalShell>}
    </section>
  );
}

export default VendorList;
