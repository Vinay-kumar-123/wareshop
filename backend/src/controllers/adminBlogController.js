import Blog from '../models/Blog.js';
import { successResponse, errorResponse } from '../utils/apiResponse.js';
import { logAdminActivity } from '../services/activityLogger.js';
import logger from '../utils/logger.js';

function createSlug(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export const adminBlogController = {
  /**
   * GET /api/v1/admin/blogs
   */
  async getBlogs(req, res, next) {
    try {
      const { status, search } = req.query;
      const query = {};

      if (status && status !== 'all') {
        query.status = status;
      }

      if (search) {
        const clean = search.trim();
        query.$or = [
          { title: { $regex: clean, $options: 'i' } },
          { excerpt: { $regex: clean, $options: 'i' } },
          { category: { $regex: clean, $options: 'i' } },
        ];
      }

      const blogs = await Blog.find(query).sort({ createdAt: -1 }).lean();
      return successResponse(res, blogs);
    } catch (err) {
      next(err);
    }
  },

  /**
   * GET /api/v1/admin/blogs/:id
   */
  async getBlogById(req, res, next) {
    try {
      const blog = await Blog.findById(req.params.id).lean();
      if (!blog) {
        return errorResponse(res, 'Blog article not found', 404);
      }
      return successResponse(res, blog);
    } catch (err) {
      next(err);
    }
  },

  /**
   * POST /api/v1/admin/blogs
   */
  async createBlog(req, res, next) {
    try {
      const {
        title,
        slug,
        excerpt,
        content,
        category,
        tags,
        author,
        coverImage,
        status = 'draft',
        metaTitle,
        metaDescription,
        relatedServiceSlug,
      } = req.body;

      if (!title || !excerpt || !content || !category) {
        return errorResponse(res, 'Title, excerpt, content, and category are required', 400);
      }

      let cleanSlug = createSlug(slug || title);
      let counter = 1;
      const baseSlug = cleanSlug;
      while (await Blog.findOne({ slug: cleanSlug })) {
        cleanSlug = `${baseSlug}-${counter++}`;
      }

      const blog = new Blog({
        title: title.trim(),
        slug: cleanSlug,
        excerpt: excerpt.trim(),
        content: content.trim(),
        category: category.trim(),
        tags: Array.isArray(tags) ? tags : [],
        author: author || { name: 'KONNEVIA Editorial Staff', role: 'Domain Contributor' },
        coverImage: coverImage || '',
        status: ['draft', 'published', 'archived'].includes(status) ? status : 'draft',
        publishedAt: status === 'published' ? new Date() : null,
        metaTitle: metaTitle || '',
        metaDescription: metaDescription || '',
        relatedServiceSlug: relatedServiceSlug || '',
      });

      await blog.save();
      logger.info('Admin created blog', { blogId: blog._id, slug: blog.slug, status: blog.status });

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'BLOG_CREATED',
        targetType: 'BLOG',
        targetId: String(blog._id),
        details: { title: blog.title, slug: blog.slug, status: blog.status },
        req,
      });

      return successResponse(res, blog, 'Blog article created successfully', 201);
    } catch (err) {
      next(err);
    }
  },

  /**
   * PUT /api/v1/admin/blogs/:id
   */
  async updateBlog(req, res, next) {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return errorResponse(res, 'Blog article not found', 404);
      }

      const updates = req.body;

      if (updates.title) blog.title = updates.title.trim();
      if (updates.excerpt) blog.excerpt = updates.excerpt.trim();
      if (updates.content) blog.content = updates.content.trim();
      if (updates.category) blog.category = updates.category.trim();
      if (updates.tags) blog.tags = updates.tags;
      if (updates.author) blog.author = updates.author;
      if (updates.coverImage !== undefined) blog.coverImage = updates.coverImage;
      if (updates.metaTitle !== undefined) blog.metaTitle = updates.metaTitle;
      if (updates.metaDescription !== undefined) blog.metaDescription = updates.metaDescription;
      if (updates.relatedServiceSlug !== undefined) blog.relatedServiceSlug = updates.relatedServiceSlug;

      if (updates.status && ['draft', 'published', 'archived'].includes(updates.status)) {
        if (updates.status === 'published' && blog.status !== 'published') {
          blog.publishedAt = new Date();
        }
        blog.status = updates.status;
      }

      if (updates.slug && updates.slug.trim()) {
        const cleanSlug = createSlug(updates.slug);
        const existing = await Blog.findOne({ slug: cleanSlug, _id: { $ne: blog._id } });
        if (!existing) {
          blog.slug = cleanSlug;
        }
      }

      await blog.save();
      logger.info('Admin updated blog', { blogId: blog._id, slug: blog.slug, status: blog.status });

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'BLOG_UPDATED',
        targetType: 'BLOG',
        targetId: String(blog._id),
        details: { title: blog.title, slug: blog.slug, status: blog.status },
        req,
      });

      return successResponse(res, blog, 'Blog article updated successfully');
    } catch (err) {
      next(err);
    }
  },

  /**
   * DELETE /api/v1/admin/blogs/:id
   */
  async archiveBlog(req, res, next) {
    try {
      const blog = await Blog.findById(req.params.id);
      if (!blog) {
        return errorResponse(res, 'Blog article not found', 404);
      }

      blog.status = 'archived';
      await blog.save();

      await logAdminActivity({
        adminEmail: req.admin?.email,
        action: 'BLOG_ARCHIVED',
        targetType: 'BLOG',
        targetId: String(blog._id),
        details: { title: blog.title, slug: blog.slug },
        req,
      });

      return successResponse(res, blog, 'Blog article archived successfully');
    } catch (err) {
      next(err);
    }
  },
};

export default adminBlogController;
