import DOMPurify from 'dompurify';

/** User entered form values and comments are rendered as HTML by legacy wflow views. */
export function sanitizeHtml(value: unknown): string {
  return DOMPurify.sanitize(String(value ?? ''), { USE_PROFILES: { html: true } });
}
