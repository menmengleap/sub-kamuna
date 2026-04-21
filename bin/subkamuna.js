#!/usr/bin/env node

const dns = require('dns').promises;
const https = require('https');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
let domain = null;
let onlyLive = false;
let verbose = false;
let threads = 30;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--only-live') onlyLive = true;
  else if (args[i] === '-v' || args[i] === '--verbose') verbose = true;
  else if (args[i] === '-t' && args[i+1]) threads = parseInt(args[++i]);
  else if (!domain && !args[i].startsWith('-')) domain = args[i];
}

if (!domain) {
  console.error('❌ Error: Please provide a domain');
  console.log('\nUsage:');
  console.log('  node bin/scan.js <domain> [options]');
  console.log('\nOptions:');
  console.log('  --only-live    Show only live domains');
  console.log('  -t <number>    Thread count (default: 30)');
  console.log('  -v, --verbose  Verbose output');
  console.log('\nExample:');
  console.log('  node bin/scan.js thaikit.net --only-live');
  process.exit(1);
}

console.log(`\n                                          `);
console.log(`                SubKamuna-v1.0               `);
console.log(`                                            `);
console.log(`\n[Tar] Target: ${domain}`);
console.log(`[+]  Threads: ${threads}`);
console.log(`[-] Only Live: ${onlyLive ? 'Yes' : 'No'}`);
console.log(`\n`);

// Common subdomain wordlist
const wordlist = [
  'www', 'mail', 'ftp', 'localhost', 'webmail', 'smtp', 'pop', 'ns1', 'webdisk',
  'ns2', 'cpanel', 'whm', 'autodiscover', 'autoconfig', 'm', 'imap', 'test',
  'ns', 'blog', 'pop3', 'dev', 'www2', 'admin', 'forum', 'news', 'vpn', 'ns3',
  'mail2', 'new', 'mysql', 'old', 'lists', 'support', 'mobile', 'mx', 'static',
  'docs', 'beta', 'shop', 'sql', 'secure', 'demo', 'cp', 'calendar', 'wiki',
  'web', 'media', 'email', 'images', 'img', 'download', 'dns', 'piwik', 'stats',
  'dashboard', 'portal', 'manage', 'start', 'info', 'app', 'apps', 'api', 'svn',
  'backup', 'git', 'crm', 'faq', 'help', 'status', 'live', 'stream', 'chat',
  'cloud', 'remote', 'exchange', 'owa', 'lync', 'sharepoint', 'vpn', 'vps'
];

async function checkSubdomain(sub) {
  const hostname = `${sub}.${domain}`;
  try {
    await dns.lookup(hostname);
    return hostname;
  } catch (err) {
    return null;
  }
}

async function checkHTTP(hostname) {
  const protocols = ['https', 'http'];
  for (const protocol of protocols) {
    const url = `${protocol}://${hostname}`;
    try {
      const result = await new Promise((resolve, reject) => {
        const lib = protocol === 'https' ? https : http;
        const req = lib.get(url, { timeout: 5000 }, (res) => {
          let body = '';
          res.on('data', () => {});
          res.on('end', () => {
            resolve({
              url: url,
              status: res.statusCode,
              server: res.headers['server'] || 'unknown'
            });
          });
        });
        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return result;
    } catch (err) {
      // Continue to next protocol
    }
  }
  return null;
}

async function main() {
  console.log('[D] DNS Brute force scanning...\n');
  
  const found = [];
  const startTime = Date.now();
  
  // Process in batches
  for (let i = 0; i < wordlist.length; i += threads) {
    const batch = wordlist.slice(i, Math.min(i + threads, wordlist.length));
    const results = await Promise.all(batch.map(checkSubdomain));
    
    for (const result of results) {
      if (result) {
        found.push(result);
        if (verbose) console.log(`  ✓ ${result}`);
      }
    }
    
    // Show progress
    const percent = Math.round((Math.min(i + threads, wordlist.length) / wordlist.length) * 100);
    process.stdout.write(`\r  Progress: ${percent}% - Found: ${found.length} subdomains`);
  }
  
  console.log(`\n\n[F] Found ${found.length} subdomains in ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  
  // Save all subdomains if not only-live
  if (!onlyLive && found.length > 0) {
    const resultsDir = path.join(process.cwd(), 'results');
    await fs.mkdir(resultsDir, { recursive: true });
    await fs.writeFile(path.join(resultsDir, `${domain}_all.txt`), found.join('\n'));
    console.log(`[S] Saved all subdomains to results/${domain}_all.txt`);
  }
  
  // HTTP Probing
  if (found.length > 0) {
    console.log(`\n[H] HTTP Probing ${found.length} subdomains...\n`);
    
    const live = [];
    const httpStartTime = Date.now();
    
    for (let i = 0; i < found.length; i += threads) {
      const batch = found.slice(i, Math.min(i + threads, found.length));
      const results = await Promise.all(batch.map(checkHTTP));
      
      for (const result of results) {
        if (result) {
          live.push(result);
          const statusColor = result.status >= 200 && result.status < 300 ? '✓' : 
                             result.status >= 300 && result.status < 400 ? '→' : 
                             result.status >= 400 && result.status < 500 ? '⚠' : '✗';
          console.log(`  ${statusColor} ${result.url} [${result.status}] [${result.server}]`);
        }
      }
      
      // Show progress
      const percent = Math.round((Math.min(i + threads, found.length) / found.length) * 100);
      process.stdout.write(`\r  Progress: ${percent}% - Live: ${live.length}`);
    }
    
    console.log(`\n\n[F] Found ${live.length} live services in ${((Date.now() - httpStartTime) / 1000).toFixed(1)}s`);
    
    // Save live results
    if (live.length > 0) {
      const resultsDir = path.join(process.cwd(), 'results');
      await fs.mkdir(resultsDir, { recursive: true });
      
      const liveUrls = live.map(l => `${l.url} (${l.status})`);
      await fs.writeFile(path.join(resultsDir, `${domain}_live.txt`), liveUrls.join('\n'));
      console.log(`[S] Saved live domains to results/${domain}_live.txt`);
      
      // Save JSON report
      const report = {
        domain: domain,
        timestamp: new Date().toISOString(),
        total: found.length,
        live: live.length,
        all_subdomains: found,
        live_subdomains: liveUrls,
        scan_time_seconds: ((Date.now() - startTime) / 1000).toFixed(1)
      };
      await fs.writeFile(path.join(resultsDir, `${domain}_report.json`), JSON.stringify(report, null, 2));
      console.log(`[S] Saved JSON report to results/${domain}_report.json`);
    }
  }
  
  // Final summary
  console.log(`\n╔═══════════════════════════════════════════╗`);
  console.log(`║              SCAN COMPLETE                ║`);
  console.log(`╚═══════════════════════════════════════════╝`);
  console.log(`\n[S] Summary for ${domain}:`);
  console.log(`   • Total subdomains: ${found.length}`);
  console.log(`   • Live services: ${found.length > 0 ? (await (async () => {
    const resultsDir = path.join(process.cwd(), 'results');
    try {
      const liveFile = path.join(resultsDir, `${domain}_live.txt`);
      const content = await fs.readFile(liveFile, 'utf8');
      return content.split('\n').filter(l => l.trim()).length;
    } catch { return 0; }
  }))() : 0}`);
  console.log(`   • Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`\n[R] Results saved in 'results' folder\n`);
}

main().catch(error => {
  console.error('\n[E] Error:', error.message);
  process.exit(1);
});