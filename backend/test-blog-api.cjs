const http = require('http');

async function testBlogEndpoints() {
  const { default: app } = await import('./src/app.js');
  const server = app.listen(5003, async () => {
    console.log('BLOG_TEST_SERVER_5003');

    // 1. Test GET /api/v1/blogs
    const res1 = await get('/api/v1/blogs');
    console.log('TEST 1 (Get All Blogs):', res1.statusCode, 'Total:', res1.body.data?.blogs?.length);

    // 2. Test GET /api/v1/blogs/categories
    const res2 = await get('/api/v1/blogs/categories');
    console.log('TEST 2 (Get Categories):', res2.statusCode, 'Categories:', res2.body.data);

    // 3. Test GET /api/v1/blogs/how-to-choose-interior-designer (Valid slug)
    const res3 = await get('/api/v1/blogs/how-to-choose-interior-designer');
    console.log('TEST 3 (Get Valid Slug):', res3.statusCode, 'Title:', res3.body.data?.title);

    // 4. Test GET /api/v1/blogs/non-existent-article (Invalid slug - expect 404)
    const res4 = await get('/api/v1/blogs/non-existent-article');
    console.log('TEST 4 (Invalid Slug 404):', res4.statusCode, res4.body.message);

    // 5. Test Filter by Category
    const res5 = await get('/api/v1/blogs?category=' + encodeURIComponent('Home & Construction'));
    console.log('TEST 5 (Category Filter):', res5.statusCode, 'Count:', res5.body.data?.blogs?.length);

    // 6. Test Search Query
    const res6 = await get('/api/v1/blogs?search=Interior');
    console.log('TEST 6 (Search Filter):', res6.statusCode, 'Count:', res6.body.data?.blogs?.length);

    server.close();
    process.exit(0);
  });
}

function get(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:5003${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    });
  });
}

testBlogEndpoints();
