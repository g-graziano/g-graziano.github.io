const fs = require('fs');
const path = require('path');
const translations = require('./i18n.js');

const rootDir = __dirname;
const indexPath = path.join(rootDir, 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf-8');

const langs = ['id', 'th', 'tl', 'vi', 'pt', 'es'];

// We need to inject hreflang tags into the head of the index.html
let hreflangs = `
    <link rel="alternate" hreflang="en" href="https://g-graziano.github.io/packsnap/" />
    <link rel="alternate" hreflang="id" href="https://g-graziano.github.io/packsnap/id/" />
    <link rel="alternate" hreflang="th" href="https://g-graziano.github.io/packsnap/th/" />
    <link rel="alternate" hreflang="tl" href="https://g-graziano.github.io/packsnap/tl/" />
    <link rel="alternate" hreflang="vi" href="https://g-graziano.github.io/packsnap/vi/" />
    <link rel="alternate" hreflang="pt" href="https://g-graziano.github.io/packsnap/pt/" />
    <link rel="alternate" hreflang="es" href="https://g-graziano.github.io/packsnap/es/" />
    <link rel="alternate" hreflang="x-default" href="https://g-graziano.github.io/packsnap/" />
`;

// Helper to replace translations
function translateHtml(html, lang) {
    let translated = html;
    
    // Set the lang attribute
    translated = translated.replace('<html lang="en">', `<html lang="${lang}">`);
    
    // Set base path for assets so they point to the root directory
    if (!translated.includes('<base href="../">')) {
       translated = translated.replace('<head>', '<head>\\n    <base href="../">');
    }

    const dict = translations[lang];
    if (!dict) return translated;
    
    // Replace SEO elements
    if (dict.seo_title) {
        translated = translated.replace(
            /<title>.*?<\/title>/,
            `<title>${dict.seo_title}</title>`
        );
        translated = translated.replace(
            /<meta property="og:title" content=".*?">/,
            `<meta property="og:title" content="${dict.seo_title}">`
        );
        translated = translated.replace(
            /<meta property="twitter:title" content=".*?">/,
            `<meta property="twitter:title" content="${dict.seo_title}">`
        );
    }
    
    if (dict.seo_desc) {
        translated = translated.replace(
            /<meta name="description" content=".*?">/,
            `<meta name="description" content="${dict.seo_desc}">`
        );
        translated = translated.replace(
            /<meta property="og:description" content=".*?">/,
            `<meta property="og:description" content="${dict.seo_desc}">`
        );
        translated = translated.replace(
            /<meta property="twitter:description" content=".*?">/,
            `<meta property="twitter:description" content="${dict.seo_desc}">`
        );
    }

    if (dict.seo_keywords) {
        translated = translated.replace(
            /<meta name="keywords" content=".*?">/,
            `<meta name="keywords" content="${dict.seo_keywords}">`
        );
    }
    
    // Regular expression to find elements with data-i18n attribute
    // Match something like <h1 data-i18n="hero_h1">Old Text</h1>
    // We can use a simpler approach: replace the innerHTML based on the attribute
    
    const keys = Object.keys(dict);
    for (const key of keys) {
        const text = dict[key];
        
        let regex;
        if (key === 'hero_cta') {
            regex = new RegExp(`(<a[^>]+data-i18n="hero_cta"[^>]*>)([\\s\\S]*?)(</a>)`, 'g');
        } else if (key === 'hero_h1') {
            regex = new RegExp(`(<h1[^>]+data-i18n="hero_h1"[^>]*>)([\\s\\S]*?)(</h1>)`, 'g');
        } else {
            regex = new RegExp(`(<[^>]+data-i18n="${key}"[^>]*>)([\\s\\S]*?)(</[^>]+>)`, 'g');
        }
        
        translated = translated.replace(regex, (match, openTag, content, closeTag) => {
            if (openTag.includes('<a ') && openTag.includes('cta-button')) {
                const svgRegex = /(<svg[\s\S]*?<\/svg>)/;
                const svgMatch = content.match(svgRegex);
                if (svgMatch) {
                    return `${openTag}\n                ${svgMatch[1]} ${text}\n            ${closeTag}`;
                }
            }
            return `${openTag}${text}${closeTag}`;
        });
    }

    // Set correct value in dropdown
    translated = translated.replace(
        '<select id="language-select"',
        '<select id="language-select"'
    );
    // Since select element doesn't have an easy regex replacement for the selected option,
    // we can add `selected` to the correct option.
    translated = translated.replace(/(<option value="[a-z]{2}")( selected)?( style="color: black;">)/g, '$1$3'); // clear existing
    translated = translated.replace(new RegExp(`(<option value="${lang}")`), '$1 selected');

    return translated;
}

// 1. First, let's add hreflangs to the main index.html if not already there
let mainHtml = indexHtml;
if (!mainHtml.includes('hreflang="x-default"')) {
    mainHtml = mainHtml.replace('</title>', '</title>' + hreflangs);
    fs.writeFileSync(indexPath, mainHtml, 'utf-8');
    console.log('Updated main index.html with hreflang tags.');
}

// 2. Generate subdirectories and HTML for other languages
langs.forEach(lang => {
    const dir = path.join(rootDir, lang);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
    
    const translatedHtml = translateHtml(mainHtml, lang);
    fs.writeFileSync(path.join(dir, 'index.html'), translatedHtml, 'utf-8');
    console.log(`Generated static HTML for ${lang} in /${lang}/index.html`);
});

console.log('Build complete.');
