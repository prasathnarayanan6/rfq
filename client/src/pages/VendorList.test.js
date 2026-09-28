import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import VendorList from './VendorList';
import { initiateVendorCall, listVendors, prepareVendors, saveVendors } from '../API/vendorAPI';

jest.mock('../API/vendorAPI', () => ({
  initiateVendorCall: jest.fn(), listVendors: jest.fn(), prepareVendors: jest.fn(), saveVendors: jest.fn(),
  apiError: (error) => error.message,
}));

beforeEach(() => {
  listVendors.mockResolvedValue({ data: { vendors: [] } });
  prepareVendors.mockReset();
  saveVendors.mockReset();
  initiateVendorCall.mockReset();
});

test('call form shows only vendors with contact numbers and queues the conversation brief', async () => {
  listVendors.mockResolvedValue({ data: { vendors: [
    { id: 11, name: 'Bright Tools', businessType: 'Hardware', contact: '', phone: '+91 98765 43210', whatsapp: '', email: '', location: '', status: 'Approved' },
    { id: 12, name: 'WhatsApp Only', businessType: 'Hardware', contact: '', phone: '', whatsapp: '+91 91234 56789', email: '', location: '', status: 'Approved' },
  ] } });
  initiateVendorCall.mockResolvedValue({ data: { callRequest: { id: 'call-123', vendors: [{ id: '11', name: 'Bright Tools', phone: '+91 98765 43210' }] } } });
  render(<VendorList />);
  await screen.findByText('Bright Tools');
  fireEvent.click(screen.getByRole('button', { name: /create a call/i }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Bright Tools')).toBeInTheDocument();
  expect(within(dialog).queryByText('WhatsApp Only')).not.toBeInTheDocument();
  fireEvent.change(within(dialog).getByLabelText(/conversation brief/i), { target: { value: 'Discuss pricing, availability, and delivery dates.' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /initiate call process/i }));
  await waitFor(() => expect(initiateVendorCall).toHaveBeenCalledWith({
    businessType: 'Hardware', vendorIds: ['11'], conversationBrief: 'Discuss pricing, availability, and delivery dates.',
  }));
  expect(await screen.findByText(/call process call-123 queued/i)).toBeInTheDocument();
});

test('manual entry keeps contact and WhatsApp numbers separate', async () => {
  saveVendors.mockResolvedValue({ data: { vendors: [{ id: 1, name: 'Bright Tools', businessType: 'Hardware', contact: '', phone: '+91 98765 43210', whatsapp: '+91 91234 56789', email: '', location: '', status: 'Pending' }] } });
  render(<VendorList />);
  fireEvent.click(screen.getByRole('button', { name: /add vendor/i }));
  const dialog = screen.getByRole('dialog');
  fireEvent.change(within(dialog).getByLabelText(/vendor name/i), { target: { value: 'Bright Tools' } });
  fireEvent.change(within(dialog).getByLabelText(/business type/i), { target: { value: 'Hardware' } });
  fireEvent.change(within(dialog).getByLabelText(/contact number/i), { target: { value: '+91 98765 43210' } });
  fireEvent.change(within(dialog).getByLabelText(/whatsapp number/i), { target: { value: '+91 91234 56789' } });
  fireEvent.click(within(dialog).getByRole('button', { name: /add vendor/i }));
  expect(await screen.findByText('Bright Tools')).toBeInTheDocument();
  expect(saveVendors).toHaveBeenCalledWith([expect.objectContaining({ name: 'Bright Tools', phone: '+91 98765 43210', whatsapp: '+91 91234 56789' })]);
});

test('bulk review keeps possible duplicates for explicit resolution before saving', async () => {
  prepareVendors.mockResolvedValue({ data: { drafts: [
    { draftId: 'draft-0', source: 'Bright Tools, hardware, bright@example.com', vendor: { name: 'Bright Tools', businessType: 'Hardware', contact: '', phone: '', whatsapp: '', email: 'bright@example.com', location: '', status: 'Pending' }, warnings: [], duplicate: true },
  ] } });
  saveVendors.mockResolvedValue({ data: { vendors: [{ id: 2, name: 'Bright Tools', businessType: 'Hardware', contact: '', phone: '', whatsapp: '', email: 'bright@example.com', location: '', status: 'Pending' }] } });
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
    { draftId: 'draft-0', source: 'Unknown vendor', vendor: { name: 'Unknown vendor', businessType: '', contact: '', phone: '', whatsapp: '', email: '', location: '', status: 'Pending' }, warnings: ['Check the business type'], duplicate: false },
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
