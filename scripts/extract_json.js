const fs = require('fs');
const logPath = 'C:\\\\Users\\\\astuj\\\\.gemini\\\\antigravity\\\\brain\\\\10150d82-9596-4ccf-a451-4d1acec34cba\\\\.system_generated\\\\logs\\\\overview.txt';
const logContent = fs.readFileSync(logPath, 'utf8');

const regex = /\[\s*\{\s*"id":\s*"1",[\s\S]*?\}\s*\]/g;
let match;
let lastMatch = null;

while ((match = regex.exec(logContent)) !== null) {
  lastMatch = match[0];
}

if (!lastMatch) {
  console.log('Could not find JSON array');
  process.exit(1);
}

try {
  let cleanJson = lastMatch.replace(/,\s*\]$/, ']'); // Remove trailing comma if exists
  const data = JSON.parse(cleanJson);
  fs.writeFileSync('scripts/extracted_data.json', JSON.stringify(data, null, 2));
  console.log('Successfully extracted ' + data.length + ' items');
} catch (e) {
  console.log('Failed to parse JSON:', e.message);
  fs.writeFileSync('scripts/extracted_data_raw.txt', lastMatch);
}
