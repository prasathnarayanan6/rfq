import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { apiError, listVendors, prepareVendors, saveVendors } from '../API/vendorAPI';
import { rowsFromFile, validateVendor } from './vendorImport';

const emptyVendor = { name: '', businessType: '', contact: '', phone: '', email: '', location: '', status: 'Pending' };
const fields = [
  { name: 'name', label: 'Vendor name', required: true },
  { name: 'businessType', label: 'Business type', required: true },
  { name: 'contact', label: 'Contact person' },
  { name: 'phone', label: 'Phone / WhatsApp number', type: 'tel' },
  { name: 'email', label: 'Email address', type: 'email' },
  { name: 'location', label: 'Location' },
];

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
  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;
    listVendors().then(({ data }) => { if (active) setVendors(data.vendors); })
      .catch((error) => { if (active) setNotice({ type: 'error', message: apiError(error, 'Could not load vendors') }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const categories = useMemo(() => ['All Vendors', ...new Set(vendors.map((vendor) => vendor.businessType).filter(Boolean))], [vendors]);
  const visible = vendors.filter((vendor) => (category === 'All Vendors' || vendor.businessType === category)
    && [vendor.name, vendor.businessType, vendor.contact, vendor.phone, vendor.email, vendor.location]
      .join(' ').toLowerCase().includes(search.trim().toLowerCase()));

  const closeModal = () => {
    if (saving || preparing) return;
    setModal(null); setNewVendor(emptyVendor); setErrors({}); setDrafts([]); setPasteText('');
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
      'Contact Person': '', 'Phone Number': '+91 98765 43210', Email: '', Location: '' }]);
    const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Vendors');
    XLSX.writeFile(book, 'vendor-import-template.xlsx');
  };

  return <section className="mt-8">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div><h2 className="text-base font-semibold text-gray-800">Manage vendors</h2>
        <p className="mt-1 text-sm text-gray-500">Add one vendor or organize a bulk list for review.</p>
        <p className="mt-1 text-xs text-gray-500">Required: vendor name, business type, and a phone number or email. Contact person and location are optional.</p>
        <button type="button" onClick={downloadTemplate} className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500"><Download size={14} /> Download Excel template</button></div>
      <div className="flex gap-2"><button type="button" onClick={() => setModal('import')} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold"><Upload size={17} /> Bulk import</button>
        <button type="button" onClick={() => setModal('create')} className="inline-flex items-center gap-2 rounded-lg bg-[#e90000] px-4 py-2 text-sm font-semibold text-white"><Plus size={17} /> Add Vendor</button></div>
    </div>
    {notice && <div role="status" className={`mb-6 flex justify-between rounded-lg border px-4 py-3 text-sm ${notice.type === 'error' ? 'border-red-200 bg-red-50 text-red-700' : 'border-green-200 bg-green-50 text-green-700'}`}>
      <span>{notice.message}</span><button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button></div>}
    <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`rounded-xl border p-4 text-left text-sm ${category === item ? 'border-[#e90000] bg-red-50' : 'border-gray-200 bg-white'}`}>
      <span className="block font-semibold">{item}</span><span className="text-xs text-gray-500">{item === 'All Vendors' ? vendors.length : vendors.filter((vendor) => vendor.businessType === item).length} vendors</span></button>)}</div>
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b p-5">
      <div><h2 className="font-semibold">{category}</h2><p className="text-sm text-gray-500">{loading ? 'Loading vendors…' : `${visible.length} vendors found`}</p></div>
      <label><span className="sr-only">Search vendors</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search vendors..." className="rounded-lg border px-3 py-2 text-sm" /></label></div>
      <div className="overflow-x-auto"><table className="min-w-full divide-y"><thead className="bg-gray-50"><tr>{['Vendor', 'Business Type', 'Contact', 'Location', 'Status'].map((heading) => <th key={heading} className="px-5 py-3 text-left text-xs uppercase text-gray-500">{heading}</th>)}</tr></thead>
        <tbody className="divide-y">{visible.map((vendor) => <tr key={vendor.id}><td className="whitespace-nowrap px-5 py-4 text-sm font-semibold">{vendor.name}</td><td className="px-5 py-4 text-sm">{vendor.businessType}</td>
          <td className="px-5 py-4 text-sm"><p>{vendor.contact || '—'}</p>{vendor.phone && <p className="mt-1 flex gap-2 text-xs"><a href={`tel:${vendor.phone.replace(/[^+\d]/g, '')}`} aria-label={`Call ${vendor.contact || vendor.name} at ${vendor.phone}`}>{vendor.phone}</a>
            <a href={`https://wa.me/${vendor.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" aria-label={`Message ${vendor.contact || vendor.name} on WhatsApp`}>WhatsApp</a></p>}{vendor.email && <p className="text-xs">{vendor.email}</p>}</td>
          <td className="px-5 py-4 text-sm">{vendor.location || '—'}</td><td className="px-5 py-4 text-sm">{vendor.status}</td></tr>)}</tbody></table>
        {!loading && !visible.length && <p className="p-10 text-center text-sm text-gray-500">No vendors found</p>}</div></div>

    {modal && <div role="dialog" aria-modal="true" aria-labelledby="vendor-dialog-title" className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) closeModal(); }}>
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white shadow-xl"><div className="flex justify-between border-b px-6 py-5"><div><h2 id="vendor-dialog-title" className="text-xl font-semibold">{modal === 'create' ? 'Add a new vendor' : modal === 'import' ? 'Bulk import vendors' : 'Review organized vendors'}</h2>
        <p className="text-sm text-gray-500">{modal === 'review' ? 'Correct suggestions and resolve duplicates before saving.' : 'Name, business type, and phone or email are required.'}</p></div><button type="button" onClick={closeModal} aria-label="Close"><X size={20} /></button></div>
        {notice?.type === 'error' && <p role="alert" className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{notice.message}</p>}
        {modal === 'create' && <form onSubmit={addVendor}><div className="grid gap-4 p-6 sm:grid-cols-2">{fields.map((field) => <label key={field.name} className="text-sm">{field.label} {field.required && '*'}<input type={field.type || 'text'} value={newVendor[field.name]} onChange={(event) => { setNewVendor((current) => ({ ...current, [field.name]: event.target.value })); setErrors((current) => ({ ...current, [field.name]: undefined })); }} className="mt-1 w-full rounded-lg border px-3 py-2" />{errors[field.name] && <span className="text-xs text-red-600">{errors[field.name]}</span>}</label>)}
          <label className="text-sm">Status<select value={newVendor.status} onChange={(event) => setNewVendor((current) => ({ ...current, status: event.target.value }))} className="mt-1 w-full rounded-lg border px-3 py-2"><option>Pending</option><option>Approved</option></select></label></div>
          <div className="flex justify-end gap-3 border-t p-4"><button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-[#e90000] px-4 py-2 text-sm text-white">{saving ? 'Saving…' : 'Add Vendor'}</button></div></form>}
        {modal === 'import' && <div className="p-6"><input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={uploadFile} aria-label="Upload vendor Excel file" className="sr-only" /><button type="button" disabled={preparing} onClick={() => fileInputRef.current?.click()} className="rounded-lg border px-4 py-3 text-sm font-semibold">Choose Excel or CSV file</button>
          <p className="my-4 text-center text-sm text-gray-500">or paste a messy list</p><label className="block text-sm">Paste vendor data<textarea value={pasteText} onChange={(event) => setPasteText(event.target.value)} rows={8} placeholder="Vendor name, category, phone or email…" className="mt-2 w-full rounded-lg border p-3" /></label>
          <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="button" disabled={!pasteText.trim() || preparing} onClick={() => prepare({ text: pasteText })} className="rounded-lg bg-[#e90000] px-4 py-2 text-sm text-white disabled:opacity-50">{preparing ? 'Organizing…' : 'Organize pasted list'}</button></div></div>}
        {modal === 'review' && <div className="p-6"><p className="mb-4 text-sm text-gray-600">{drafts.length} draft row(s). Unrecognized source rows stay visible for correction or skipping.</p><div className="space-y-5">{drafts.map((draft, index) => {
          const rowErrors = validateVendor(draft.vendor);
          return <div key={draft.draftId + index} className="rounded-xl border p-4"><div className="mb-3 flex flex-wrap gap-3"><label className="text-sm font-semibold"><input type="checkbox" checked={draft.selected} onChange={(event) => changeDraft(index, { selected: event.target.checked })} /> Include row {index + 1}</label>
            {draft.duplicate && <label className="text-sm text-amber-700">Possible duplicate <select aria-label={`Resolve duplicate row ${index + 1}`} value={draft.duplicateChoice} onChange={(event) => changeDraft(index, { duplicateChoice: event.target.value, selected: event.target.value === 'keep' })} className="rounded border p-1"><option value="review">Review</option><option value="keep">Keep anyway</option><option value="skip">Skip</option></select></label>}</div>
            <p className="break-words rounded bg-gray-50 p-2 text-xs text-gray-600"><strong>Source:</strong> {draft.source}</p>{draft.warnings.map((warning) => <p key={warning} className="mt-1 text-xs text-amber-700">{warning}</p>)}
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{fields.map((field) => <label key={field.name} className="text-xs">{field.label} {field.required && '*'}<input type={field.type || 'text'} value={draft.vendor[field.name]} onChange={(event) => changeDraft(index, { vendor: { ...draft.vendor, [field.name]: event.target.value } })} className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm ${draft.selected && rowErrors[field.name] ? 'border-red-300' : ''}`} />{draft.selected && rowErrors[field.name] && <span className="text-red-600">{rowErrors[field.name]}</span>}</label>)}</div></div>;
        })}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={closeModal} className="rounded-lg border px-4 py-2 text-sm">Cancel</button><button type="button" disabled={saving} onClick={saveSelected} className="rounded-lg bg-[#e90000] px-4 py-2 text-sm text-white">{saving ? 'Saving…' : 'Save selected vendors'}</button></div></div>}
      </div></div>}
  </section>;
}

export default VendorList;
