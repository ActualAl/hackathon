// Get company name from URL
const urlParams = new URLSearchParams(window.location.search);
const companyName = urlParams.get('company');

// If no company name, redirect back to home
if (!companyName) {
    window.location.href = 'index.html';
}

// DOM Elements
const countryCountEl = document.getElementById('countryCount');
const totalAudienceEl = document.getElementById('totalAudience');
const audienceReachedEl = document.getElementById('audienceReached');
const audienceNotReachedEl = document.getElementById('audienceNotReached');
const notReachedPercentEl = document.getElementById('notReachedPercent');
const backBtn = document.getElementById('backBtn');
const continueBtn = document.getElementById('continueBtn');

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

// Format number with commas
function formatNumberFull(num) {
    return num.toLocaleString();
}

// Get audience data from session storage
function getAudienceData() {
    try {
        const data = sessionStorage.getItem('audienceData');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        console.error('Error parsing audience data:', e);
        return null;
    }
}

// Initialize page
function init() {
    const audienceData = getAudienceData();

    if (!audienceData) {
        // No data, redirect to audience page
        window.location.href = `audience.html?company=${encodeURIComponent(companyName)}`;
        return;
    }

    const { countries, totalAudience } = audienceData;

    // Calculate reached and not reached based on country coverage
    let totalReached = 0;
    let totalNotReached = 0;

    countries.forEach(country => {
        const countryPopulation = country.population || 0;
        const reachedPercent = country.reached || 0;
        const reached = Math.round(countryPopulation * (reachedPercent / 100));
        const notReached = countryPopulation - reached;
        totalReached += reached;
        totalNotReached += notReached;
    });

    const totalPop = totalReached + totalNotReached;
    const notReachedPercent = totalPop > 0 ? ((totalNotReached / totalPop) * 100).toFixed(1) : 0;

    // Animate the stats
    animateValue(countryCountEl, 0, countries.length, 500);
    animateValue(totalAudienceEl, 0, totalPop, 1000, formatNumberFull);
    animateValue(audienceReachedEl, 0, totalReached, 1000, formatNumberFull);
    animateValue(audienceNotReachedEl, 0, totalNotReached, 1000, formatNumberFull);

    // Set the summary percentage
    setTimeout(() => {
        notReachedPercentEl.textContent = notReachedPercent + '%';
    }, 1000);

    // Store analysis data for next page
    sessionStorage.setItem('analysisData', JSON.stringify({
        countryCount: countries.length,
        totalAudience: totalPop,
        audienceReached: totalReached,
        audienceNotReached: totalNotReached,
        notReachedPercent: notReachedPercent
    }));

    // Navigation
    backBtn.addEventListener('click', () => {
        window.location.href = `audience.html?company=${encodeURIComponent(companyName)}`;
    });

    continueBtn.addEventListener('click', () => {
        alert('Results page coming soon!');
    });
}

// Animate a value from start to end
function animateValue(element, start, end, duration, formatter = null) {
    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(start + (end - start) * easeProgress);

        element.textContent = formatter ? formatter(currentValue) : currentValue;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// Initialize
init();
