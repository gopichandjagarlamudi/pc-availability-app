export function normalizeEmail(email) {
  if (!email) return '';
  return String(email)
    .normalize('NFKC')
    .replace(/[\s\u200B-\u200D\uFEFF]/g, '')
    .toLowerCase();
}

