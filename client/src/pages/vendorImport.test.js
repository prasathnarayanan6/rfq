import * as XLSX from 'xlsx';
import { rowsFromFile } from './vendorImport';

test('spreadsheet parsing retains headerless and messy rows for agent review', async () => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ['Bright Tools', 'hardware', 'sales@example.com'],
    ['', '', ''],
    ['Unknown Supplies', '', ''],
  ]), 'Vendors');
  const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const file = new File([data], 'vendors.xlsx');
  file.arrayBuffer = jest.fn().mockResolvedValue(data);
  expect(await rowsFromFile(file)).toEqual([
    ['Bright Tools', 'hardware', 'sales@example.com'],
    ['Unknown Supplies', '', ''],
  ]);
});
