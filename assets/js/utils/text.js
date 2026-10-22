export function slugify(value) {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || 'project';
}

/**
 * Sheet cells often contain hard-wrapped lines. A blank line separates
 * paragraphs; a single line break is treated as a space.
 */
export function splitParagraphs(text) {
  return String(text ?? '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

export const pad2 = (n) => String(n).padStart(2, '0');
