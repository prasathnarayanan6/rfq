function validateCallRequest(input = {}) {
  const businessType = String(input.businessType || '').trim();
  const conversationBrief = String(input.conversationBrief || '').trim();
  const vendorIds = [...new Set((Array.isArray(input.vendorIds) ? input.vendorIds : [])
    .map((id) => Number(id))
    .filter((id) => Number.isSafeInteger(id) && id > 0))];
  const errors = {};

  if (!businessType) errors.businessType = 'Choose a business type';
  if (businessType.length > 150) errors.businessType = 'Business type is too long';
  if (!vendorIds.length) errors.vendorIds = 'Choose at least one vendor with a contact number';
  if (vendorIds.length > 100) errors.vendorIds = 'Choose up to 100 vendors per call process';
  if (conversationBrief.length < 10) errors.conversationBrief = 'Describe the conversation in at least 10 characters';
  if (conversationBrief.length > 4000) errors.conversationBrief = 'Conversation brief is too long';

  return { value: { businessType, vendorIds, conversationBrief }, errors };
}

module.exports = { validateCallRequest };
