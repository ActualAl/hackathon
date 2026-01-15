#!/usr/bin/env node
// Fetches language speaker percentages from CIA World Factbook (via factbook.json)
// and creates an enhanced CSV with language breakdown by country
// Source: https://github.com/factbook/factbook.json

const fs = require('fs');
const https = require('https');
const path = require('path');

// ISO-2 to FIPS code mapping (factbook uses FIPS codes)
const ISO_TO_FIPS = {
  'AF': 'AF', 'AL': 'AL', 'DZ': 'AG', 'AS': 'AQ', 'AD': 'AN', 'AO': 'AO', 'AI': 'AV',
  'AQ': 'AY', 'AG': 'AC', 'AR': 'AR', 'AM': 'AM', 'AW': 'AA', 'AU': 'AS', 'AT': 'AU',
  'AZ': 'AJ', 'BS': 'BF', 'BH': 'BA', 'BD': 'BG', 'BB': 'BB', 'BY': 'BO', 'BE': 'BE',
  'BZ': 'BH', 'BJ': 'BN', 'BM': 'BD', 'BT': 'BT', 'BO': 'BL', 'BA': 'BK', 'BW': 'BC',
  'BV': 'BV', 'BR': 'BR', 'IO': 'IO', 'BN': 'BX', 'BG': 'BU', 'BF': 'UV', 'MM': 'BM',
  'BI': 'BY', 'KH': 'CB', 'CM': 'CM', 'CA': 'CA', 'CV': 'CV', 'KY': 'CJ', 'CF': 'CT',
  'TD': 'CD', 'CL': 'CI', 'CN': 'CH', 'CX': 'KT', 'CC': 'CK', 'CO': 'CO', 'KM': 'CN',
  'CD': 'CG', 'CG': 'CF', 'CK': 'CW', 'CR': 'CS', 'CI': 'IV', 'HR': 'HR', 'CU': 'CU',
  'CW': 'UC', 'CY': 'CY', 'CZ': 'EZ', 'DK': 'DA', 'DJ': 'DJ', 'DM': 'DO', 'DO': 'DR',
  'EC': 'EC', 'EG': 'EG', 'SV': 'ES', 'GQ': 'EK', 'ER': 'ER', 'EE': 'EN', 'ET': 'ET',
  'FK': 'FK', 'FO': 'FO', 'FJ': 'FJ', 'FI': 'FI', 'FR': 'FR', 'GF': 'FG', 'PF': 'FP',
  'TF': 'FS', 'GA': 'GB', 'GM': 'GA', 'GE': 'GG', 'DE': 'GM', 'GH': 'GH', 'GI': 'GI',
  'GR': 'GR', 'GL': 'GL', 'GD': 'GJ', 'GP': 'GP', 'GU': 'GQ', 'GT': 'GT', 'GN': 'GV',
  'GW': 'PU', 'GY': 'GY', 'HT': 'HA', 'HM': 'HM', 'HN': 'HO', 'HK': 'HK', 'HU': 'HU',
  'IS': 'IC', 'IN': 'IN', 'ID': 'ID', 'IR': 'IR', 'IQ': 'IZ', 'IE': 'EI', 'IL': 'IS',
  'IT': 'IT', 'JM': 'JM', 'JP': 'JA', 'JO': 'JO', 'KZ': 'KZ', 'KE': 'KE', 'KI': 'KR',
  'KP': 'KN', 'KR': 'KS', 'KW': 'KU', 'KG': 'KG', 'LA': 'LA', 'LV': 'LG', 'LB': 'LE',
  'LS': 'LT', 'LR': 'LI', 'LY': 'LY', 'LI': 'LS', 'LT': 'LH', 'LU': 'LU', 'MO': 'MC',
  'MK': 'MK', 'MG': 'MA', 'MW': 'MI', 'MY': 'MY', 'MV': 'MV', 'ML': 'ML', 'MT': 'MT',
  'MH': 'RM', 'MQ': 'MB', 'MR': 'MR', 'MU': 'MP', 'YT': 'MF', 'MX': 'MX', 'FM': 'FM',
  'MD': 'MD', 'MC': 'MN', 'MN': 'MG', 'ME': 'MJ', 'MS': 'MH', 'MA': 'MO', 'MZ': 'MZ',
  'NA': 'WA', 'NR': 'NR', 'NP': 'NP', 'NL': 'NL', 'NC': 'NC', 'NZ': 'NZ', 'NI': 'NU',
  'NE': 'NG', 'NG': 'NI', 'NU': 'NE', 'NF': 'NF', 'MP': 'CQ', 'NO': 'NO', 'OM': 'MU',
  'PK': 'PK', 'PW': 'PS', 'PA': 'PM', 'PG': 'PP', 'PY': 'PA', 'PE': 'PE', 'PH': 'RP',
  'PN': 'PC', 'PL': 'PL', 'PT': 'PO', 'PR': 'RQ', 'QA': 'QA', 'RE': 'RE', 'RO': 'RO',
  'RU': 'RS', 'RW': 'RW', 'BL': 'TB', 'SH': 'SH', 'KN': 'SC', 'LC': 'ST', 'MF': 'RN',
  'PM': 'SB', 'VC': 'VC', 'WS': 'WS', 'SM': 'SM', 'ST': 'TP', 'SA': 'SA', 'SN': 'SG',
  'RS': 'RI', 'SC': 'SE', 'SL': 'SL', 'SG': 'SN', 'SX': 'NN', 'SK': 'LO', 'SI': 'SI',
  'SB': 'BP', 'SO': 'SO', 'ZA': 'SF', 'GS': 'SX', 'SS': 'OD', 'ES': 'SP', 'LK': 'CE',
  'SD': 'SU', 'SR': 'NS', 'SJ': 'SV', 'SZ': 'WZ', 'SE': 'SW', 'CH': 'SZ', 'SY': 'SY',
  'TW': 'TW', 'TJ': 'TI', 'TZ': 'TZ', 'TH': 'TH', 'TL': 'TT', 'TG': 'TO', 'TK': 'TL',
  'TO': 'TN', 'TT': 'TD', 'TN': 'TS', 'TR': 'TU', 'TM': 'TX', 'TC': 'TK', 'TV': 'TV',
  'UG': 'UG', 'UA': 'UP', 'AE': 'AE', 'GB': 'UK', 'US': 'US', 'UY': 'UY', 'UZ': 'UZ',
  'VU': 'NH', 'VA': 'VT', 'VE': 'VE', 'VN': 'VM', 'VG': 'VI', 'VI': 'VQ', 'WF': 'WF',
  'EH': 'WI', 'YE': 'YM', 'ZM': 'ZA', 'ZW': 'ZI', 'PS': 'GZ', 'XK': 'KV'
};

