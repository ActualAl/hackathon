// Set Chart.js defaults for dark theme
Chart.defaults.color = '#FFFFFF';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

// Get company name from URL
const urlParams = new URLSearchParams(window.location.search);
const companyName = urlParams.get('company');

// If no company name, redirect back to home
if (!companyName) {
    window.location.href = 'index.html';
}

// DOM Elements
const totalAudienceEl = document.getElementById('totalAudience');
const languagesListEl = document.getElementById('languagesList');
const countryBarsEl = document.getElementById('countryBars');
const backBtn = document.getElementById('backBtn');
const continueBtn = document.getElementById('continueBtn');

// Chart colors
const chartColors = [
    '#00CCFF', '#06E133', '#F0A008', '#FF00F2', '#1700FF',
    '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181',
    '#AA96DA', '#FCBAD3', '#A8D8EA', '#FFAAA5', '#FFD3B6'
];

// Format large numbers
function formatNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
}

// Get company data from session storage
function getCompanyData() {
    try {
        const data = sessionStorage.getItem('companyData');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error parsing company data:', e);
        return null;
    }
}

// Build country data with populations
function buildCountryData(companyCodes, countryInfo) {
    if (!companyCodes || !countryInfo) return [];

    return companyCodes.map((code, index) => {
        const info = countryInfo[code] || { name: code, population: 1000000 };
        return {
            code: code,
            name: info.name,
            population: info.population,
            color: chartColors[index % chartColors.length]
        };
    });
}

// Language data loaded from CSV
let languageData = null;

// Load language data from CSV
async function loadLanguageData() {
    try {
        const response = await fetch('data/countries_languages_populations_details.csv');
        const text = await response.text();
        languageData = parseCSV(text);
        return languageData;
    } catch (error) {
        console.error('Error loading language data:', error);
        return null;
    }
}

