import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Download,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Upload,
  X,
} from 'lucide-react';
import * as XLSX from 'xlsx';

const initialVendors = [
  {
    id: 1,
    name: 'Apex Buildcon Pvt. Ltd.',
    businessType: 'Construction',
    contact: 'Rohan Mehta',
    phone: '+91 98765 41001',
    email: 'rohan@apexbuildcon.in',
    location: 'Mumbai, Maharashtra',
    status: 'Approved',
  },
  {
    id: 2,
    name: 'GreenStone Infrastructure',
    businessType: 'Construction',
    contact: 'Kavya Iyer',
    phone: '+91 98765 41002',
    email: 'kavya@greenstone.in',
    location: 'Bengaluru, Karnataka',
    status: 'Approved',
  },
  {
    id: 3,
    name: 'Nexora Technologies',
    businessType: 'IT & Software',
    contact: 'Arjun Nair',
    phone: '+91 98765 41003',
    email: 'arjun@nexora.tech',
    location: 'Hyderabad, Telangana',
    status: 'Approved',
  },
  {
    id: 4,
    name: 'CloudPeak Systems',
    businessType: 'IT & Software',
    contact: 'Meera Shah',
    phone: '+91 98765 41004',
    email: 'meera@cloudpeak.io',
    location: 'Pune, Maharashtra',
    status: 'Pending',
  },
  {
    id: 5,
    name: 'PaperTree Solutions',
    businessType: 'Office Supplies',
    contact: 'Vikram Rao',
    phone: '+91 98765 41005',
    email: 'vikram@papertree.in',
    location: 'Chennai, Tamil Nadu',
    status: 'Approved',
  },
  {
    id: 6,
    name: 'Workspace Essentials',
    businessType: 'Office Supplies',
    contact: 'Neha Kapoor',
    phone: '+91 98765 41006',
    email: 'neha@workspaceessential.in',
    location: 'Delhi',
    status: 'Approved',
  },
  {
    id: 7,
    name: 'SwiftRoute Logistics',
    businessType: 'Logistics',
    contact: 'Aditya Singh',
    phone: '+91 98765 41007',
    email: 'aditya@swiftroute.in',
    location: 'Ahmedabad, Gujarat',
    status: 'Pending',
  },
  {
    id: 8,
    name: 'NorthStar Advisory',
    businessType: 'Professional Services',
    contact: 'Priya Menon',
    phone: '+91 98765 41008',
    email: 'priya@northstaradvisory.in',
    location: 'Kochi, Kerala',
    status: 'Approved',
  },
];

const emptyVendor = {
  name: '',
  businessType: '',
  contact: '',
  phone: '',
  email: '',
  location: '',
  status: 'Pending',
};

const importColumns = {
  name: ['vendor', 'vendorname', 'name', 'company', 'companyname'],
  businessType: ['businesstype', 'category', 'type'],
  contact: ['contact', 'contactperson', 'contactname'],
  phone: ['phone', 'phonenumber', 'mobile', 'mobilenumber', 'whatsapp', 'whatsappnumber'],
  email: ['email', 'emailaddress'],
  location: ['location', 'city', 'address'],
  status: ['status'],
};

