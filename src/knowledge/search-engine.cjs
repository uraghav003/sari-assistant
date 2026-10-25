/**
 * SARI Sovereign Banks & Lending Knowledgebase Search Engine (CommonJS)
 * Single Source of Truth for Divyanshi Capital Pvt Ltd
 */

const fs = require('node:fs');
const path = require('node:path');

const CATALOG_PATH = path.join(__dirname, 'banks-catalog.json');

function loadCatalog() {
  try {
    if (fs.existsSync(CATALOG_PATH)) {
      return JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf8'));
    }
  } catch (err) {
    console.warn('[Knowledgebase] Could not load banks-catalog.json:', err.message);
  }
  return { products: [], banks: {}, tatMap: {}, variants: {}, docMatrix: {} };
}

const catalog = loadCatalog();

const ROI_STARTING_RATES = {
  'PERSONAL LOAN': '9.99%',
  'BUSINESS LOAN': '14.00%',
  'PROFESSIONAL LOAN': '9.75%',
  'MACHINERY LOAN': '11.50%',
  'HOME LOAN': '8.40%',
  'LOAN AGAINST PROPERTY': '9.50%',
  'WORKING CAPITAL': '8.50%',
  'AUTO LOAN': '8.65%',
  'EDUCATION LOAN': '9.25%',
  'GOLD LOAN': '9.90%',
  'PROJECT LOAN': '10.50%',
};

function searchBanks(criteria = {}) {
  const query = String(criteria.query || '').trim().toLowerCase();
  const productKey = criteria.product
    ? String(criteria.product).trim().toUpperCase()
    : null;
  const amount = Number(criteria.amount) || 0;

  // Determine applicable products
  const targetProducts = productKey && catalog.banks[productKey]
    ? [productKey]
    : (catalog.products || []).filter(p => !productKey || p.includes(productKey) || productKey.includes(p));

  const matched = [];

  for (const prod of (targetProducts.length > 0 ? targetProducts : Object.keys(catalog.banks))) {
    const bankList = catalog.banks[prod] || [];
    const startingRate = ROI_STARTING_RATES[prod] || '10.50%';
    const tatDays = catalog.tatMap?.[prod] || 5;

    for (const bank of bankList) {
      if (!query || bank.toLowerCase().includes(query) || prod.toLowerCase().includes(query) || query.includes(bank.toLowerCase()) || query.includes(prod.toLowerCase())) {
        matched.push({
          bank,
          product: prod,
          startingRate,
          tatDays,
          variants: catalog.variants?.[prod] || [],
        });
      }
    }
  }

  // Multi-Loan Split Advice Rule (Amounts >= 50 Lakhs)
  let splitRecommendation = null;
  if (amount >= 5000000) {
    const half = Math.round(amount / 2);
    const inr = (v) => '₹' + v.toLocaleString('en-IN');
    splitRecommendation = {
      recommended: true,
      reason: 'Loan amount exceeds ₹50 Lakhs. Multi-bank split recommended to optimize approval probability and TAT.',
      structure: [
        { bankOption: 'Primary Private Bank (e.g. HDFC / ICICI)', amount: half, formatted: inr(half) },
        { bankOption: 'Secondary Partner Bank / NBFC (e.g. Axis / Bajaj / Tata Capital)', amount: half, formatted: inr(half) },
      ],
    };
  }

  // Relevant document checklist
  const profileKey = (criteria.profile || '').toUpperCase();
  let requiredDocs = catalog.docMatrix?.COMMON || [];
  if (profileKey.includes('SALARIED')) {
    requiredDocs = [...requiredDocs, ...(catalog.docMatrix?.SALARIED || [])];
  } else if (profileKey.includes('BUSINESS')) {
    requiredDocs = [...requiredDocs, ...(catalog.docMatrix?.BUSINESS || [])];
  } else if (profileKey.includes('PROFESSIONAL') || profileKey.includes('DOCTOR') || profileKey.includes('CA')) {
    requiredDocs = [...requiredDocs, ...(catalog.docMatrix?.PROFESSIONAL || [])];
  }

  return {
    totalMatches: matched.length,
    results: matched.slice(0, 30),
    splitRecommendation,
    requiredDocuments: requiredDocs,
    allProducts: catalog.products,
  };
}

function getBankOptions(product) {
  const prodKey = String(product || '').trim().toUpperCase();
  const banks = catalog.banks[prodKey] || [];
  return banks.map(name => ({
    label: name,
    value: name,
    product: prodKey,
    startingRate: ROI_STARTING_RATES[prodKey] || '10.50%',
    tatDays: catalog.tatMap?.[prodKey] || 5,
  }));
}

module.exports = {
  catalog,
  searchBanks,
  getBankOptions,
  ROI_STARTING_RATES,
};
