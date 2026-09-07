import type { Dictionary, MessageKey, MessageValues } from "./messages";

// Keep formatting separate so client entry chunks do not bundle dictionaries.
export function message(dictionary: Dictionary, key: MessageKey, values?: MessageValues) {
  const template = dictionary[key] ?? key;
  if (!values) return template;
  // Single pass: user-supplied titles must not become additional placeholders.
  return template.replace(/\{([^}]+)\}/g, (token, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : token);
}
