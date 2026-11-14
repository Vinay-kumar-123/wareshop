import fs from 'fs';
import path from 'path';
import connectDB, { disconnectDB } from '../config/db.js';
import Blog from '../models/Blog.js';
import logger from '../utils/logger.js';

/**
 * Validates and normalizes slug
 */
function createSlug(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * CLI Script to safely import or update blog articles from JSON / Markdown files.
 * Prevents accidental duplicate publications, validates schemas, and supports draft/published states.
 * Usage:
 *   node src/scripts/publishBlog.js --file ./content/my-article.json
 *   node src/scripts/publishBlog.js --seed
 */
async function run() {
  const args = process.argv.slice(2);
  const isSeed = args.includes('--seed');
  const fileArgIndex = args.indexOf('--file');
  const filePath = fileArgIndex !== -1 ? args[fileArgIndex + 1] : null;

  await connectDB();

  try {
    if (isSeed) {
      logger.info('Seeding default high-quality blog articles into MongoDB...');
      const { defaultBlogs } = await import('../controllers/blogController.js');

      for (const item of defaultBlogs) {
        const slug = createSlug(item.slug || item.title);
        const existing = await Blog.findOne({ slug });

        if (existing) {
          logger.info(`Article "${slug}" already exists in database. Updating content...`);
          await Blog.findByIdAndUpdate(existing._id, {
            ...item,
            slug,
            updatedAt: new Date(),
          });
        } else {
          const blog = new Blog({
            ...item,
            slug,
            publishedAt: item.publishedAt || new Date(),
          });
          await blog.save();
          logger.info(`Created new blog article: "${slug}"`);
        }
      }

      logger.info('Database blog seeding complete.');
      return;
    }

    if (!filePath) {
      console.log(`
Usage:
  node src/scripts/publishBlog.js --seed
  node src/scripts/publishBlog.js --file <path-to-json-or-md>

Article JSON format:
{
  "title": "Required article title",
  "slug": "optional-custom-slug",
  "excerpt": "Required summary",
  "content": "Required markdown content body",
  "category": "Home & Construction",
  "tags": ["Tag1", "Tag2"],
  "author": { "name": "Author Name", "role": "Title" },
  "status": "published", // or "draft"
  "metaTitle": "SEO title",
  "metaDescription": "SEO description"
}
      `);
      return;
    }

    const resolvedPath = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found at: ${resolvedPath}`);
    }

    const raw = fs.readFileSync(resolvedPath, 'utf8');
    const articleData = JSON.parse(raw);

    // Validate Required Fields
    const required = ['title', 'excerpt', 'content', 'category'];
    for (const req of required) {
      if (!articleData[req] || typeof articleData[req] !== 'string' || !articleData[req].trim()) {
        throw new Error(`Validation failed: "${req}" is a required string.`);
      }
    }

    const slug = createSlug(articleData.slug || articleData.title);
    if (!slug) {
      throw new Error('Unable to generate a valid URL slug from the title.');
    }

    const existing = await Blog.findOne({ slug });

    if (existing) {
      logger.info(`Existing article found for slug "${slug}". Performing controlled update...`);
      const updated = await Blog.findByIdAndUpdate(
        existing._id,
        {
          ...articleData,
          slug,
          publishedAt: articleData.status === 'published' ? (existing.publishedAt || new Date()) : null,
          updatedAt: new Date(),
        },
        { new: true }
      );
      logger.info(`Successfully updated article: ${updated.slug} [Status: ${updated.status}]`);
    } else {
      const newArticle = new Blog({
        ...articleData,
        slug,
        status: articleData.status || 'draft',
        publishedAt: articleData.status === 'published' ? new Date() : null,
      });
      await newArticle.save();
      logger.info(`Successfully imported new article: ${newArticle.slug} [Status: ${newArticle.status}]`);
    }
  } catch (err) {
    logger.error('Blog publishing script failed', { error: err.message });
    process.exit(1);
  } finally {
    await disconnectDB();
    logger.info('Database disconnected. Script done.');
  }
}

run();
