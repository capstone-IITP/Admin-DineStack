const fs = require('fs');
const https = require('https');
const path = require('path');

let token = process.env.GITHUB_PAT;
if (!token) {
  try {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const match = envFile.match(/GITHUB_PAT=([^\s\r\n]+)/);
    if (match) token = match[1];
  } catch (e) {}
}
if (!token) {
  console.error("❌ ERROR: GITHUB_PAT is not set in .env");
  process.exit(1);
}

const options = {
  hostname: 'api.github.com',
  path: '/repos/capstone-IITP/Schema-DineStack/contents/prisma/schema.prisma',
  headers: {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github.v3.raw',
    'User-Agent': 'Node.js'
  }
};

console.log("⬇️  Downloading schema from GitHub...");

const req = https.get(options, (res) => {
  if (res.statusCode !== 200) {
    console.error(`❌ ERROR: Failed to download schema. Status code: ${res.statusCode}`);
    process.exit(1);
  }

  const filePath = path.join(__dirname, 'prisma', 'schema.prisma');
  const file = fs.createWriteStream(filePath);
  res.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log("✅ Schema downloaded successfully!");
  });
});

req.on('error', (e) => {
  console.error(`❌ ERROR: ${e.message}`);
  process.exit(1);
});
