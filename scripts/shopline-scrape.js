const { execSync } = require('child_process');
const fs = require('fs');

function ab(cmd) {
  try {
    return execSync(`npx agent-browser ${cmd}`, { encoding: 'utf8', timeout: 15000 }).trim();
  } catch (e) {
    return e.stdout ? e.stdout.trim() : '';
  }
}

function abEval(js) {
  try {
    const raw = execSync(`npx agent-browser eval "${js}"`, { encoding: 'utf8', timeout: 10000 }).trim();
    if (raw.startsWith('"')) return JSON.parse(raw);
    if (raw.startsWith('{') || raw.startsWith('[')) return JSON.parse(raw);
    return raw;
  } catch (e) {
    return e.stdout ? e.stdout.trim() : 'error';
  }
}

function scrapeDetail() {
  const js = [
    'var t=document.body.innerText;',
    'var dev=t.match(/Developer[\\\\s\\\\S]{0,30}?By ([^\\\\n]+)/);',
    'var rm=t.match(/(\\\\d\\\\.?\\\\d?)\\\\s*\\\\((\\\\d+)\\\\)/);',
    'var cat=t.match(/Category\\\\n\\\\n([^\\\\n]+)/);',
    'var dates=t.match(/(?:January|February|March|April|May|June|July|August|September|October|November|December)\\\\s+\\\\d{1,2},\\\\s+\\\\d{4}/g);',
    'var price=t.indexOf("Paid App")>-1?"Paid":"Free";',
    'var title=document.querySelector("h2");',
    'JSON.stringify({name:title?title.textContent.trim():"?",developer:dev?dev[1].trim():"?",rating:rm?rm[1]:"?",reviews:rm?rm[2]:"?",category:cat?cat[1].trim():"?",price:price,reviewDates:dates||[],url:location.pathname})'
  ].join('');
  return abEval(js);
}

// Main
ab('open https://apps.shopline.com/sort');
ab('wait --load networkidle');

const results = [];

for (let i = 0; i < 36; i++) {
  ab('snapshot -i');
  const ref = `@e${i + 3}`;
  console.log(`[${i+1}/36] clicking ${ref}...`);

  ab(`click ${ref}`);
  ab('wait --timeout 2000');

  const url = abEval('location.pathname');
  if (url && typeof url === 'string' && url.includes('/detail/')) {
    const data = scrapeDetail();
    if (data && typeof data === 'object') {
      results.push(data);
      const oldest = data.reviewDates ? data.reviewDates[data.reviewDates.length - 1] : 'n/a';
      console.log(`  ✓ ${data.name} | ${data.developer} | ${data.rating}★(${data.reviews}) | ${data.price} | oldest: ${oldest}`);
    } else {
      console.log(`  ✗ parse failed: ${JSON.stringify(data).substring(0, 100)}`);
    }
  } else {
    console.log(`  ✗ no navigation, path: ${url}`);
  }

  ab('open https://apps.shopline.com/sort');
  ab('wait --load networkidle');
}

fs.writeFileSync('scripts/shopline-apps-page1.json', JSON.stringify(results, null, 2));
console.log(`\nDone! Saved ${results.length} apps to scripts/shopline-apps-page1.json`);
ab('close');