const normalizeHeading = (heading) =>
  String(heading ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const getCellValue = (row, field) => {
  const normalizedRow = Object.entries(row).reduce((result, [key, value]) => {
    result[normalizeHeading(key)] = value;
    return result;
  }, {});

  const matchingHeading = importColumns[field].find((heading) => normalizedRow[heading] !== undefined);
  return String(normalizedRow[matchingHeading] ?? '').trim();
};

function VendorList() {
  const [vendors, setVendors] = useState(initialVendors);
  const [selectedCategory, setSelectedCategory] = useState('All Vendors');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newVendor, setNewVendor] = useState(emptyVendor);
  const [formErrors, setFormErrors] = useState({});
  const [notice, setNotice] = useState(null);
  const fileInputRef = useRef(null);

  const categories = useMemo(() => {
    const businessTypes = [...new Set(vendors.map((vendor) => vendor.businessType).filter(Boolean))];
    return ['All Vendors', ...businessTypes];
  }, [vendors]);

  const visibleVendors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const isInCategory =
        selectedCategory === 'All Vendors' || vendor.businessType === selectedCategory;
      const matchesSearch =
        !query ||
        [vendor.name, vendor.businessType, vendor.contact, vendor.phone, vendor.email, vendor.location]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return isInCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory, vendors]);

  const vendorCountFor = (category) =>
    category === 'All Vendors'
      ? vendors.length
      : vendors.filter((vendor) => vendor.businessType === category).length;

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewVendor(emptyVendor);
    setFormErrors({});
  };

  const handleCreateVendor = (event) => {
    event.preventDefault();
    const requiredFields = ['name', 'businessType', 'contact', 'phone', 'email', 'location'];
    const errors = requiredFields.reduce((result, field) => {
      if (!newVendor[field].trim()) result[field] = 'Required';
      return result;
    }, {});

    if (newVendor.email && !/^\S+@\S+\.\S+$/.test(newVendor.email)) {
      errors.email = 'Enter a valid email address';
    }

    const phoneDigits = newVendor.phone.replace(/\D/g, '');
    if (newVendor.phone && (phoneDigits.length < 7 || phoneDigits.length > 15)) {
      errors.phone = 'Enter a valid phone number';
    }

    if (Object.keys(errors).length) {
      setFormErrors(errors);
      return;
    }

    setVendors((currentVendors) => [
      ...currentVendors,
      { ...newVendor, id: `manual-${Date.now()}` },
    ]);
    setSelectedCategory('All Vendors');
    setNotice({ type: 'success', message: `${newVendor.name} was added successfully.` });
    closeCreateModal();
  };

  const handleVendorChange = (event) => {
    const { name, value } = event.target;
    setNewVendor((currentVendor) => ({ ...currentVendor, [name]: value }));
    setFormErrors((currentErrors) => ({ ...currentErrors, [name]: undefined }));
  };

  const handleExcelUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });

      const importedVendors = rows
        .map((row, index) => ({
          id: `import-${Date.now()}-${index}`,
          name: getCellValue(row, 'name'),
          businessType: getCellValue(row, 'businessType'),
          contact: getCellValue(row, 'contact'),
          phone: getCellValue(row, 'phone'),
          email: getCellValue(row, 'email'),
          location: getCellValue(row, 'location'),
          status:
            getCellValue(row, 'status').toLowerCase() === 'approved' ? 'Approved' : 'Pending',
        }))
        .filter((vendor) => vendor.name && vendor.businessType);

      if (!importedVendors.length) {
        throw new Error('No valid vendors found. Include Vendor Name and Business Type columns.');
      }

      setVendors((currentVendors) => [...currentVendors, ...importedVendors]);
      setSelectedCategory('All Vendors');
      setNotice({
        type: 'success',
        message: `${importedVendors.length} ${
          importedVendors.length === 1 ? 'vendor was' : 'vendors were'
        } imported from ${file.name}.`,
      });
    } catch (error) {
      setNotice({
        type: 'error',
        message: error.message || 'The Excel file could not be imported.',
      });
    } finally {
      event.target.value = '';
    }
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        'Vendor Name': 'Example Supplies Pvt. Ltd.',
        'Business Type': 'Office Supplies',
        'Contact Person': 'Aarav Sharma',
        'Phone Number': '+91 98765 43210',
        Email: 'aarav@example.com',
        Location: 'Mumbai, Maharashtra',
        Status: 'Pending',
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Vendors');
    XLSX.writeFile(workbook, 'vendor-import-template.xlsx');
  };

  return (
    <section className="mt-8">
      <div className="mb-6 flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-800">Manage vendors</h2>
          <p className="mt-1 text-sm text-gray-400">
            Add a vendor individually or import multiple vendors from Excel.
          </p>
          <button
            type="button"
            onClick={downloadTemplate}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 transition hover:text-[#e90000]"
          >
            <Download size={14} />
            Download Excel template
          </button>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleExcelUpload}
            className="hidden"
            aria-label="Upload vendor Excel file"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50"
          >
            <Upload size={17} />
            Import Excel
          </button>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#e90000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-200"
          >
            <Plus size={18} />
            Add Vendor
          </button>
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className={`mb-6 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
            notice.type === 'success'
              ? 'border-green-200 bg-green-50 text-green-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          <span className="flex-1">{notice.message}</span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss message">
            <X size={17} />
          </button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories.map((category) => {
          const isSelected = selectedCategory === category;

          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              className={`flex items-center gap-4 rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-[#e90000] bg-red-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                  isSelected ? 'bg-[#e90000] text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                <Building2 size={21} />
              </span>
              <span>
                <span className="block text-sm font-semibold text-gray-800">{category}</span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  {vendorCountFor(category)} {vendorCountFor(category) === 1 ? 'vendor' : 'vendors'}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">{selectedCategory}</h2>
            <p className="mt-1 text-sm text-gray-400">
              {visibleVendors.length} {visibleVendors.length === 1 ? 'vendor' : 'vendors'} found
            </p>
          </div>

          <label className="relative block w-full sm:w-80">
            <span className="sr-only">Search vendors</span>
            <Search
              size={18}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search vendors..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pl-10 pr-3 text-sm text-gray-700 outline-none transition focus:border-[#e90000] focus:ring-2 focus:ring-red-100"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                {['Vendor', 'Business Type', 'Contact', 'Location', 'Status'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {visibleVendors.map((vendor) => (
                <tr key={vendor.id} className="transition-colors hover:bg-gray-50">
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-600">
                        {vendor.name
                          .split(' ')
                          .slice(0, 2)
                          .map((word) => word[0])
                          .join('')}
                      </span>
                      <span className="text-sm font-semibold text-gray-800">{vendor.name}</span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                    {vendor.businessType}
                  </td>
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-gray-700">{vendor.contact || '—'}</p>
                    {vendor.phone && (
                      <div className="mt-1.5 flex items-center gap-2 text-xs">
                        <a
                          href={`tel:${vendor.phone.replace(/[^+\d]/g, '')}`}
                          className="inline-flex items-center gap-1.5 text-gray-500 transition hover:text-[#e90000]"
                          aria-label={`Call ${vendor.contact || vendor.name} at ${vendor.phone}`}
                        >
                          <Phone size={13} />
                          {vendor.phone}
                        </a>
                        <a
                          href={`https://wa.me/${vendor.phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-green-50 p-1 text-green-600 transition hover:bg-green-100 hover:text-green-700"
                          aria-label={`Message ${vendor.contact || vendor.name} on WhatsApp`}
                          title="Open WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </a>
                      </div>
                    )}
                    {vendor.email && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                        <Mail size={13} />
                        {vendor.email}
                      </p>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={15} className="text-gray-400" />
                      {vendor.location || '—'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                        vendor.status === 'Approved'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {vendor.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {visibleVendors.length === 0 && (
            <div className="px-5 py-14 text-center">
              <Building2 size={32} className="mx-auto text-gray-300" />
              <p className="mt-3 text-sm font-medium text-gray-600">No vendors found</p>
              <p className="mt-1 text-xs text-gray-400">Try another category or search term.</p>
            </div>
          )}
        </div>
      </div>

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-vendor-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeCreateModal();
          }}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 id="create-vendor-title" className="text-xl font-semibold text-gray-800">
                  Add a new vendor
                </h2>
                <p className="mt-1 text-sm text-gray-400">Enter the vendor's business details.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateVendor}>
              <div className="grid gap-5 px-6 py-6 sm:grid-cols-2">
                {[
                  { name: 'name', label: 'Vendor name', placeholder: 'e.g. Apex Buildcon', span: true },
                  { name: 'businessType', label: 'Business type', placeholder: 'e.g. Construction' },
                  { name: 'contact', label: 'Contact person', placeholder: 'Full name' },
                  { name: 'phone', label: 'Phone / WhatsApp number', placeholder: '+91 98765 43210', type: 'tel' },
                  { name: 'email', label: 'Email address', placeholder: 'name@company.com', type: 'email' },
                  { name: 'location', label: 'Location', placeholder: 'City, State' },
                ].map((field) => (
                  <label key={field.name} className={field.span ? 'sm:col-span-2' : ''}>
                    <span className="mb-1.5 block text-sm font-medium text-gray-700">
                      {field.label} <span className="text-[#e90000]">*</span>
                    </span>
                    <input
                      type={field.type || 'text'}
                      name={field.name}
                      value={newVendor[field.name]}
                      onChange={handleVendorChange}
                      placeholder={field.placeholder}
                      className={`w-full rounded-lg border px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:ring-2 ${
                        formErrors[field.name]
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : 'border-gray-200 focus:border-[#e90000] focus:ring-red-100'
                      }`}
                    />
                    {formErrors[field.name] && (
                      <span className="mt-1 block text-xs text-red-600">{formErrors[field.name]}</span>
                    )}
                  </label>
                ))}

                <label>
                  <span className="mb-1.5 block text-sm font-medium text-gray-700">Status</span>
                  <select
                    name="status"
                    value={newVendor.status}
                    onChange={handleVendorChange}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-700 outline-none transition focus:border-[#e90000] focus:ring-2 focus:ring-red-100"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#e90000] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    <Plus size={17} />
                    Add Vendor
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default VendorList;