// Region mapping for factbook.json URLs
const FIPS_TO_REGION = {
  // Africa
  'AG': 'africa', 'AO': 'africa', 'BN': 'africa', 'BC': 'africa', 'UV': 'africa',
  'BY': 'africa', 'CM': 'africa', 'CV': 'africa', 'CT': 'africa', 'CD': 'africa',
  'CN': 'africa', 'CG': 'africa', 'CF': 'africa', 'IV': 'africa', 'DJ': 'africa',
  'EG': 'africa', 'EK': 'africa', 'ER': 'africa', 'ET': 'africa', 'GB': 'africa',
  'GA': 'africa', 'GH': 'africa', 'GV': 'africa', 'PU': 'africa', 'KE': 'africa',
  'LT': 'africa', 'LI': 'africa', 'LY': 'africa', 'MA': 'africa', 'MI': 'africa',
  'ML': 'africa', 'MR': 'africa', 'MP': 'africa', 'MF': 'africa', 'MO': 'africa',
  'MZ': 'africa', 'WA': 'africa', 'NG': 'africa', 'NI': 'africa', 'RE': 'africa',
  'RW': 'africa', 'SH': 'africa', 'TP': 'africa', 'SG': 'africa', 'SE': 'africa',
  'SL': 'africa', 'SO': 'africa', 'SF': 'africa', 'OD': 'africa', 'SU': 'africa',
  'WZ': 'africa', 'TZ': 'africa', 'TO': 'africa', 'TS': 'africa', 'UG': 'africa',
  'ZA': 'africa', 'ZI': 'africa',

  // Europe
  'AL': 'europe', 'AN': 'europe', 'AU': 'europe', 'BO': 'europe', 'BE': 'europe',
  'BK': 'europe', 'BU': 'europe', 'HR': 'europe', 'CY': 'europe', 'EZ': 'europe',
  'DA': 'europe', 'EN': 'europe', 'FO': 'europe', 'FI': 'europe', 'FR': 'europe',
  'GM': 'europe', 'GR': 'europe', 'HU': 'europe', 'IC': 'europe', 'EI': 'europe',
  'IT': 'europe', 'LG': 'europe', 'LS': 'europe', 'LH': 'europe', 'LU': 'europe',
  'MK': 'europe', 'MT': 'europe', 'MD': 'europe', 'MN': 'europe', 'MJ': 'europe',
  'NL': 'europe', 'NO': 'europe', 'PL': 'europe', 'PO': 'europe', 'RO': 'europe',
  'RS': 'europe', 'RI': 'europe', 'LO': 'europe', 'SI': 'europe', 'SP': 'europe',
  'SW': 'europe', 'SZ': 'europe', 'UK': 'europe', 'UP': 'europe', 'VT': 'europe',
  'KV': 'europe', 'SM': 'europe', 'GI': 'europe', 'GK': 'europe', 'IM': 'europe',
  'JE': 'europe', 'JN': 'europe', 'SV': 'europe',

  // Middle East
  'BA': 'middle-east', 'IR': 'middle-east', 'IZ': 'middle-east', 'IS': 'middle-east',
  'JO': 'middle-east', 'KU': 'middle-east', 'LE': 'middle-east', 'MU': 'middle-east',
  'QA': 'middle-east', 'SA': 'middle-east', 'SY': 'middle-east', 'AE': 'middle-east',
  'YM': 'middle-east', 'GZ': 'middle-east', 'WE': 'middle-east',

  // South Asia
  'AF': 'south-asia', 'BG': 'south-asia', 'BT': 'south-asia', 'IN': 'south-asia',
  'MV': 'south-asia', 'NP': 'south-asia', 'PK': 'south-asia', 'CE': 'south-asia',

  // East & Southeast Asia
  'BX': 'east-n-southeast-asia', 'BM': 'east-n-southeast-asia', 'CB': 'east-n-southeast-asia',
  'CH': 'east-n-southeast-asia', 'HK': 'east-n-southeast-asia', 'ID': 'east-n-southeast-asia',
  'JA': 'east-n-southeast-asia', 'KN': 'east-n-southeast-asia', 'KS': 'east-n-southeast-asia',
  'LA': 'east-n-southeast-asia', 'MC': 'east-n-southeast-asia', 'MY': 'east-n-southeast-asia',
  'MG': 'east-n-southeast-asia', 'RP': 'east-n-southeast-asia', 'SN': 'east-n-southeast-asia',
  'TW': 'east-n-southeast-asia', 'TH': 'east-n-southeast-asia', 'TT': 'east-n-southeast-asia',
  'VM': 'east-n-southeast-asia',

  // Central Asia
  'KZ': 'central-asia', 'KG': 'central-asia', 'TI': 'central-asia', 'TX': 'central-asia',
  'UZ': 'central-asia',

  // North America
  'CA': 'north-america', 'US': 'north-america', 'MX': 'north-america', 'GL': 'north-america',
  'BD': 'north-america', 'SB': 'north-america',

  // Central America & Caribbean
  'BH': 'central-america-n-caribbean', 'CS': 'central-america-n-caribbean',
  'ES': 'central-america-n-caribbean', 'GT': 'central-america-n-caribbean',
  'HO': 'central-america-n-caribbean', 'NU': 'central-america-n-caribbean',
  'PM': 'central-america-n-caribbean', 'AC': 'central-america-n-caribbean',
  'AV': 'central-america-n-caribbean', 'AA': 'central-america-n-caribbean',
  'BF': 'central-america-n-caribbean', 'BB': 'central-america-n-caribbean',
  'CJ': 'central-america-n-caribbean', 'CU': 'central-america-n-caribbean',
  'UC': 'central-america-n-caribbean', 'DO': 'central-america-n-caribbean',
  'DR': 'central-america-n-caribbean', 'GJ': 'central-america-n-caribbean',
  'GP': 'central-america-n-caribbean', 'HA': 'central-america-n-caribbean',
  'JM': 'central-america-n-caribbean', 'MB': 'central-america-n-caribbean',
  'MH': 'central-america-n-caribbean', 'RQ': 'central-america-n-caribbean',
  'TB': 'central-america-n-caribbean', 'SC': 'central-america-n-caribbean',
  'ST': 'central-america-n-caribbean', 'RN': 'central-america-n-caribbean',
  'VC': 'central-america-n-caribbean', 'NN': 'central-america-n-caribbean',
  'TD': 'central-america-n-caribbean', 'TK': 'central-america-n-caribbean',
  'VI': 'central-america-n-caribbean', 'VQ': 'central-america-n-caribbean',

  // South America
  'AR': 'south-america', 'BL': 'south-america', 'BR': 'south-america', 'CI': 'south-america',
  'CO': 'south-america', 'EC': 'south-america', 'FK': 'south-america', 'FG': 'south-america',
  'GY': 'south-america', 'PA': 'south-america', 'PE': 'south-america', 'NS': 'south-america',
  'UY': 'south-america', 'VE': 'south-america',

  // Australia & Oceania
  'AS': 'australia-oceania', 'AQ': 'australia-oceania', 'CK': 'australia-oceania',
  'CW': 'australia-oceania', 'FJ': 'australia-oceania', 'FP': 'australia-oceania',
  'GQ': 'australia-oceania', 'KR': 'australia-oceania', 'RM': 'australia-oceania',
  'FM': 'australia-oceania', 'NR': 'australia-oceania', 'NC': 'australia-oceania',
  'NZ': 'australia-oceania', 'NE': 'australia-oceania', 'NF': 'australia-oceania',
  'CQ': 'australia-oceania', 'PS': 'australia-oceania', 'PP': 'australia-oceania',
  'PC': 'australia-oceania', 'WS': 'australia-oceania', 'BP': 'australia-oceania',
  'TN': 'australia-oceania', 'TV': 'australia-oceania', 'NH': 'australia-oceania',
  'WF': 'australia-oceania', 'TL': 'australia-oceania',

  // Antarctica
  'AY': 'antarctica', 'BV': 'antarctica', 'FS': 'antarctica', 'HM': 'antarctica',
  'SX': 'antarctica'
};

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error(`Failed to parse JSON from ${url}: ${e.message}`));
        }
      });
    }).on('error', reject);
  });
}

