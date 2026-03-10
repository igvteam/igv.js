#!/usr/bin/env node

/**
 * Generates dev/dev.html — a searchable dashboard of all HTML files under dev/.
 * Run: node scripts/buildDevDashboard.cjs
 */

const fs = require('fs')
const path = require('path')

const DEV_DIR = path.resolve(__dirname, '..', 'dev')
const OUTPUT = path.join(DEV_DIR, 'dev.html')

// Recursively collect *.html files under dir, returning paths relative to DEV_DIR
function collectHtmlFiles(dir, base) {
    let results = []
    for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
        const rel = path.join(base, entry.name)
        if (entry.isDirectory()) {
            results = results.concat(collectHtmlFiles(path.join(dir, entry.name), rel))
        } else if (entry.isFile() && entry.name.endsWith('.html') && rel !== 'dev.html') {
            results.push(rel)
        }
    }
    return results
}

// Convert a filename (without extension) to a human-readable label
// e.g. "bam-groupby" → "BAM Groupby", "vcf_svs" → "VCF SVS", "1kg_phase3" → "1kg Phase3"
function toLabel(filename) {
    const name = path.basename(filename, '.html')
    return name
        .replace(/[-_]+/g, ' ')
        .replace(/\b(\w)/g, (_, c) => c.toUpperCase())
        // Uppercase well-known acronyms (2-4 letter words that are likely abbreviations)
        .replace(/\b([A-Za-z]{2,4})\b/g, (match) => {
            const upper = match.toUpperCase()
            const acronyms = [
                'BAM', 'VCF', 'GFF', 'GTF', 'CSI', 'RNA', 'SVS', 'MAF', 'WIG',
                'ROI', 'HIC', 'QTL', 'SEG', 'URI', 'API', 'GWAS', 'CRAM', 'CNV',
                'BND', 'TRA', 'SV', 'WS', 'UI', 'ONT', 'TSV', 'SVG'
            ]
            return acronyms.includes(upper) ? upper : match
        })
}

// Convert a directory name to a section label
function toSectionLabel(dirname) {
    // Special cases
    const special = {
        'cbio': 'cBio',
        'cnvpytor': 'CNVpytor',
        'datauri': 'Data URI',
        'gwas': 'GWAS',
        'hic': 'Hi-C',
        'htsget': 'htsget',
        'qtl': 'QTL',
        'roi': 'ROI',
        'sampleInfo': 'Sample Info',
        'seg': 'SEG',
        'ucsc': 'UCSC',
        'ui': 'UI',
        'wig': 'WIG',
        'api': 'API',
    }
    if (special[dirname]) return special[dirname]
    // Default: capitalize first letter
    return dirname.charAt(0).toUpperCase() + dirname.slice(1)
}

// Group files by top-level subdirectory
function groupBySection(files) {
    const sections = new Map()
    for (const file of files) {
        const parts = file.split(path.sep)
        let sectionKey, sectionLabel
        if (parts.length === 1) {
            sectionKey = ''
            sectionLabel = 'Dev'
        } else {
            sectionKey = parts[0]
            sectionLabel = toSectionLabel(parts[0])
        }
        if (!sections.has(sectionKey)) {
            sections.set(sectionKey, {label: sectionLabel, files: []})
        }
        sections.get(sectionKey).files.push(file)
    }
    return sections
}

// Build the HTML
function buildHtml(sections) {
    // Sort sections: "Dev" (root) first, then alphabetical by label
    const sorted = [...sections.entries()].sort((a, b) => {
        if (a[0] === '') return -1
        if (b[0] === '') return 1
        return a[1].label.localeCompare(b[1].label)
    })

    let sectionsHtml = ''
    for (const [, section] of sorted) {
        // Sort files alphabetically by label
        const cards = section.files
            .map(f => ({href: f, label: toLabel(f)}))
            .sort((a, b) => a.label.localeCompare(b.label))

        const cardsHtml = cards
            .map(c => `        <a class="card" href="${c.href}" target="_blank">${c.label}</a>`)
            .join('\n')

        sectionsHtml += `
    <section>
      <p class="section-label">${section.label}</p>
      <div class="grid">
${cardsHtml}
      </div>
    </section>
`
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>igv.js Dev</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #f5f5f5;
      color: #111;
      padding: 2rem 1rem 4rem;
    }

    .container {
      max-width: 1120px;
      margin: 0 auto;
    }

    header {
      margin-bottom: 2.5rem;
    }

    .eyebrow {
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 0.4rem;
    }

    h1 {
      font-size: 2rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .header-message {
      margin-top: 0.75rem;
      font-size: 0.95rem;
      color: #555;
      line-height: 1.5;
      max-width: 600px;
    }

    section {
      margin-bottom: 2.5rem;
    }

    section + section {
      padding-top: 2rem;
      border-top: 1px solid #e0e0e0;
    }

    .section-label {
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 1rem;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.75rem;
    }

    .card {
      display: block;
      background: #fff;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      padding: 0.9rem 1rem;
      text-decoration: none;
      color: #111;
      font-size: 0.875rem;
      font-weight: 500;
      transition: background 0.12s, border-color 0.12s;
    }

    .card:hover {
      background: #f0f0f0;
      border-color: #ccc;
    }

    .search-wrap {
      margin-bottom: 2rem;
    }

    #search {
      width: 100%;
      max-width: 400px;
      padding: 0.55rem 0.85rem;
      font-size: 0.9rem;
      border: 1px solid #d0d0d0;
      border-radius: 6px;
      background: #fff;
      color: #111;
      outline: none;
      transition: border-color 0.12s;
    }

    #search:focus {
      border-color: #999;
    }

    section.hidden {
      display: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <p class="eyebrow">igv.js</p>
      <h1>Dev</h1>
      <p class="header-message">Development and test pages for igv.js. Browse by category or use the search box to
        find a specific example.  To browse the source look the folder "dev" at the repository root.
        <b>Note these pages are not maintained.</b></p>
    </header>

    <div class="search-wrap">
      <input id="search" type="search" placeholder="Filter dev pages…" autocomplete="off" spellcheck="false">
    </div>
${sectionsHtml}  </div>

  <script>
    const input = document.getElementById('search');
    const sections = Array.from(document.querySelectorAll('section'));

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      sections.forEach(section => {
        const cards = Array.from(section.querySelectorAll('.card'));
        let visible = 0;
        cards.forEach(card => {
          const match = !q || card.textContent.toLowerCase().includes(q);
          card.style.display = match ? '' : 'none';
          if (match) visible++;
        });
        section.classList.toggle('hidden', visible === 0);
      });
    });
  </script>
</body>
</html>
`
}

// Main
const files = collectHtmlFiles(DEV_DIR, '')
const sections = groupBySection(files)
const html = buildHtml(sections)
fs.writeFileSync(OUTPUT, html)
console.log(`Generated ${path.relative(process.cwd(), OUTPUT)} (${files.length} files, ${sections.size} sections)`)
