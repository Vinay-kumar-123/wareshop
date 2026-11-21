export const siteConfig = {
  name: 'WARERENT',
  defaultTitle: 'WARERENT | Find Commercial Spaces & Businesses',
  url: 'https://wareshop.in',
  description: 'Find commercial shops, offices, warehouses and godowns across India with WARERENT.',
  defaultImage: '/og-image.png',
};

export function buildPageTitle(pageTitle) {
  if (!pageTitle) return siteConfig.defaultTitle;
  if (pageTitle.startsWith(`${siteConfig.name} |`) || pageTitle.endsWith(`| ${siteConfig.name}`)) {
    return pageTitle;
  }
  return `${pageTitle} | ${siteConfig.name}`;
}

export function buildCanonical(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${siteConfig.url}${cleanPath}`;
}
