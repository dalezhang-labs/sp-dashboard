// Run with: npx agent-browser eval "$(cat scripts/get-slugs.js)"
// Or paste into browser console

var cards = document.querySelectorAll('h3');
var results = [];
for (var i = 0; i < cards.length - 4; i++) {
  var el = cards[i].closest('[style*="cursor: pointer"], [style*="cursor:pointer"]');
  if (!el) el = cards[i].parentElement;
  var attrs = {};
  for (var j = 0; j < el.attributes.length; j++) {
    var a = el.attributes[j];
    if (a.name.indexOf('data') > -1) attrs[a.name] = a.value;
  }
  results.push({name: cards[i].textContent.trim(), attrs: attrs, tag: el.tagName, classes: el.className.substring(0, 80)});
}
JSON.stringify(results.slice(0, 3));
