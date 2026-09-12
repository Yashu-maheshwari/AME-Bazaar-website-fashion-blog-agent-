/**
 * ==============================================================================
 * AME Bazaar Fashion AI Content Engine - Google Apps Script Port
 * Module: BusinessKnowledge.gs
 * ==============================================================================
 * Verified Business Facts Object. Do not allow AI to invent facts.
 */

const BUSINESS_ENTITY = {
  name: "AME Bazaar",
  legal_or_registered_name_if_verified: "Apparel Maheshwari Enterprises",
  website: "https://amebazaar.in",
  address: "Mubarakpur Road",
  locality: "Kirari",
  city: "Delhi",
  state: "Delhi",
  postalCode: "110086",
  country: "India",
  phone: "+91 99535 69533",
  categories: ["Family Clothing Store", "Women's Clothing Store", "Men's Clothing Store", "Children's Clothing Store", "Ethnic Wear Shop"],
  services: ["In-store shopping", "Custom Tailoring", "Alterations"],
  productCategories: ["Ladies Wear", "Gents Wear", "Boys Wear", "Girls Wear", "Kids Wear", "Family Fashion", "Ethnic Wear", "Western Wear", "Casual Wear", "Formal Wear", "Party Wear", "Wedding / Marriage Wear", "Festive Wear", "Seasonal Wear", "Tailoring / Alteration / Fitting", "Garment Care / Styling", "Local Clothing Store / Shopping Guides", "Fashion Trends", "Outfit Guides", "Shopping Guides"],
  tailoringServices: "Bespoke stitching and custom alteration services for men's, women's, and children's clothing.",
  openingHours: "10:00 AM - 9:00 PM",
  brandPromise: "Premium quality family fashion at affordable prices in Kirari.",
  businessDescription: "AME Bazaar is a premier family clothing store located on Mubarakpur Road in Kirari, Delhi. We offer a wide range of fashionable apparel including men's wear, women's ethnic and western wear, boys' and girls' clothing, and baby wear. Our store also provides expert custom tailoring and alteration services for the whole family.",
  googleReviewsUrl: "https://g.page/r/amebazaar/review",
  verifiedFacts: [
    "AME Bazaar is an offline physical retail store.",
    "Customers can visit the store to try on clothes.",
    "Customers can inquire about products via WhatsApp or phone call.",
    "Located in Kirari, Mubarakpur Road, Delhi.",
    "Offers custom tailoring and alterations for men, women, and children.",
    "The official Google Reviews link is https://g.page/r/amebazaar/review."
  ],
  validInternalLinks: [
    "https://amebazaar.in",
    "https://amebazaar.in/shop",
    "https://amebazaar.in/product-category/mens-wear",
    "https://amebazaar.in/product-category/womens-wear",
    "https://amebazaar.in/product-category/kids-wear",
    "https://amebazaar.in/services",
    "https://amebazaar.in/contact",
    "https://g.page/r/amebazaar/review",
    "https://g.page/r/amebazaar",
    "https://maps.google.com/?q=AME+Bazaar+Kirari+Delhi"
  ]
};

function getBusinessEntityString() {
  return JSON.stringify(BUSINESS_ENTITY, null, 2);
}

/**
 * Returns the current season in India/Delhi based on calendar month.
 * @returns {string}
 */
function getCurrentSeason() {
  const month = new Date().getMonth(); // 0-indexed (0 = Jan, 11 = Dec)
  if (month >= 11 || month <= 1) { // Dec, Jan, Feb
    return "Winter";
  } else if (month >= 2 && month <= 5) { // Mar, Apr, May, Jun
    return "Summer";
  } else if (month >= 6 && month <= 8) { // Jul, Aug, Sep
    return "Monsoon";
  } else { // Oct, Nov
    return "Autumn/Festive Transition";
  }
}

/**
 * Returns upcoming or current Indian fashion occasions based on month.
 * @returns {string}
 */
function getApproachingOccasions() {
  const month = new Date().getMonth(); // 0-indexed
  if (month === 7 || month === 8) { // Aug, Sep
    return "Ganesh Chaturthi, Raksha Bandhan, Janmashtami, and early Autumn festive styling";
  } else if (month === 9 || month === 10) { // Oct, Nov
    return "Diwali, Dussehra, and the onset of the winter wedding season";
  } else if (month >= 11 || month <= 1) { // Dec, Jan, Feb
    return "Peak winter wedding season, family weddings, and winter celebrations";
  } else if (month === 2 || month === 3) { // Mar, Apr
    return "Holi, spring festival, and summer collection launches";
  } else if (month === 4 || month === 5) { // May, Jun
    return "School reopening, summer holiday family wear";
  } else { // Jul
    return "Monsoon styling, Teej, and Rakhi preparations";
  }
}
