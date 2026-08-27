import { fireEvent, render, screen, within } from '@testing-library/react';
import * as XLSX from 'xlsx';
import VendorList from './VendorList';

describe('VendorList', () => {
  test('offers Excel import and adds a vendor manually', () => {
    render(<VendorList />);

    expect(screen.getByRole('button', { name: /import excel/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/upload vendor excel file/i)).toHaveAttribute(
      'accept',
      '.xlsx,.xls,.csv'
    );

    fireEvent.click(screen.getByRole('button', { name: /add vendor/i }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/vendor name/i), {
      target: { value: 'Brightline Services' },
    });
    fireEvent.change(within(dialog).getByLabelText(/business type/i), {
      target: { value: 'Professional Services' },
    });
    fireEvent.change(within(dialog).getByLabelText(/contact person/i), {
      target: { value: 'Isha Verma' },
    });
    fireEvent.change(within(dialog).getByLabelText(/phone \/ whatsapp number/i), {
      target: { value: '+91 98765 43210' },
    });
    fireEvent.change(within(dialog).getByLabelText(/email address/i), {
      target: { value: 'isha@brightline.example' },
    });
    fireEvent.change(within(dialog).getByLabelText(/location/i), {
      target: { value: 'Delhi' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: /add vendor/i }));

    expect(screen.getByText('Brightline Services')).toBeInTheDocument();
    expect(screen.getByText(/was added successfully/i)).toBeInTheDocument();
  });

  test('imports vendor rows from an Excel workbook', async () => {
    render(<VendorList />);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet([
        {
          'Vendor Name': 'Orbit Industrial',
          'Business Type': 'Manufacturing',
          'Contact Person': 'Kabir Khan',
          'WhatsApp Number': '+91 98765 40123',
          Email: 'kabir@orbit.example',
          Location: 'Pune, Maharashtra',
          Status: 'Approved',
        },
      ]),
      'Vendors'
    );
    const workbookData = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const file = new File([workbookData], 'vendors.xlsx');
    file.arrayBuffer = jest.fn().mockResolvedValue(workbookData);

    fireEvent.change(screen.getByLabelText(/upload vendor excel file/i), {
      target: { files: [file] },
    });

    expect(await screen.findByText('Orbit Industrial')).toBeInTheDocument();
    expect(screen.getByText(/1 vendor was imported from vendors.xlsx/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /call kabir khan/i })).toHaveAttribute(
      'href',
      'tel:+919876540123'
    );
    expect(screen.getByRole('link', { name: /message kabir khan on whatsapp/i })).toHaveAttribute(
      'href',
      'https://wa.me/919876540123'
    );
  });
});
