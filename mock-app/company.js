// Get company name from URL params
const urlParams = new URLSearchParams(window.location.search);
const companyName = urlParams.get('company');

// If no company name, redirect back to home
if (!companyName) {
    window.location.href = 'index.html';
}

// DOM Elements
const companyNameEl = document.getElementById('companyName');
const logoPlaceholder = document.getElementById('logoPlaceholder');
const logoInitial = document.getElementById('logoInitial');
const companyLogo = document.getElementById('companyLogo');
const employeeCount = document.getElementById('employeeCount');
const countryCount = document.getElementById('countryCount');
const revenue = document.getElementById('revenue');
const website = document.getElementById('website');
const continueBtn = document.getElementById('continueBtn');

// Store for company data
let companiesData = null;

// Load companies data from JSON
async function loadCompaniesData() {
    try {
        const response = await fetch('data/companies.json');
        companiesData = await response.json();
        return companiesData;
    } catch (error) {
        console.error('Error loading companies data:', error);
        return null;
    }
}

// Find company in data (case-insensitive partial match)
function findCompany(name, data) {
    if (!data || !data.companies) return null;

    const normalized = name.toLowerCase().trim();

    // Try exact match first
    let match = data.companies.find(c =>
        c.name.toLowerCase() === normalized
    );

    // Try partial match
    if (!match) {
        match = data.companies.find(c =>
            c.name.toLowerCase().includes(normalized) ||
            normalized.includes(c.name.toLowerCase())
        );
    }

    return match;
}

// Generate fallback data for unknown companies
function generateFallbackData(name) {
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const domain = name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';

    const employeeRanges = ['1-50', '50-200', '200-500', '500-1,000', '1,000-5,000'];
    const revenueRanges = ['$1M-$10M', '$10M-$50M', '$50M-$100M', '$100M-$500M'];

    return {
        name: name,
        domain: domain,
        employees: employeeRanges[hash % employeeRanges.length],
        countries: [],
        countryCount: (hash % 10) + 1,
        revenue: revenueRanges[hash % revenueRanges.length],
        headquarters: 'United States',
        multimediaLanguages: ['English'],
        isEstimated: true
    };
}

// Try to load company logo
function loadLogo(logoUrl, domain) {
    // Use provided logo URL, or fall back to Clearbit
    const primaryUrl = logoUrl || `https://logo.clearbit.com/${domain}`;
    const fallbackUrl = `https://logo.clearbit.com/${domain}`;

    const testImg = new Image();

    testImg.onload = function() {
        companyLogo.src = primaryUrl;
        companyLogo.style.display = 'block';
        logoPlaceholder.style.display = 'none';
    };

    testImg.onerror = function() {
        // If primary fails and we have a fallback, try that
        if (logoUrl && primaryUrl !== fallbackUrl) {
            const fallbackImg = new Image();
            fallbackImg.onload = function() {
                companyLogo.src = fallbackUrl;
                companyLogo.style.display = 'block';
                logoPlaceholder.style.display = 'none';
            };
            fallbackImg.onerror = function() {
                logoPlaceholder.style.display = 'flex';
                companyLogo.style.display = 'none';
            };
            fallbackImg.src = fallbackUrl;
        } else {
            logoPlaceholder.style.display = 'flex';
            companyLogo.style.display = 'none';
        }
    };

    testImg.src = primaryUrl;
}

// Initialize page
async function init() {
    // Load the companies data
    const data = await loadCompaniesData();
    console.log('Loaded data:', data);
    console.log('Looking for company:', companyName);

    // Find the company or generate fallback
    let company = findCompany(companyName, data);
    console.log('Found company:', company);

    if (company) {
        // Use real data from JSON
        company = {
            ...company,
            countryCount: company.countries.length,
            isEstimated: false
        };
        console.log('Using real data:', company);
    } else {
        // Use generated fallback data
        company = generateFallbackData(companyName);
        console.log('Using fallback data:', company);
    }

    // Update page title
    document.title = `${company.name} | Market Impact Assessment`;

    // Update company name
    companyNameEl.textContent = company.name;

    // Set initial letter for placeholder
    logoInitial.textContent = company.name.charAt(0).toUpperCase();

    // Try to load logo
    loadLogo(company.logo, company.domain);

    // Update stats
    employeeCount.textContent = company.employees;
    countryCount.textContent = company.countryCount || company.countries.length;
    revenue.textContent = company.revenue;
    website.textContent = 'www.' + company.domain;

    // Make website clickable
    website.addEventListener('click', () => {
        window.open('https://www.' + company.domain, '_blank');
    });

    // Store full company data including country info for audience page
    const fullData = {
        ...company,
        countryInfo: data?.countryInfo || {}
    };
    sessionStorage.setItem('companyData', JSON.stringify(fullData));

    // Continue button - navigate to audience page
    continueBtn.addEventListener('click', () => {
        window.location.href = `audience.html?company=${encodeURIComponent(company.name)}`;
    });
}

// Run initialization
init();
