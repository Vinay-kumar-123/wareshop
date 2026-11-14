import api from './api.js';

export const blogService = {
  async getBlogs({ page = 1, limit = 9, category = '', search = '' } = {}) {
    const params = new URLSearchParams({ page, limit });
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    return api.get(`/blogs?${params.toString()}`);
  },

  async getBlogBySlug(slug) {
    return api.get(`/blogs/${slug}`);
  },

  async getBlogCategories() {
    return api.get('/blogs/categories');
  },
};

export default blogService;
