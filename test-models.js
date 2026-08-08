const fs = require('fs');
const envPath = '.env.local';
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      let val = match[2].trim();
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      process.env[match[1].trim()] = val;
    }
  }
}

const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');
const sql = neon(process.env.DATABASE_URL);

function decryptKey(encrypted) {
  const key = Buffer.from(process.env.ADMIN_ENCRYPTION_KEY);
  const [ivHex, data] = encrypted.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(data, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

async function run() {
  const rows = await sql`SELECT key_encrypted FROM api_keys WHERE provider = 'gemini' AND is_active = true LIMIT 1`;
  if (!rows.length) {
    console.log("No gemini key found");
    return;
  }
  const apiKey = decryptKey(rows[0].key_encrypted);
  console.log("Key prefix:", apiKey.substring(0, 10));
  
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + apiKey);
  const json = await res.json();
  if (json.error) {
    console.error("API error:", json.error);
    return;
  }
  console.log("Available models:", json.models?.map(m => m.name).join(', '));
}

run().catch(console.error);
