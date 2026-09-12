/** Replace `{name}` placeholders in an already translated message. */
export function formatMessage(message: string, params?: Record<string, string | number>): string {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, key: string) =>
    params[key] === undefined || params[key] === null ? match : String(params[key])
  );
}
