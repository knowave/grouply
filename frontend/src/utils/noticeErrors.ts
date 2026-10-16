export function splitFieldErrors(
  messages: string[] | undefined,
  fallback: string,
  fieldNames: string[],
): { fieldErrors: Record<string, string>; generalErrors: string[] } {
  const fieldErrors: Record<string, string> = {};
  const generalErrors: string[] = [];
  if (!messages || messages.length === 0) return { fieldErrors, generalErrors: [fallback] };

  for (const message of messages) {
    const idx = message.indexOf(": ");
    const prefix = idx >= 0 ? message.slice(0, idx) : "";
    if (prefix && (prefix === "scheduledAt" || fieldNames.includes(prefix))) {
      const reason = message.slice(idx + 2);
      fieldErrors[prefix] = fieldErrors[prefix] ? `${fieldErrors[prefix]} / ${reason}` : reason;
    } else {
      generalErrors.push(message);
    }
  }
  return { fieldErrors, generalErrors };
}
