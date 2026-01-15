// DOM Elements
const form = document.getElementById('companyForm');
const input = document.getElementById('companyInput');

// Handle form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const companyName = input.value.trim();
    if (!companyName) return;

    // Add loading state
    form.classList.add('loading');

    // Brief delay for visual feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    // Navigate to company summary page
    window.location.href = `company.html?company=${encodeURIComponent(companyName)}`;
});

// Auto-focus input on page load
window.addEventListener('load', () => {
    input.focus();
});
