import { readFileSync } from 'fs';
const content = readFileSync('/tmp/server_out.txt', 'utf8');
const lines = content.split('\n').filter(l => l.trim());
for (const line of lines) {
  try {
    const parsed = JSON.parse(line);
    if (parsed.err) {
      console.log('ERROR TYPE:', parsed.err.type);
      console.log('ERROR MSG:', parsed.err.message);
      console.log('STACK:', parsed.err.stack);
    }
  } catch {
    console.log('RAW:', line);
  }
}
