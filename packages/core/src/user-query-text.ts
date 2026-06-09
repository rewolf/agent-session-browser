/** Remove Cursor `<user_query>` / `</user_query>` wrappers from transcript text. */
export function stripUserQueryTags(text: string): string {
  const wrapped = text.match(/<user_query>\s*([\s\S]*?)\s*<\/user_query>/i);
  if (wrapped) {
    return wrapped[1]!.trim();
  }
  return text.replace(/<\/?user_query>/gi, "").trim();
}
