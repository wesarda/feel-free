// Shared with the browser (src/community/client.ts) so both apply the same rules.
/** Checks that need no AI: links, e-mail addresses and phone numbers are not allowed in public text. */
export function ruleCheck(text: string): 'links' | 'email' | 'phone' | null {
  if (/[\w.+-]+@[\w-]+\.[\w.-]+/.test(text)) return 'email'
  if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(pl|com|eu|net|org)\b/i.test(text)) return 'links'
  if (/(?:\+?\d[\s-]?){9,}/.test(text)) return 'phone'
  return null
}
