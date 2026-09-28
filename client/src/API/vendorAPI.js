import axios from 'axios';

const VENDOR_API_URL = process.env.REACT_APP_VENDOR_API_URL || 'http://localhost:4007';

const client = axios.create({ baseURL: `${VENDOR_API_URL}/api/v1/vendors` });
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('user_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const listVendors = () => client.get('/');
export const prepareVendors = (source) => client.post('/prepare', source);
export const saveVendors = (vendors) => client.post('/', { vendors });
export const updateVendor = (vendorId, vendor) => client.patch(`/${vendorId}`, { vendor });
export const initiateVendorCall = (callRequest) => client.post('/calls', callRequest);
export const listOutreachRequests = () => client.get('/outreach/requests');
export const listQuotes = (requestId = '') => client.get('/outreach/quotes', { params: requestId ? { requestId } : {} });
export const queueOutreach = (requestId, outreach) => client.post(`/outreach/${requestId}/send`, outreach);
export const recordInboundMessage = (requestId, message) => client.post(`/outreach/${requestId}/inbound`, message);

export function apiError(error, fallback) {
  return error?.response?.data?.error || error?.message || fallback;
}
