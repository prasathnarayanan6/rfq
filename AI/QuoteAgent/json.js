function balancedJson(text) {
  const start = text.search(/[\[{]/);
  if (start < 0) return '';
  const opening = text[start];
  const closing = opening === '{' ? '}' : ']';
  let depth = 0;
  let quoted = false;
  let escaped = false;
  for (let index = start; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') quoted = true;
    else if (character === opening) depth += 1;
    else if (character === closing) {
      depth -= 1;
      if (depth === 0) return text.slice(start, index + 1);
    }
  }
  return '';
}

export function parseJsonResponse(value) {
  if (value && typeof value === 'object') return value;
  const source = String(value || '').replace(/^\uFEFF/, '').trim();
  if (!source) throw new SyntaxError('The model returned an empty response');
  const withoutFence = source.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  const candidates = [withoutFence, balancedJson(withoutFence)].filter(Boolean);
  let lastError;
  for (const candidate of [...new Set(candidates)]) {
    try { return JSON.parse(candidate); } catch (error) { lastError = error; }
  }
  throw new SyntaxError(`The model response did not contain valid JSON: ${lastError?.message || 'unknown parse error'}`);
}

export function unwrapPayload(value, keys = []) {
  let current = value;
  if (Array.isArray(current) && current.length === 1) [current] = current;
  for (const key of keys) {
    if (current && typeof current === 'object' && !Array.isArray(current) && current[key] !== undefined) {
      current = current[key];
      if (Array.isArray(current) && current.length === 1) [current] = current;
      break;
    }
  }
  return current;
}
