const FIELDS = ['name', 'businessType', 'contact', 'phone', 'whatsapp', 'email', 'location'];

function cleanVendor(input = {}) {
  const vendor = Object.fromEntries(
    FIELDS.map((field) => [field, String(input[field] ?? '').trim()])
  );
  vendor.status = input.status === 'Approved' ? 'Approved' : 'Pending';
  return vendor;
}

function validateVendor(input) {
  const vendor = cleanVendor(input);
  const errors = {};
  if (!vendor.name) errors.name = 'Vendor name is required';
  if (!vendor.businessType) errors.businessType = 'Business type is required';
  if (!vendor.phone && !vendor.whatsapp && !vendor.email) {
    errors.phone = 'Add a contact number, WhatsApp number, or email address';
    errors.whatsapp = 'Add a contact number, WhatsApp number, or email address';
    errors.email = 'Add a contact number, WhatsApp number, or email address';
  }
  if (vendor.whatsapp) {
    const length = vendor.whatsapp.replace(/\D/g, '').length;
    if (length < 7 || length > 15) errors.whatsapp = 'Enter a valid WhatsApp number';
  }
  if (vendor.phone) {
    const length = vendor.phone.replace(/\D/g, '').length;
    if (length < 7 || length > 15) errors.phone = 'Enter a valid phone number';
  }
  if (vendor.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.email)) {
    errors.email = 'Enter a valid email address';
  }
  return { vendor, errors };
}

function duplicateKey(vendor) {
  return String(vendor.name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

module.exports = { cleanVendor, validateVendor, duplicateKey };
