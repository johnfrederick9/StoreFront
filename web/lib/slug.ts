const RESERVED = new Set([
  'admin',
  'api',
  'auth',
  'dashboard',
  'login',
  'logout',
  'new',
  's',
  'settings',
  'signup',
  'storage',
  'www',
])

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function isValidSlug(slug: string): boolean {
  if (slug.length < 3 || slug.length > 40) return false
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return false
  if (RESERVED.has(slug)) return false
  return true
}

export function slugError(slug: string): string | null {
  if (!slug) return 'Required'
  if (slug.length < 3) return 'At least 3 characters'
  if (slug.length > 40) return 'At most 40 characters'
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return 'Lowercase letters, numbers, and single dashes only'
  }
  if (RESERVED.has(slug)) return 'This name is reserved'
  return null
}
