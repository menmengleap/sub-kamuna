# MySub CLI - Advanced Subdomain Enumeration Tool

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

[CL] Git Clone 

### Prerequisites

- Node.js (v14 or higher)
- Subfinder (optional but recommended)

### Install Subfinder (Recommended)

```bash
# Go
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest

# Or using apt (Linux)
sudo apt install subfinder

# Or using brew (macOS)
brew install subfinder