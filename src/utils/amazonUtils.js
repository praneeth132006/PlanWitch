import { AFFILIATE_CONFIG } from '../config/affiliateConfig';

/**
 * Detects the user's preferred Amazon domain based on their locale.
 * Fallbacks to the default domain if detection is disabled or fails.
 */
export const getAmazonDomain = () => {
  if (!AFFILIATE_CONFIG.AUTO_DETECT_DOMAIN) {
    return AFFILIATE_CONFIG.DEFAULT_DOMAIN;
  }

  try {
    // Check if Intl is available (should be in modern React Native)
    if (typeof Intl !== 'undefined' && Intl.NumberFormat) {
      const locale = Intl.NumberFormat().resolvedOptions().locale;
      const countryCode = locale.split('-').pop().toUpperCase();
      
      const domainMap = {
        'US': 'amazon.com',
        'IN': 'amazon.in',
        'GB': 'amazon.co.uk',
        'CA': 'amazon.ca',
        'DE': 'amazon.de',
        'FR': 'amazon.fr',
        'IT': 'amazon.it',
        'ES': 'amazon.es',
        'JP': 'amazon.co.jp',
        'AU': 'amazon.com.au',
        'BR': 'amazon.com.br',
        'MX': 'amazon.com.mx',
      };
      
      return domainMap[countryCode] || AFFILIATE_CONFIG.DEFAULT_DOMAIN;
    }
  } catch (e) {
    console.warn('[AmazonUtils] Failed to detect locale, using default domain:', e);
  }

  return AFFILIATE_CONFIG.DEFAULT_DOMAIN;
};

/**
 * Generates an Amazon search URL with the affiliate tag.
 */
export const getAmazonAffiliateURL = (itemName) => {
  const domain = getAmazonDomain();
  const tag = AFFILIATE_CONFIG.DEFAULT_ASSOCIATE_TAG;
  return `https://www.${domain}/s?k=${encodeURIComponent(itemName)}&tag=${tag}`;
};
