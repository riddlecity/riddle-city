const https = require('http');

async function testRefresh() {
  console.log('🔄 Testing refresh API...\n');
  
  const data = JSON.stringify({
    adminKey: 'riddle-city-refresh-2025'
  });

  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/refresh-hours',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      console.log(`Status: ${res.statusCode}`);
      console.log(`Headers: ${JSON.stringify(res.headers)}`);
      
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        console.log('Response body:', body);
        resolve(body);
      });
    });

    req.on('error', (err) => {
      console.error('Error:', err.message);
      reject(err);
    });

    req.write(data);
    req.end();
  });
}

testRefresh().catch(console.error);