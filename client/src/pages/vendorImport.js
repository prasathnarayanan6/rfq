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
  if (!vendor.name.trim()) errors.name = 'Required';
  if (!vendor.businessType.trim()) errors.businessType = 'Required';
  if (!vendor.phone.trim() && !vendor.email.trim()) {
    errors.phone = 'Phone or email required';
    errors.email = 'Phone or email required';
  }
  if (vendor.phone.trim()) {
    const digits = vendor.phone.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) errors.phone = 'Invalid phone number';
  }
  if (vendor.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.email)) {
    errors.email = 'Invalid email address';
  }
  return errors;
}
