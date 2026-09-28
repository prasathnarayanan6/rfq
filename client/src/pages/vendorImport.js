import * as XLSX from 'xlsx';

export async function rowsFromFile(file) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('This file has no worksheet');
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  return rows.filter((row) => row.some((cell) => String(cell ?? '').trim()));
}

export function validateVendor(vendor) {
  const errors = {};
  const name = String(vendor.name ?? '').trim();
  const businessType = String(vendor.businessType ?? '').trim();
  const phone = String(vendor.phone ?? '').trim();
  const whatsapp = String(vendor.whatsapp ?? '').trim();
  const email = String(vendor.email ?? '').trim();
  if (!name) errors.name = 'Required';
  if (!businessType) errors.businessType = 'Required';
  if (!phone && !whatsapp && !email) {
    errors.phone = 'Contact number, WhatsApp, or email required';
    errors.whatsapp = 'Contact number, WhatsApp, or email required';
    errors.email = 'Contact number, WhatsApp, or email required';
  }
  if (whatsapp) {
    const digits = whatsapp.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) errors.whatsapp = 'Invalid WhatsApp number';
  }
  if (phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) errors.phone = 'Invalid phone number';
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Invalid email address';
  }
  return errors;
}
