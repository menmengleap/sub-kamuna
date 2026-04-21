const { exec } = require('child_process');
const util = require('util');
const axios = require('axios');
const chalk = require('chalk');
const ora = require('ora');
const cliProgress = require('cli-progress');
const pLimit = require('p-limit');
const dns = require('dns').promises;
const os = require('os');
const path = require('path');

const execPromise = util.promisify(exec);

class Subfinder {
  constructor(options = {}) {
    this.threads = options.threads || 30;
    this.timeout = options.timeout || 5;
    this.httpProbe = options.httpProbe !== false;
    this.onlyLive = options.onlyLive || false;
    this.verbose = options.verbose || false;
    this.silent = options.silent || false;
    this.windowsPath = options.windowsPath || false;
    this.isWindows = os.platform() === 'win32';
  }

  async scan(domain, outputStream = null) {
    // Step 1: Run subfinder
    const subdomains = await this.runSubfinder(domain);
    
    if (!this.silent && this.verbose) {
      console.log(chalk.blue(`[-F] Found ${subdomains.length} subdomains for ${domain}`));
    }

    // Step 2: HTTP probing if enabled
    let liveDomains = [];
    if (this.httpProbe && subdomains.length > 0) {
      liveDomains = await this.probeHTTP(subdomains, domain);
    } else {
      liveDomains = subdomains;
    }

    // Step 3: Filter only live if requested
    const results = this.onlyLive ? liveDomains : subdomains;
    const finalResults = this.onlyLive ? liveDomains : subdomains;

    // Step 4: Save results
    await this.saveResults(domain, finalResults, liveDomains, outputStream);

    return {
      domain,
      total: subdomains.length,
      live: liveDomains,
      all: finalResults
    };
  }

