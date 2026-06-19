const fs = require('fs');

const files = fs.readdirSync('.').filter(f => f.endsWith('.html'));

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/assets\/favicon-32x32\.png(\?v=\d+)?/g, 'assets/favicon-32x32.png?v=2');
  content = content.replace(/assets\/favicon\.png(\?v=\d+)?/g, 'assets/favicon.png?v=2');
  content = content.replace(/assets\/apple-touch-icon\.png(\?v=\d+)?/g, 'assets/apple-touch-icon.png?v=2');
  fs.writeFileSync(file, content);
});

console.log("HTML updated");
