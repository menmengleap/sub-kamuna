# SubKamuna CLI -  Subdomain Enumeration Tool

![App Screenshot](SubKamuna/SubKamuna.png)

 A powerful CLI tool for subdomain enumeration with HTTP probing, live filtering, and multi-domain support.

## Features

-  **Fast Subdomain Discovery** - Uses subfinder with DNS brute force fallback
-  **HTTP Probing** - Checks for live HTTP/HTTPS services
-  **Live Filtering** - Filter only responsive domains
-  **Multi-Domain Support** - Scan multiple domains from a file
-  **Threading Control** - Configurable concurrency for optimal performance
-  **Auto-Save Results** - Saves results in multiple formats (JSON, TXT)
-  **Pipeline Ready** - JSON output for integration with other tools
-  **Beautiful Output** - Color-coded results with progress bars

## Installation
```sh
=======================================================
Git Clone https://github.com/menmengleap/sub-kamuna.git
=======================================================
```
## Using 
```sh
[+] Practical Examples

1. Bug Bounty Hunting

bash

# Fast scan for bug bounty
node bin/subkamuna.js target.com -t 100 --only-live -v

2. Company Asset Discovery

bash

# Create company domains file

echo "company.com" > assets.txt
echo "company.net" >> assets.txt
echo "company.org" >> assets.txt

# Scan all assets

node bin/subkamuna.js -l assets.txt --only-live -o company_assets.json

3. Quick Reconnaissance

bash

# Fast scan with high threads and low timeout
node bin/subkamuna.js example.com -t 150 -to 2 --only-live

4. Safe Network Scanning

bash

# Conservative settings to avoid rate limiting
node bin/subkamuna.js example.com -t 10 -to 10

5. Daily Monitoring Script

node bin/subkamuna.js -l monitored.txt --only-live -o "scan_%DATE%.json"
echo Scan completed on %DATE%

6. Integration with Other Tools
bash

# Pipe to httpx for additional probing
node bin/subkamuna.js example.com --only-live -s | httpx -silent

# Extract only URLs with jq
node bin/subkamuna.js example.com -s | jq '.live_subdomains'

# Count by status code
node bin/subkamuna.js example.com -s | findstr /c:"(200)" /c:"(301)" /c:"(404)"
```
## Help
```sh
# Display help menu
node bin/subkamuna.js --help

# Display version
node bin/subkamuna.js --version

# Verbose output for debugging
node bin/subkamuna.js example.com -v
```
## Use Case Scenarios
```sh
Scenario 1: Security Audit

bash

# Goal: Find all exposed subdomains of a company
node bin/subkamuna.js company.com -t 80 --only-live -v -o audit_results.json

Scenario 2: CI/CD Pipeline

bash

# Goal: Automate subdomain check in deployment pipeline
node bin/subkamuna.js staging.myapp.com -s --only-live
if %errorlevel% equ 0 (
    echo "All systems operational"
) else (
    echo "Issues detected"
)

Scenario 3: Research Project

bash

# Goal: Scan multiple research targets
node bin/subkamuna.js -l research_targets.txt -t 50 -o research_data.json

Scenario 4: Monitoring

bash

# Goal: Weekly scan of monitored domains
for /f %i in (monitored.txt) do (
    node bin/subkamuna.js %i --only-live -o "weekly_%i.json"
)
```
## ALL Option
```sh
Usage: subkamuna [options] [domain]

Options:
  -d, --domain <domain>      Single domain to scan
  -l, --list <file>          File containing list of domains
  -o, --output <file>        Output file for results
  -t, --threads <number>     Number of concurrent threads (default: 50)
  -to, --timeout <seconds>   HTTP request timeout (default: 5)
  --no-http                  Skip HTTP probing
  --only-live                Show only live domains
  -v, --verbose              Verbose output
  -s, --silent               Silent mode (minimal output)
  -h, --help                 Display help
  -V, --version              Display version
```
![Github](https://github.com/menmengleap)
