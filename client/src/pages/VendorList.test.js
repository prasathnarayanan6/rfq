import { fireEvent, render, screen, within } from '@testing-library/react';
import VendorList from './VendorList';
import { listVendors, prepareVendors, saveVendors } from '../API/vendorAPI';

jest.mock('../API/vendorAPI', () => ({
  listVendors: jest.fn(), prepareVendors: jest.fn(), saveVendors: jest.fn(),
  apiError: (error) => error.message,
}));

beforeEach(() => {
  listVendors.mockResolvedValue({ data: { vendors: [] } });
  prepareVendors.mockReset();
  saveVendors.mockReset();
});

test('manual entry accepts a phone without optional contact person, email, or location', async () => {
  saveVendors.mockResolvedValue({ data: { vendors: [{ id: 1, name: 'Bright Tools', businessType: 'Hardware', contact: '', phone: '+91 98765 43210', email: '', location: '', status: 'Pending' }] } });
  render(<VendorList />);
  fireEvent.click(screen.getByRole('button', { name: /add vendor/i }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText(/vendor name/i), { target: { value: 'Bright Tools' } });
  fireEvent.change(within(dialog).getByLabelText(/business type/i), { target: { value: 'Hardware' } });
  fireEvent.change(within(dialog).getByLabelText(/phone \/ whatsapp/i), { target: { value: '+91 98765 43210' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /add vendor/i }));
  expect(await screen.findByText('Bright Tools')).toBeInTheDocument();
  expect(saveVendors).toHaveBeenCalledWith([expect.objectContaining({ name: 'Bright Tools', email: '' })]);
});

test('bulk review keeps possible duplicates for explicit resolution before saving', async () => {
  prepareVendors.mockResolvedValue({ data: { drafts: [
    { draftId: 'draft-0', source: 'Bright Tools, hardware, bright@example.com', vendor: { name: 'Bright Tools', businessType: 'Hardware', contact: '', phone: '', email: 'bright@example.com', location: '', status: 'Pending' }, warnings: [], duplicate: true },
  ] } });
  saveVendors.mockResolvedValue({ data: { vendors: [{ id: 2, name: 'Bright Tools', businessType: 'Hardware', contact: '', phone: '', email: 'bright@example.com', location: '', status: 'Pending' }] } });
  render(<VendorList />);
  fireEvent.click(screen.getByRole('button', { name: /bulk import/i }));
  fireEvent.change(screen.getByLabelText(/paste vendor data/i), { target: { value: 'Bright Tools, hardware, bright@example.com' } });
  fireEvent.click(screen.getByRole('button', { name: /organize pasted list/i }));
  expect(await screen.findByText(/possible duplicate/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /save selected vendors/i }));
  expect(saveVendors).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText(/resolve duplicate row 1/i), { target: { value: 'keep' } });
  fireEvent.click(screen.getByRole('button', { name: /save selected vendors/i }));
  expect(await screen.findByText('Bright Tools')).toBeInTheDocument();
  expect(saveVendors).toHaveBeenCalledTimes(1);
});

test('invalid selected drafts cannot be saved', async () => {
  prepareVendors.mockResolvedValue({ data: { drafts: [
    { draftId: 'draft-0', source: 'Unknown vendor', vendor: { name: 'Unknown vendor', businessType: '', contact: '', phone: '', email: '', location: '', status: 'Pending' }, warnings: ['Check the business type'], duplicate: false },
  ] } });
  render(<VendorList />);
  fireEvent.click(screen.getByRole('button', { name: /bulk import/i }));
  fireEvent.change(screen.getByLabelText(/paste vendor data/i), { target: { value: 'Unknown vendor' } });
  fireEvent.click(screen.getByRole('button', { name: /organize pasted list/i }));
  expect(await screen.findByText(/check the business type/i)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /save selected vendors/i }));
  expect(saveVendors).not.toHaveBeenCalled();
  expect(screen.getByRole('status')).toHaveTextContent(/fix mandatory or invalid details/i);
});
