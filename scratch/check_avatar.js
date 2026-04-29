const http = require('http');

http.get('http://localhost:3000/avatar.jpg', (res) => {
  console.log('Status Code:', res.statusCode);
  console.log('Headers:', res.headers);
  res.resume();
}).on('error', (e) => {
  console.error(`Got error: ${e.message}`);
});
