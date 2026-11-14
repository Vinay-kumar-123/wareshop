export const siteConfig = {
  name: 'KONNEVIA',
  tagline: 'Discover. Connect. Get Things Done.',
  url: 'https://konnevia.in',
  description: 'KONNEVIA is a Pan-India service marketplace connecting customers with verified professionals across Home & Construction, Events & Lifestyle, Business & Property, Digital & Professional, and Education & Career services.',
  supportEmail: 'hello@konnevia.in',
};

export function buildPageTitle(pageTitle) {
  if (!pageTitle) return `${siteConfig.name} — ${siteConfig.tagline}`;
  return `${pageTitle} — ${siteConfig.name}`;
}

export function buildCanonical(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig.url}${cleanPath}`;
}