function extractLanguageData(json) {
  try {
    const langSection = json?.['People and Society']?.Languages;
    if (!langSection) return null;

    // The text field contains the language information
    const text = langSection.text || langSection.Languages?.text;
    if (!text) return null;

    return text;
  } catch (e) {
    return null;
  }
}

async function main() {
  // Read existing countries_languages_populations.csv
  const inputPath = path.join(__dirname, 'countries_languages_populations.csv');
  const outputPath = path.join(__dirname, 'language_percentages', 'countries_languages_populations_details.csv');
  const rawDataPath = path.join(__dirname, 'language_percentages', 'factbook_raw_data.json');

  const csvContent = fs.readFileSync(inputPath, 'utf-8');
  const lines = csvContent.trim().split('\n');

  const results = ['"Code","Name","Languages","Population","Language_Details"'];
  const rawData = {};

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Parse CSV line
    const match = line.match(/"([^"]*)","([^"]*)","([^"]*)",(\d*)/);
    if (!match) {
      console.error(`Failed to parse line: ${line}`);
      continue;
    }

    const [, code, name, languages, population] = match;
    const fipsCode = ISO_TO_FIPS[code];
    const region = fipsCode ? FIPS_TO_REGION[fipsCode] : null;

    let langDetails = '';

    if (region && fipsCode) {
      const url = `https://raw.githubusercontent.com/factbook/factbook.json/master/${region}/${fipsCode.toLowerCase()}.json`;
      try {
        console.log(`Fetching ${name} (${code} -> ${fipsCode}) from ${region}...`);
        const json = await fetchJSON(url);
        const langData = extractLanguageData(json);
        if (langData) {
          // Store raw data
          rawData[code] = {
            name,
            fipsCode,
            region,
            languageData: langData
          };
          // Clean up the text - remove newlines and extra spaces, escape quotes
          langDetails = langData.replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/"/g, '""').trim();
        }
      } catch (e) {
        console.error(`  Error fetching ${name}: ${e.message}`);
      }
    } else {
      console.log(`No mapping for ${name} (${code})`);
    }

    results.push(`"${code}","${name}","${languages}",${population},"${langDetails}"`);

    // Small delay to be nice to GitHub
    await new Promise(r => setTimeout(r, 100));
  }

  fs.writeFileSync(outputPath, results.join('\n') + '\n');
  fs.writeFileSync(rawDataPath, JSON.stringify(rawData, null, 2));

  console.log(`\nWrote ${results.length - 1} countries to ${outputPath}`);
  console.log(`Wrote raw data to ${rawDataPath}`);
}

main().catch(console.error);
