import React, { useMemo, useState } from 'react';
import { Building2, Mail, MapPin, Search } from 'lucide-react';

const vendors = [
  {
    id: 1,
    name: 'Apex Buildcon Pvt. Ltd.',
    businessType: 'Construction',
    contact: 'Rohan Mehta',
    email: 'rohan@apexbuildcon.in',
    location: 'Mumbai, Maharashtra',
    status: 'Approved',
  },
  {
    id: 2,
    name: 'GreenStone Infrastructure',
    businessType: 'Construction',
    contact: 'Kavya Iyer',
    email: 'kavya@greenstone.in',
    location: 'Bengaluru, Karnataka',
    status: 'Approved',
  },
  {
    id: 3,
    name: 'Nexora Technologies',
    businessType: 'IT & Software',
    contact: 'Arjun Nair',
    email: 'arjun@nexora.tech',
    location: 'Hyderabad, Telangana',
    status: 'Approved',
  },
  {
    id: 4,
    name: 'CloudPeak Systems',
    businessType: 'IT & Software',
    contact: 'Meera Shah',
    email: 'meera@cloudpeak.io',
    location: 'Pune, Maharashtra',
    status: 'Pending',
  },
  {
    id: 5,
    name: 'PaperTree Solutions',
    businessType: 'Office Supplies',
    contact: 'Vikram Rao',
    email: 'vikram@papertree.in',
    location: 'Chennai, Tamil Nadu',
    status: 'Approved',
  },
  {
    id: 6,
    name: 'Workspace Essentials',
    businessType: 'Office Supplies',
    contact: 'Neha Kapoor',
    email: 'neha@workspaceessential.in',
    location: 'Delhi',
    status: 'Approved',
  },
  {
    id: 7,
    name: 'SwiftRoute Logistics',
    businessType: 'Logistics',
    contact: 'Aditya Singh',
    email: 'aditya@swiftroute.in',
    location: 'Ahmedabad, Gujarat',
    status: 'Pending',
  },
  {
    id: 8,
    name: 'NorthStar Advisory',
    businessType: 'Professional Services',
    contact: 'Priya Menon',
    email: 'priya@northstaradvisory.in',
    location: 'Kochi, Kerala',
    status: 'Approved',
  },
];

function VendorList() {
  const [selectedCategory, setSelectedCategory] = useState('All Vendors');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = useMemo(() => {
    const businessTypes = [...new Set(vendors.map((vendor) => vendor.businessType))];

    return ['All Vendors', ...businessTypes];
  }, []);

  const visibleVendors = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return vendors.filter((vendor) => {
      const isInCategory =
        selectedCategory === 'All Vendors' || vendor.businessType === selectedCategory;
      const matchesSearch =
        !query ||
        [vendor.name, vendor.businessType, vendor.contact, vendor.email, vendor.location]
          .join(' ')
          .toLowerCase()
          .includes(query);

      return isInCategory && matchesSearch;
    });
  }, [searchTerm, selectedCategory]);

  const vendorCountFor = (category) =>
    category === 'All Vendors'
      ? vendors.length
      : vendors.filter((vendor) => vendor.businessType === category).length;

  return (
    <section className="mt-8">
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
                    <p className="text-sm font-medium text-gray-700">{vendor.contact}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                      <Mail size={13} />
                      {vendor.email}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1.5">
                      <MapPin size={15} className="text-gray-400" />
                      {vendor.location}
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
    </section>
  );
}

export default VendorList;
