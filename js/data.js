/* =======================================================================
   DATA LAYER — Google Sheets fetch, parsing, validation, grouping.
   Classic script, sets window.PortfolioData.
   ======================================================================= */
window.PortfolioData = (function(){

var LOG = '[Portfolio Gallery]';

var CONFIG = {
  SHEET_ID: '1EUhk_-_uWbQkyMQkdimEscjaun1v7lgWm5f5XDWYlo0',
  SHEET_TAB: 'Main',
  IMAGES_PATH: 'images/'
};

function sheetCsvUrl(){
  return 'https://docs.google.com/spreadsheets/d/'+CONFIG.SHEET_ID+
    '/gviz/tq?tqx=out:csv&sheet='+encodeURIComponent(CONFIG.SHEET_TAB);
}

function normalizeHeader(h){
  return h.trim().toLowerCase().replace(/\./g,'').replace(/\s+/g,'_');
}

function normalizeRow(raw, idx){
  var row = {};
  Object.keys(raw).forEach(function(k){
    row[normalizeHeader(k)] = (raw[k]==null? '' : raw[k].toString().trim());
  });
  row.source = row.source || row.image || row.file || row.filename || '';
  row.page_no = parseFloat(row.page_no);
  row._rowNum = idx + 2;
  // page_enable: hidden only if explicitly "no" (case-insensitive). Blank/anything else = visible.
  row.visible = row.page_enable.toLowerCase() !== 'no';
  return row;
}

function fetchSheetData(){
  var url = sheetCsvUrl();
  console.log(LOG, '1) Fetch starting…');
  console.log(LOG, '2) Requesting URL:', url);

  return fetch(url)
    .then(function(res){
      console.log(LOG, '3) Fetch response received. HTTP status:', res.status, res.statusText);
      if(!res.ok){
        throw new Error('HTTP '+res.status+' — check the sheet is shared as "Anyone with the link – Viewer", and that SHEET_ID/SHEET_TAB are correct.');
      }
      return res.text();
    })
    .then(function(csvText){
      console.log(LOG, '4) Raw response (first 400 chars):', csvText.slice(0,400));
      if(/^\s*<!DOCTYPE html/i.test(csvText) || /accounts\.google\.com/.test(csvText)){
        throw new Error('Received an HTML/login page instead of CSV — the sheet is not publicly viewable. Set sharing to "Anyone with the link – Viewer".');
      }
      var parsed = Papa.parse(csvText, { header:true, skipEmptyLines:true });
      if(parsed.errors && parsed.errors.length){
        console.warn(LOG, 'CSV parse warnings:', parsed.errors);
      }
      console.log(LOG, '5) Parsed', parsed.data.length, 'raw rows. Detected columns:', parsed.meta.fields);

      var rows = parsed.data.map(normalizeRow);
      var valid = [];
      rows.forEach(function(row){
        if(isNaN(row.page_no) || !row.source || !row.category){
          console.warn(LOG, 'Skipping sheet row', row._rowNum, '— missing page_no, source, or category.', row);
          return;
        }
        if(!row.visible){
          console.log(LOG, 'Row', row._rowNum, 'hidden via page_enable=no, skipping:', row.source);
          return;
        }
        valid.push(row);
      });
      valid.sort(function(a,b){ return a.page_no - b.page_no; });

      console.log(LOG, '6) Visible rows:', valid.length, 'of', rows.length, 'total rows');
      valid.forEach(function(r){ console.log(LOG, '   page', r.page_no, r.category, '→', r.source, r.relation? '(relation: '+r.relation+')':''); });

      if(valid.length === 0){
        throw new Error('Sheet loaded successfully but contained zero visible, valid rows.');
      }
      return valid;
    });
}

function rowToImageUrl(row){
  if(/^(https?:|data:)/i.test(row.source)) return row.source;
  return CONFIG.IMAGES_PATH + row.source;
}

// Groups rows into: [{ category, cards: [{type:'single'|'cluster', rows:[...]}] }]
// Category = top-level section, in first-appearance order.
// Within a category, rows sharing a non-empty `relation` value cluster together
// (kept adjacent in the grid); rows with no relation are standalone tiles.
function buildCategoryGroups(rows){
  var order = [];
  var byCat = {};
  rows.forEach(function(r){
    if(!byCat[r.category]){ byCat[r.category] = []; order.push(r.category); }
    byCat[r.category].push(r);
  });

  return order.map(function(cat){
    var catRows = byCat[cat];
    var used = {};
    var cards = [];
    catRows.forEach(function(r, i){
      if(used[i]) return;
      if(r.relation){
        var members = [];
        catRows.forEach(function(r2, j){
          if(!used[j] && r2.relation === r.relation){ members.push(r2); used[j] = true; }
        });
        cards.push({ type:'cluster', relation:r.relation, rows: members });
      } else {
        used[i] = true;
        cards.push({ type:'single', rows: [r] });
      }
    });
    return { category: cat, cards: cards };
  });
}

/* ---------------- SAMPLE FALLBACK ---------------- */
function placeholderSvg(label, sub, bg, fg){
  var w = 1000, h = 1300;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+
    '<rect width="'+w+'" height="'+h+'" fill="'+bg+'"/>'+
    '<text x="'+(w/2)+'" y="'+(h/2-14)+'" font-family="Georgia,serif" font-size="48" fill="'+fg+'" text-anchor="middle" font-weight="bold">'+label+'</text>'+
    '<text x="'+(w/2)+'" y="'+(h/2+34)+'" font-family="monospace" font-size="18" letter-spacing="2" fill="'+fg+'" text-anchor="middle">'+sub+'</text>'+
  '</svg>';
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}

function sampleRows(){
  var bone='%23E9E8E3', teal='%23134455';
  function ph(label,sub){ return placeholderSvg(label,sub,'#134455','#E9E8E3'); }
  return [
    { page_no:1, category:'Logo Design', source: ph('Logo 01','SAMPLE'), year:'2024', relation:'', text:'A wordmark exploration.', visible:true },
    { page_no:2, category:'Social Media Designs', source: ph('Social 01','SAMPLE'), year:'2024', relation:'social-set', text:'', visible:true },
    { page_no:3, category:'Social Media Designs', source: ph('Social 02','SAMPLE'), year:'2024', relation:'social-set', text:'', visible:true },
    { page_no:4, category:'Packaging Design', source: ph('Packaging 01','SAMPLE'), year:'2024', relation:'', text:'', visible:true },
    { page_no:5, category:'Motion Design', source: ph('Motion 01','SAMPLE — VIDEO'), year:'2024', relation:'', text:'', visible:true },
    { page_no:6, category:'Print Design', source: ph('Print 01','SAMPLE'), year:'2024', relation:'', text:'', visible:true }
  ];
}

return {
  CONFIG: CONFIG,
  fetchSheetData: fetchSheetData,
  rowToImageUrl: rowToImageUrl,
  buildCategoryGroups: buildCategoryGroups,
  sampleRows: sampleRows,
  LOG: LOG
};

})();
