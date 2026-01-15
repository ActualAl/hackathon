# Language Percentages Data

This folder contains data and scripts for fetching language speaker percentages by country from the CIA World Factbook.

## Data Sources

### Primary Source: CIA World Factbook (via factbook.json)
- **Repository**: https://github.com/factbook/factbook.json
- **Description**: JSON-formatted country profiles from the CIA World Factbook
- **Update frequency**: Auto-updated weekly (every Thursday) from CIA.gov
- **License**: Public domain

### Code Mappings
The CIA World Factbook uses **GEC/FIPS codes** rather than ISO-2 country codes. The script includes a mapping table to convert between:
- **ISO 3166-1 alpha-2** (used in our CSV files, e.g., "DE" for Germany)
- **FIPS 10-4 / GEC** (used by CIA, e.g., "GM" for Germany)

Mapping source: https://github.com/mysociety/gaze/blob/master/data/fips-10-4-to-iso-country-codes.csv

## Methodology

1. **Input**: Read `countries_languages_populations.csv` from the parent directory, which contains:
   - ISO-2 country codes
   - Country names
   - Language codes (ISO 639-1)
   - Population data (from World Bank)

2. **Code Translation**: Convert ISO-2 codes to FIPS/GEC codes and determine the regional folder path in the factbook.json repository.

3. **Data Fetching**: For each country, fetch the JSON file from:
   ```
   https://raw.githubusercontent.com/factbook/factbook.json/master/{region}/{fips_code}.json
   ```

4. **Extraction**: Extract the "Languages" field from the "People and Society" section, which contains detailed language breakdowns with percentages where available.

5. **Output**:
   - `countries_languages_populations_details.csv` - Enhanced CSV with a `Language_Details` column
   - `factbook_raw_data.json` - Raw extracted language data for reference

## Output Format

The output CSV adds a `Language_Details` column containing the full CIA World Factbook language description, e.g.:

| Code | Name | Languages | Population | Language_Details |
|------|------|-----------|------------|------------------|
| BE | Belgium | nl,fr,de | 11779946 | Dutch (official) 60%, French (official) 40%, German (official) less than 1% |
| CH | Switzerland | de,fr,it | 8888822 | German (or Swiss German) (official) 62.1%, French (official) 22.8%, Italian (official) 8%, Romansh (official) 0.5%... |
| IN | India | hi,en | 1438069596 | Hindi 43.6%, Bengali 8%, Marathi 6.9%, Telugu 6.7%, Tamil 5.7%... |

## Usage

From the parent directory (`hackathon/`):

```bash
node fetch_language_percentages.js
```

## Limitations

- Some small territories may not have entries in the CIA World Factbook
- Language percentages may not always sum to 100% (some surveys allow multiple responses)
- The data reflects official/national languages and major regional languages; minority languages may be underrepresented
- FIPS/GEC codes have been deprecated since 2015, but the factbook.json project continues to use them for consistency

## Files

- `README.md` - This documentation
- `countries_languages_populations_details.csv` - Output CSV with language percentages
- `factbook_raw_data.json` - Raw language data extracted from factbook.json

## Related Resources

- [CIA World Factbook](https://www.cia.gov/the-world-factbook/)
- [factbook.json GitHub](https://github.com/factbook/factbook.json)
- [FIPS country codes (Wikipedia)](https://en.wikipedia.org/wiki/List_of_FIPS_country_codes)
- [ISO 639-1 language codes](https://en.wikipedia.org/wiki/List_of_ISO_639-1_codes)
