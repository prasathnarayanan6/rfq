import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Dashboard from './dashboard';
import { listOutreachRequests, listQuotes, listVendors, queueOutreach } from '../API/vendorAPI';

jest.mock('../API/vendorAPI', () => ({
  listVendors: jest.fn(), listOutreachRequests: jest.fn(), listQuotes: jest.fn(), queueOutreach: jest.fn(),
  apiError: (error, fallback) => error?.message || fallback,
}));

const request = {
  id: '12345678-1111-2222-3333-444444444444', businessType: 'Hardware',
  requirements: 'Quote for 500 fasteners delivered to Chennai', status: 'Queued', createdAt: '2026-09-28T10:00:00Z',
  whatsappCount: 0, emailCount: 0, quoteCount: 1,
  vendors: [{ id: '7', name: 'Bright Tools', phone: '+91 9000011111', whatsapp: '+91 9000022222', email: 'sales@bright.example' }],
};

beforeEach(() => {
  listVendors.mockResolvedValue({ data: { vendors: [{ ...request.vendors[0], businessType: 'Hardware', status: 'Approved' }] } });
  listOutreachRequests.mockResolvedValue({ data: { requests: [request] } });
  listQuotes.mockResolvedValue({ data: { quotes: [{ id: 'quote-1', requestId: request.id, vendorName: 'Bright Tools', businessType: 'Hardware', channel: 'whatsapp', currency: 'INR', totalAmount: '125000', deliveryDays: 12, paymentTerms: '50% advance', status: 'Received' }] } });
  queueOutreach.mockReset();
});

test('dashboard links request IDs to WhatsApp outreach and comparable quotes', async () => {
  queueOutreach.mockResolvedValue({ data: { providerReady: false, messages: [{ id: 'message-1' }] } });
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}><Dashboard /></MemoryRouter>);
  expect((await screen.findAllByText('12345678')).length).toBe(2);
  expect(screen.getByText('₹1,25,000')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /whatsapp/i }));
  const dialog = screen.getByRole('dialog');
  expect(within(dialog).getByText('Bright Tools')).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole('button', { name: /queue whatsapp/i }));
  await waitFor(() => expect(queueOutreach).toHaveBeenCalledWith(request.id, expect.objectContaining({
    channel: 'whatsapp', vendorIds: ['7'],
  })));
  expect(await screen.findByText(/saved.*credentials are connected/i)).toBeInTheDocument();
});
