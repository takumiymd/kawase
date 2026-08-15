# Kawase

Kawase (為替) is a Firefox extension that converts prices on any webpage into your preferred currency using daily reference rates.

Hovering over a converted price displays the original amount, the exchange rate applied, and the rate timestamp.

## Features

- Supports 166 currencies from public reference rate providers.
- Recognizes currency symbols (`$`, `€`, `¥`, `£`, `₹`, `₩`, `kr`, `zł`, `฿`, `د.إ`, `ر.س`, etc.), ISO codes (`USD 10.50`), and CJK markers (`3,980円`, `元 199`, `50,000원`).
- Parses numerals across multiple scripts (Arabic-Indic, Persian, Devanagari, Bengali, Thai, and Latin).
- Handles common number formats: `1,234.56`, `1.234,56`, `1 234,56`, `1'234.50`, and Indian grouping (`1,23,456.78`).
- Supports magnitude suffixes (e.g., `$1.2M`, `$100k`, `¥1万`, `¥2.5億`).
- Resolves ambiguous symbols (`$`, `¥`, `£`, `kr`, `Rs`, `﷼`, `C$`, `CFA`) using page metadata, structured data (`schema.org`), domain hints, or user preferences.
- Debounced DOM mutation observer to process dynamically loaded content.
- Ignores code blocks, form inputs, dates, model numbers, and non-price numerals.

## Development & Installation

Kawase is written in plain JavaScript with no build step.

### Load temporarily in Firefox
1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**
3. Select `manifest.json`.

### CLI commands
```bash
npx web-ext lint      # Validate manifest and files
npx web-ext run       # Launch a temporary Firefox instance with the extension
npx web-ext build     # Create a zip package in dist/
```

A manual test suite covering various currency formats is available at `docs/test-page.html`.

## Permissions

Firefox Manifest V3 uses optional host permissions:
- When visiting a new domain, open the popup and click **Enable** to grant access and start conversion on that site.
- Host permissions can also be granted globally via Firefox's extension settings in the toolbar.

## Settings

Configurable via the popup or the options page (`All settings`):

| Setting | Options |
| --- | --- |
| Display mode | Replace price, show alongside, or show on hover |
| Highlight style | Dotted underline, subtle badge, or none |
| Decimals | Auto (drops cents for large amounts), 0, or 2 |
| Approximate marker | Prefix converted prices with `≈` |
| Ambiguous symbols | Set default currency for shared symbols (`$`, `¥`, `£`, etc.) |
| Site rules | Enable/disable per site or override source currency |
| Rate provider | open.er-api.com, frankfurter.dev, or automatic fallback |

## Exchange Rates

Rates are fetched from free, public APIs without requiring an API key:
- **open.er-api.com**: Primary source, ~166 currencies, updated daily.
- **frankfurter.dev**: Fallback source, European Central Bank reference rates.

Rates are cached in local extension storage and refreshed in the background.

## Project Structure

```
manifest.json                 Extension manifest (MV3)
src/lib/currencies.js         Currency metadata and symbol mapping
src/lib/parse.js              Number parser
src/lib/detect.js             Price detection regex and matcher
src/lib/format.js             Intl number formatting and tooltips
src/lib/rates.js              Rate fetching and conversions
src/lib/settings.js           Settings management and storage sync
src/background/background.js  Background rate sync alarm
src/content/page-context.js   Page currency detection (metadata/schema)
src/content/content.js        DOM scanner and price replacer
src/popup/                    Toolbar popup UI
src/options/                  Settings page
src/ui/theme.css              Shared theme styles
test/                         Test suites (Node.js test runner)
```

## Testing

Run unit tests:
```bash
npm test
```

To run the DOM content script tests, install `jsdom`:
```bash
npm install --no-save jsdom
npm test
```

## Known Limitations

- Prices inside `<iframe>` elements are not converted.
- Shadow DOM roots are not traversed.
- Prices rendered in `<canvas>` or raster images cannot be parsed.

## License

MIT
