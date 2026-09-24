// Substitute {{placeholder}} tokens in a string with values from a data map.
export function substitutePlaceholders(text: string, data: Record<string, string>): string {
  return text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    return data[key] !== undefined ? data[key] : "";
  });
}

export function applyCaseTransform(text: string, transform?: string): string {
  switch (transform) {
    case "upper":
      return text.toUpperCase();
    case "lower":
      return text.toLowerCase();
    case "title":
      return text.replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
    default:
      return text;
  }
}