// Parse CSV into object keyed by country code
function parseCSV(text) {
    const lines = text.split('\n');
    const data = {};

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line.trim()) continue;

        // Parse CSV with quoted fields
        const matches = line.match(/("([^"]*)"|[^,]*),("([^"]*)"|[^,]*),("([^"]*)"|[^,]*),("([^"]*)"|[^,]*),("([^"]*)"|[^,]*)/);
        if (matches) {
            const code = (matches[2] || matches[1]).replace(/"/g, '');
            const name = (matches[4] || matches[3]).replace(/"/g, '');
            const languages = (matches[6] || matches[5]).replace(/"/g, '');
            const population = parseInt((matches[8] || matches[7]).replace(/"/g, '')) || 0;
            const details = (matches[10] || matches[9]).replace(/"/g, '');

            data[code] = { code, name, languages, population, details };
        }
    }
    return data;
}

// Calculate coverage based on language match - returns breakdown by language
function calculateLanguageCoverage(countryCode, multimediaLanguages, langData) {
    const result = { total: 0, breakdown: [], missingLanguages: [] };

    if (!langData || !langData[countryCode]) return result;

    const details = langData[countryCode].details;
    if (!details) return result;

    const detailsLower = details.toLowerCase().trim();

    // Map multimedia languages to what we'd find in the CSV
    const languageMap = {
        'english': ['english'],
        'chinese': ['chinese', 'mandarin', 'cantonese', 'putonghua'],
        'spanish': ['spanish', 'castilian'],
        'french': ['french'],
        'german': ['german'],
        'portuguese': ['portuguese'],
        'japanese': ['japanese'],
        'korean': ['korean'],
        'italian': ['italian'],
        'dutch': ['dutch'],
        'russian': ['russian'],
        'arabic': ['arabic'],
        'hindi': ['hindi'],
        'polish': ['polish'],
        'turkish': ['turkish'],
        'thai': ['thai'],
        'vietnamese': ['vietnamese'],
        'indonesian': ['indonesian', 'bahasa'],
        'swedish': ['swedish'],
        'bengali': ['bengali', 'bangla'],
        'urdu': ['urdu']
    };

    let totalCoverage = 0;

    // Extract all languages mentioned in the country data with their percentages
    const countryLanguages = extractCountryLanguages(details);

    // Check if this is a single-language country (details is just a language name)
    const isSingleLanguageCountry = /^[a-z]+(\s*\(official\))?$/i.test(detailsLower);

    for (const lang of multimediaLanguages) {
        const langLower = lang.toLowerCase();
        const searchTerms = languageMap[langLower] || [langLower];

        for (const term of searchTerms) {
            // Look for percentage in the details
            const regex = new RegExp(term + '[^0-9]*([0-9]+\\.?[0-9]*)%', 'i');
            const match = detailsLower.match(regex);

            if (match) {
                const percent = parseFloat(match[1]);
                totalCoverage += percent;
                result.breakdown.push({ language: lang, percent: Math.round(percent) });
                break;
            } else if (detailsLower.includes(term)) {
                // Language mentioned but no percentage
                let estimatedPercent = 10;

                // Check if it's a single-language country (e.g., "English" or "Japanese")
                if (isSingleLanguageCountry) {
                    estimatedPercent = 100;
                }
                // Check if it's marked as "official"
                else if (
                    new RegExp(term + '\\s*\\([^)]*official', 'i').test(details) ||
                    new RegExp(term + '[^,;.]*official', 'i').test(details) ||
                    new RegExp('official[^,;.]*' + term, 'i').test(details)
                ) {
                    estimatedPercent = 90;
                }
                // Check if it's the primary/first language mentioned
                else if (detailsLower.indexOf(term) < 15) {
                    estimatedPercent = 80;
                }

                totalCoverage += estimatedPercent;
                result.breakdown.push({ language: lang, percent: estimatedPercent });
                break;
            }
        }
    }

    // Find languages we're NOT covering (languages in country but not in multimedia languages)
    const coveredLangs = result.breakdown.map(b => b.language.toLowerCase());
    for (const [lang, percent] of Object.entries(countryLanguages)) {
        if (!coveredLangs.some(covered => lang.includes(covered) || covered.includes(lang))) {
            if (percent >= 5) { // Only show languages with >= 5% speakers
                result.missingLanguages.push({ language: capitalizeFirst(lang), percent });
            }
        }
    }

    // Sort missing languages by percentage descending
    result.missingLanguages.sort((a, b) => b.percent - a.percent);

    result.total = Math.min(Math.round(totalCoverage), 100);
    return result;
}

// Extract languages and their percentages from country details
function extractCountryLanguages(details) {
    const languages = {};

    // Handle empty or very short details
    if (!details || details.trim().length === 0) {
        return languages;
    }

    // Known languages to look for
    const knownLanguages = [
        'portuguese', 'spanish', 'english', 'french', 'german', 'italian',
        'chinese', 'mandarin', 'cantonese', 'japanese', 'korean', 'russian',
        'arabic', 'hindi', 'bengali', 'urdu', 'punjabi', 'tamil', 'telugu',
        'dutch', 'polish', 'turkish', 'thai', 'vietnamese', 'indonesian',
        'swedish', 'norwegian', 'danish', 'finnish', 'greek', 'czech',
        'hungarian', 'romanian', 'ukrainian', 'hebrew', 'persian', 'tagalog',
        'malay', 'swahili', 'yoruba', 'igbo', 'hausa', 'amharic', 'zulu',
        'estonian', 'irish', 'gaelic', 'frisian', 'slovenian', 'croatian'
    ];

    // First try to find languages with percentages
    const patternWithPercent = /([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s*(?:\([^)]*\))?\s*(\d+\.?\d*)%/gi;

    let match;
    while ((match = patternWithPercent.exec(details)) !== null) {
        let lang = match[1].toLowerCase().trim();
        const percent = parseFloat(match[2]);

        // Clean up language name - remove "only" suffix
        lang = lang.replace(/\s+only$/, '');

        // Filter out non-language words
        if (!['other', 'none', 'note', 'total', 'unspecified'].includes(lang) && percent > 0) {
            languages[lang] = percent;
        }
    }

    // If no percentages found, look for known languages mentioned in the text
    if (Object.keys(languages).length === 0) {
        const detailsLower = details.toLowerCase();
        const detailsTrimmed = detailsLower.trim();

        // Check if details is just a single language name (e.g., "English" or "Japanese")
        const singleLanguageMatch = knownLanguages.find(lang =>
            detailsTrimmed === lang ||
            detailsTrimmed === lang + ' (official)' ||
            detailsTrimmed.match(new RegExp('^' + lang + '\\s*\\(?official\\)?$', 'i'))
        );

        if (singleLanguageMatch) {
            // Single language country - assume 100% coverage
            languages[singleLanguageMatch] = 100;
            return languages;
        }

        // Look for languages in the text
        for (const lang of knownLanguages) {
            if (detailsLower.includes(lang)) {
                // Check if it's marked as official (various patterns)
                const isOfficial =
                    new RegExp(lang + '\\s*\\([^)]*official[^)]*\\)', 'i').test(details) ||
                    new RegExp(lang + '[^,;.]*official', 'i').test(details) ||
                    new RegExp('official[^,;.]*' + lang, 'i').test(details);

                // Check if it appears to be the primary/first language mentioned
                const isPrimary = detailsLower.indexOf(lang) < 20;

                // Estimate percentage
                let estimatedPercent = 15;
                if (isOfficial && isPrimary) {
                    estimatedPercent = 85;
                } else if (isOfficial) {
                    estimatedPercent = 50;
                } else if (isPrimary) {
                    estimatedPercent = 30;
                }

                languages[lang] = estimatedPercent;
            }
        }
    }

    return languages;
}

// Capitalize first letter
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Calculate coverage per country based on multimedia languages
function calculateCountryCoverage(countries, multimediaLanguages, langData) {
    return countries.map(country => {
        const coverage = calculateLanguageCoverage(country.code, multimediaLanguages, langData);
        return {
            ...country,
            reached: coverage.total,
            notReached: 100 - coverage.total,
            breakdown: coverage.breakdown,
            missingLanguages: coverage.missingLanguages
        };
    });
}

// Initialize page
async function init() {
    const companyData = getCompanyData();

    if (!companyData) {
        // No data, redirect to company page
        window.location.href = `company.html?company=${encodeURIComponent(companyName)}`;
        return;
    }

    // Load language data from CSV
    const langData = await loadLanguageData();

    // Use audienceCountries from company data, or fallback to default
    const targetCountries = companyData.audienceCountries || ['US', 'FR', 'DE', 'CN', 'BR'];

    // Build country data for the audience countries
    const countries = buildCountryData(targetCountries, companyData.countryInfo);

    // Always show these languages
    const languages = ['English', 'Chinese'];

    // Calculate total audience
    const totalAudience = countries.reduce((sum, c) => sum + c.population, 0);
    totalAudienceEl.textContent = formatNumber(totalAudience);

    // Render languages
    renderLanguages(languages);

    // Render countries chart
    if (countries.length > 0) {
        renderCountriesChart(countries);
    } else {
        document.getElementById('countriesChart').parentElement.innerHTML =
            '<p style="color: var(--text-secondary); text-align: center; padding: 40px;">No country data available</p>';
    }

    // Calculate coverage per country based on multimedia languages and render bars
    const countriesWithCoverage = calculateCountryCoverage(countries, languages, langData);
    renderCountryBars(countriesWithCoverage);

    // Animate bars after a short delay
    setTimeout(() => {
        animateCountryBars(countriesWithCoverage);
    }, 500);

    // Store audience data for next page
    sessionStorage.setItem('audienceData', JSON.stringify({
        countries: countriesWithCoverage,
        languages,
        totalAudience
    }));

    // Navigation
    backBtn.addEventListener('click', () => {
        window.location.href = `company.html?company=${encodeURIComponent(companyName)}`;
    });

    continueBtn.addEventListener('click', () => {
        window.location.href = `analysis.html?company=${encodeURIComponent(companyName)}`;
    });
}

// Render languages as tags
function renderLanguages(languages) {
    languagesListEl.innerHTML = languages
        .map(lang => `<span class="language-tag">${lang}</span>`)
        .join('');
}

// Render donut chart for countries
function renderCountriesChart(countries) {
    const ctx = document.getElementById('countriesChart').getContext('2d');

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: countries.map(c => c.name),
            datasets: [{
                data: countries.map(c => c.population),
                backgroundColor: countries.map(c => c.color),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#FFFFFF',
                        padding: 16,
                        font: {
                            size: 13,
                            family: 'Inter',
                            weight: '500'
                        },
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: '#2B2A35',
                    titleColor: '#FFFFFF',
                    bodyColor: '#FFFFFF',
                    callbacks: {
                        label: function(context) {
                            return `${context.label}: ${formatNumber(context.raw)}`;
                        }
                    }
                }
            }
        }
    });
}

// Render country bars
function renderCountryBars(countries) {
    countryBarsEl.innerHTML = countries.map(country => {
        const languageLabels = country.breakdown && country.breakdown.length > 0
            ? country.breakdown.map(b => `<span class="lang-label">${b.language}: ${b.percent}%</span>`).join('')
            : '<span class="lang-label">No language coverage</span>';

        // Build tooltip content for missing languages
        const missingTooltip = country.missingLanguages && country.missingLanguages.length > 0
            ? country.missingLanguages.map(m => `${m.language}: ${m.percent}%`).join('\n')
            : 'No additional languages identified';

        return `
            <div class="country-bar-row" data-country="${country.name}">
                <span class="country-bar-label">${country.name}</span>
                <div class="country-bar-container">
                    <div class="country-bar-track">
                        <div class="country-bar-fill"></div>
                        <div class="country-bar-empty" data-missing="${encodeURIComponent(missingTooltip)}"></div>
                    </div>
                    <div class="country-bar-languages">${languageLabels}</div>
                </div>
            </div>
        `;
    }).join('');

    // Add hover tooltip functionality
    setupMissingLanguageTooltips();
}

// Setup tooltips for missing languages on hover
function setupMissingLanguageTooltips() {
    // Create tooltip element if it doesn't exist
    let tooltip = document.getElementById('missing-lang-tooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'missing-lang-tooltip';
        tooltip.className = 'missing-lang-tooltip';
        document.body.appendChild(tooltip);
    }

    const emptyBars = document.querySelectorAll('.country-bar-empty');
    emptyBars.forEach(bar => {
        bar.addEventListener('mouseenter', (e) => {
            const missing = decodeURIComponent(bar.dataset.missing || '');
            if (missing) {
                tooltip.innerHTML = '<strong>Languages to cover:</strong><br>' + missing.replace(/\n/g, '<br>');
                tooltip.style.display = 'block';
                positionTooltip(e, tooltip);
            }
        });

        bar.addEventListener('mousemove', (e) => {
            positionTooltip(e, tooltip);
        });

        bar.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
}

// Position tooltip near cursor
function positionTooltip(e, tooltip) {
    const offset = 15;
    let left = e.pageX + offset;
    let top = e.pageY + offset;

    // Prevent tooltip from going off-screen
    const rect = tooltip.getBoundingClientRect();
    if (left + rect.width > window.innerWidth) {
        left = e.pageX - rect.width - offset;
    }
    if (top + rect.height > window.innerHeight + window.scrollY) {
        top = e.pageY - rect.height - offset;
    }

    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
}

// Animate country bars
function animateCountryBars(countries) {
    countries.forEach(country => {
        const row = countryBarsEl.querySelector(`[data-country="${country.name}"]`);
        if (row) {
            const fill = row.querySelector('.country-bar-fill');
            const empty = row.querySelector('.country-bar-empty');
            fill.style.width = country.reached + '%';
            fill.textContent = country.reached > 0 ? country.reached + '%' : '';
            empty.style.width = country.notReached + '%';
            empty.textContent = country.notReached < 100 ? country.notReached + '%' : '';
        }
    });
}

// Initialize
init();