  async runSubfinder(domain) {
    const spinner = !this.silent ? ora(`Running subfinder on ${domain}...`).start() : null;
    
    try {
      let command;
      
      if (this.isWindows) {
        // Windows commands
        try {
          await execPromise('where subfinder');
          command = `subfinder -d ${domain} -silent -t ${this.threads}`;
        } catch (e) {
          // Try with .exe extension
          await execPromise('where subfinder.exe');
          command = `subfinder.exe -d ${domain} -silent -t ${this.threads}`;
        }
      } else {
        // Unix/Linux/Mac commands
        await execPromise('which subfinder');
        command = `subfinder -d ${domain} -silent -t ${this.threads}`;
      }
      
      const { stdout, stderr } = await execPromise(command);
      
      if (stderr && this.verbose) {
        console.error(chalk.yellow(`Subfinder warning: ${stderr}`));
      }
      
      const subdomains = stdout
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && line.includes(domain));
      
      if (spinner) spinner.succeed(`Found ${subdomains.length} subdomains`);
      return [...new Set(subdomains)];
      
    } catch (error) {
      if (spinner) spinner.fail('Subfinder failed');
      
      // Fallback to DNS brute force if subfinder not available
      if (error.message.includes('not found') || error.message.includes('recognized')) {
        if (!this.silent) {
          console.log(chalk.yellow('[NF]  Subfinder not found, using DNS brute force fallback'));
          console.log(chalk.gray('[TIP] Tip: Install subfinder from https://github.com/projectdiscovery/subfinder'));
        }
        return this.dnsBruteForce(domain);
      }
      
      throw error;
    }
  }

  async dnsBruteForce(domain) {
    const spinner = !this.silent ? ora(`DNS brute forcing ${domain}...`).start() : null;
    
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
      'cloud', 'remote', 'exchange', 'remote', 'owa', 'lync', 'sharepoint'
    ];
    
    const subdomains = [];
    const limit = pLimit(this.threads);
    const tasks = wordlist.map(sub => 
      limit(async () => {
        const hostname = `${sub}.${domain}`;
        try {
          await dns.lookup(hostname);
          subdomains.push(hostname);
          if (this.verbose && !this.silent) {
            console.log(chalk.green(`✓ ${hostname}`));
          }
        } catch (err) {
          // Domain doesn't resolve
        }
      })
    );
    
    await Promise.all(tasks);
    
    if (spinner) spinner.succeed(`Found ${subdomains.length} subdomains via DNS brute force`);
    return subdomains;
  }

  async probeHTTP(subdomains, parentDomain) {
    if (!this.silent) {
      console.log(chalk.blue(`\n[P] Probing ${subdomains.length} subdomains for HTTP services...`));
      console.log(chalk.gray(`[T]  Timeout: ${this.timeout}s | Threads: ${this.threads}`));
    }
    
    const liveDomains = [];
    const limit = pLimit(this.threads);
    const progressBar = !this.silent ? new cliProgress.SingleBar({
      format: 'Progress |{bar}| {percentage}% | {value}/{total} domains',
      barCompleteChar: '\u2588',
      barIncompleteChar: '\u2591',
      hideCursor: true
    }, cliProgress.Presets.shades_classic) : null;
    
    if (progressBar) {
      progressBar.start(subdomains.length, 0);
    }
    
    let completed = 0;
    const tasks = subdomains.map(subdomain =>
      limit(async () => {
        const result = await this.checkHTTP(subdomain);
        if (result) {
          liveDomains.push(result);
        }
        completed++;
        if (progressBar) {
          progressBar.update(completed);
        }
      })
    );
    
    await Promise.all(tasks);
    
    if (progressBar) {
      progressBar.stop();
    }
    
    if (!this.silent) {
      console.log(chalk.green(`[F] Found ${liveDomains.length} live HTTP services`));
    }
    
    return liveDomains;
  }

  async checkHTTP(subdomain) {
    const protocols = ['https', 'http'];
    const urls = protocols.map(protocol => `${protocol}://${subdomain}`);
    
    for (const url of urls) {
      try {
        const response = await axios.get(url, {
          timeout: this.timeout * 1000,
          maxRedirects: 5,
          validateStatus: status => status < 500,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) MySubBot/2.0'
          }
        });
        
        const statusCode = response.status;
        const statusText = response.statusText;
        const server = response.headers['server'] || 'unknown';
        const contentType = response.headers['content-type'] || 'unknown';
        const contentLength = response.headers['content-length'] || '?';
        
        const coloredStatus = this.getStatusColor(statusCode);
        
        if (this.verbose && !this.silent) {
          console.log(`${coloredStatus} ${url} [${server}] [${contentType.split(';')[0]}] [${contentLength} bytes]`);
        } else if (!this.silent) {
          console.log(chalk.gray(`✓ ${url} [${statusCode}]`));
        }
        
        return `${url} (${statusCode})`;
        
      } catch (error) {
        // Connection refused, timeout, etc. - not live
        if (this.verbose && !this.silent && error.code !== 'ECONNREFUSED') {
          console.log(chalk.gray(`✗ ${url} - ${error.message}`));
        }
      }
    }
    
    return null;
  }

  getStatusColor(statusCode) {
    if (statusCode >= 200 && statusCode < 300) return chalk.green(`[${statusCode}]`);
    if (statusCode >= 300 && statusCode < 400) return chalk.blue(`[${statusCode}]`);
    if (statusCode >= 400 && statusCode < 500) return chalk.yellow(`[${statusCode}]`);
    if (statusCode >= 500) return chalk.red(`[${statusCode}]`);
    return chalk.white(`[${statusCode}]`);
  }

  async saveResults(domain, allResults, liveResults, outputStream) {
    const timestamp = new Date().toISOString();
    
    const data = {
      domain,
      timestamp,
      total: allResults.length,
      live: liveResults.length,
      all_subdomains: allResults,
      live_subdomains: liveResults,
      platform: os.platform(),
      version: '2.0.0'
    };
    
    if (outputStream) {
      await outputStream.write(JSON.stringify(data, null, 2) + '\n');
    }
    
    // Also save to individual files in results directory
    const resultsDir = path.join(process.cwd(), 'results');
    
    try {
      await fs.mkdir(resultsDir, { recursive: true });
      
      // Save all subdomains
      const allFile = path.join(resultsDir, `${domain}_all.txt`);
      await fs.writeFile(allFile, allResults.join('\r\n'));
      
      // Save live subdomains
      const liveFile = path.join(resultsDir, `${domain}_live.txt`);
      await fs.writeFile(liveFile, liveResults.join('\r\n'));
      
      // Save JSON report
      const jsonFile = path.join(resultsDir, `${domain}_report.json`);
      await fs.writeFile(jsonFile, JSON.stringify(data, null, 2));
      
      if (!this.silent && this.verbose) {
        console.log(chalk.gray(`[R] Results saved to ${resultsDir}\\`));
      }
      
    } catch (error) {
      if (this.verbose) {
        console.error(chalk.red(`Error saving results: ${error.message}`));
      }
    }
  }
}

// Add fs for file operations
const fs = require('fs').promises;

module.exports = Subfinder;