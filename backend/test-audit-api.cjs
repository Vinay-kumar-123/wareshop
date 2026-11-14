const http = require('http');

async function testApiErrors() {
  const { default: app } = await import('./src/app.js');
  const server = app.listen(5002, async () => {
    console.log('AUDIT_SERVER_PORT_5002');

    // Test Rate Limiter (send 12 requests in a row)
    console.log('--- Testing Rate Limiting (12 requests) ---');
    let rateLimitedCount = 0;
    for (let i = 0; i < 12; i++) {
      const res = await post('/api/v1/leads/enquiry', JSON.stringify({ name: 'Test' }));
      if (res.statusCode === 429) {
        rateLimitedCount++;
      }
    }
    console.log(`Rate Limited Requests (429): ${rateLimitedCount}`);

    server.close();
    process.exit(0);
  });
}

function post(path, data) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: 5002,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      }
    }, res => {
      let b = '';
      res.on('data', d => b += d);
      res.on('end', () => resolve({ statusCode: res.statusCode, body: b }));
    });
    req.write(data);
    req.end();
  });
}

testApiErrors();
