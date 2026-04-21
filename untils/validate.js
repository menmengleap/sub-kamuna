/**
 * Domain validation utilities
 */

/**
 * Check if domain is valid
 * @param {string} domain - Domain to validate
 * @returns {boolean} - True if valid
 */
function isValidDomain(domain) {
  if (!domain || typeof domain !== 'string') {
    return false;
  }
  
  domain = domain.trim().toLowerCase();
  
  // Check length
  if (domain.length > 253 || domain.length < 3) {
    return false;
  }
  
  // Check for valid domain pattern
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/;
  
  if (!domainRegex.test(domain)) {
    return false;
  }
  
  // Check for consecutive dots
  if (domain.includes('..')) {
    return false;
  }
  
  // Check for valid TLD (at least 2 characters after last dot)
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  if (tld.length < 2) {
    return false;
  }
  
  return true;
}

/**
 * Extract domain from URL
 * @param {string} url - URL to extract domain from
 * @returns {string|null} - Extracted domain or null
 */
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    // Try without protocol
    const match = url.match(/^(?:https?:\/\/)?([^\/]+)/i);
    if (match) {
      return match[1];
    }
    return null;
  }
}

/**
 * Normalize domain (remove www, etc.)
 * @param {string} domain - Domain to normalize
 * @returns {string} - Normalized domain
 */
function normalizeDomain(domain) {
  if (!domain) return '';
  
  domain = domain.trim().toLowerCase();
  
  // Remove trailing dot
  if (domain.endsWith('.')) {
    domain = domain.slice(0, -1);
  }
  
  // Remove www prefix
  if (domain.startsWith('www.')) {
    domain = domain.substring(4);
  }
  
  return domain;
}

/**
 * Check if domain is IP address
 * @param {string} domain - Domain to check
 * @returns {boolean} - True if IP address
 */
function isIPAddress(domain) {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
  
  return ipv4Regex.test(domain) || ipv6Regex.test(domain);
}

/**
 * Get domain parts
 * @param {string} domain - Domain to parse
 * @returns {Object} - Domain parts
 */
function parseDomain(domain) {
  if (!isValidDomain(domain)) {
    return null;
  }
  
  const parts = domain.split('.');
  const tld = parts[parts.length - 1];
  const sld = parts.length >= 2 ? parts[parts.length - 2] : null;
  const subdomain = parts.length >= 3 ? parts.slice(0, -2).join('.') : null;
  
  return {
    full: domain,
    subdomain,
    sld,
    tld,
    parts
  };
}

module.exports = {
  isValidDomain,
  extractDomain,
  normalizeDomain,
  isIPAddress,
  parseDomain
};