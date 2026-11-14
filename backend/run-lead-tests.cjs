const http = require('http');

async function run() {
  const { default: app } = await import('./src/app.js');
  const server = app.listen(5001, async () => {
    console.log('SERVER_ONLINE');

    // 1. Test Valid Enquiry
    const enquiryPayload = JSON.stringify({
      name: 'Aakash Sharma',
      phone: '9820123456',
      email: 'aakash@example.com',
      category: 'home-construction',
      service: 'Interior Design',
      city: 'Mumbai',
      location: 'Andheri West',
      pinCode: '400053',
      requirements: 'Full 2BHK interior redesign with modular kitchen and false ceiling.',
      estimatedBudget: '5 - 8 Lakhs',
      expectedTimeline: 'Within 2 months',
      consentToContact: true,
      consentProviderSharing: true,
    });

    const res1 = await makeRequest('/api/v1/leads/enquiry', enquiryPayload);
    console.log('TEST 1 (Enquiry Success):', JSON.stringify(res1));

    // 2. Test Missing Required Phone
    const badPayload = JSON.stringify({
      name: 'Aakash Sharma',
      phone: '',
      consentToContact: true,
      consentProviderSharing: true,
    });
    const res2 = await makeRequest('/api/v1/leads/enquiry', badPayload);
    console.log('TEST 2 (Validation Failure):', JSON.stringify(res2));

    // 3. Test Missing Consent
    const noConsentPayload = JSON.stringify({
      name: 'Aakash Sharma',
      phone: '9820123456',
      category: 'home-construction',
      service: 'Interior Design',
      city: 'Mumbai',
      requirements: 'Full 2BHK interior redesign project.',
      consentToContact: false,
      consentProviderSharing: false,
    });
    const res3 = await makeRequest('/api/v1/leads/enquiry', noConsentPayload);
    console.log('TEST 3 (Consent Rejection):', JSON.stringify(res3));

    // 4. Test Partner Application Success
    const partnerPayload = JSON.stringify({
      businessName: 'Verve Event Curators LLP',
      contactPerson: 'Vikram Malhotra',
      phone: '9811122334',
      email: 'contact@verveevents.com',
      category: 'events-lifestyle',
      servicesOffered: ['Wedding Planning', 'Theme Decor', 'Floral Artistry'],
      city: 'New Delhi',
      serviceAreas: ['South Delhi', 'Gurugram', 'Noida'],
      website: 'https://verveevents.example.com',
      businessDescription: 'Premium turnkey wedding management and destination wedding curation across India.',
      consentToContact: true,
    });
    const res4 = await makeRequest('/api/v1/leads/partner', partnerPayload);
    console.log('TEST 4 (Partner Success):', JSON.stringify(res4));

    // 5. Test Missing Partner Business Name
    const badPartner = JSON.stringify({
      businessName: '',
      contactPerson: 'Vikram',
      phone: '9811122334',
      email: 'contact@example.com',
      consentToContact: true,
    });
    const res5 = await makeRequest('/api/v1/leads/partner', badPartner);
    console.log('TEST 5 (Partner Validation):', JSON.stringify(res5));

    server.close();
    process.exit(0);
  });
}

function makeRequest(path, data) {
  return new Promise((resolve) => {
    const req = http.request(
      {
        hostname: 'localhost',
        port: 5001,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode, body: JSON.parse(body) });
          } catch {
            resolve({ statusCode: res.statusCode, body });
          }
        });
      }
    );
    req.on('error', (err) => resolve({ error: err.message }));
    req.write(data);
    req.end();
  });
}

run();
