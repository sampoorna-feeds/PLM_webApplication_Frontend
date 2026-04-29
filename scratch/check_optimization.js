const http = require('http');

http.get('http://localhost:3000/_next/image?url=%2Flogo.png&w=48&q=75', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  res.resume();
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
