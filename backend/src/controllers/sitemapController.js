import mongoose from 'mongoose';
import Provider from '../models/Provider.js';
import env from '../config/env.js';
import logger from '../utils/logger.js';

const SITE_URL = 'https://wareshop.in';

// Static public pages that belong in the sitemap
const STATIC_ROUTES = [
  { loc: '/', changefreq: 'weekly', priority: '1.0' },
  { loc: '/categories', changefreq: 'weekly', priority: '0.9' },
  { loc: '/categories/shop', changefreq: 'weekly', priority: '0.8' },
  { loc: '/categories/office', changefreq: 'weekly', priority: '0.8' },
  { loc: '/categories/warehouse', changefreq: 'weekly', priority: '0.8' },
  { loc: '/categories/godown', changefreq: 'weekly', priority: '0.8' },
  { loc: '/providers', changefreq: 'weekly', priority: '0.8' },
  { loc: '/become-a-partner', changefreq: 'monthly', priority: '0.8' },
  { loc: '/about', changefreq: 'monthly', priority: '0.6' },
  { loc: '/privacy-policy', changefreq: 'yearly', priority: '0.4' },
  { loc: '/terms', changefreq: 'yearly', priority: '0.4' },
];

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export const sitemapController = {
  /**
   * GET /sitemap.xml
   * Dynamically generates an XML sitemap of all static pages, published blog articles,
   * and verified published provider profiles.
   */
  async getSitemap(req, res, next) {
    try {
      const isDbConnected = mongoose.connection.readyState === 1;
      let providers = [];

      if (isDbConnected) {
        try {
          providers = await Provider.find({ verificationStatus: 'VERIFIED', publicationStatus: 'PUBLISHED' })
              .select('slug publishedAt updatedAt')
              .sort({ publishedAt: -1 })
              .lean();
        } catch (dbErr) {
          logger.warn('Failed querying published provider records for sitemap', { error: dbErr.message });
        }
      }

      // Build XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

      // 1. Static Routes
      for (const route of STATIC_ROUTES) {
        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(`${SITE_URL}${route.loc}`)}</loc>\n`;
        xml += `    <changefreq>${route.changefreq}</changefreq>\n`;
        xml += `    <priority>${route.priority}</priority>\n`;
        xml += '  </url>\n';
      }

      // 2. Verified & Published Provider Profiles
      const seenProviderSlugs = new Set();
      for (const provider of providers) {
        if (!provider.slug || seenProviderSlugs.has(provider.slug)) continue;
        seenProviderSlugs.add(provider.slug);

        const lastmodDate = provider.updatedAt || provider.publishedAt || new Date();
        const lastmodFormatted = new Date(lastmodDate).toISOString().split('T')[0];

        xml += '  <url>\n';
        xml += `    <loc>${escapeXml(`${SITE_URL}/providers/${provider.slug}`)}</loc>\n`;
        xml += `    <lastmod>${lastmodFormatted}</lastmod>\n`;
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }

      xml += '</urlset>';

      res.header('Content-Type', 'application/xml; charset=utf-8');
      res.header('Cache-Control', 'public, max-age=3600, stale-while-revalidate=600');
      return res.status(200).send(xml);
    } catch (err) {
      logger.error('Error generating dynamic sitemap', { error: err.message });
      next(err);
    }
  },
};

export default sitemapController;
