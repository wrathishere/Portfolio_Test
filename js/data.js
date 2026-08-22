/* =======================================================================
   DATA LAYER — Google Sheets fetch, parsing, validation, sample fallback.
   Classic (non-module) script so it sets plain globals. Kept deliberately
   separate from the 3D rendering engine (js/book3d.js).
   ======================================================================= */
window.PortfolioData = (function(){

var LOG = '[Portfolio Book]';

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
        if(isNaN(row.page_no) || !row.source){
          console.warn(LOG, 'Skipping sheet row', row._rowNum, '— missing page_no or source.', row);
          return;
        }
        valid.push(row);
      });
      valid.sort(function(a,b){ return a.page_no - b.page_no; });

      console.log(LOG, '6) Valid pages found:', valid.length, 'of', rows.length, 'total rows');
      valid.forEach(function(r){ console.log(LOG, '   page', r.page_no, '→', r.source); });

      if(valid.length === 0){
        throw new Error('Sheet loaded successfully but contained zero valid rows (each row needs both page_no and source).');
      }
      return valid;
    });
}

function rowToImageUrl(row){
  if(/^https?:\/\//i.test(row.source)) return row.source;
  return CONFIG.IMAGES_PATH + row.source;
}

function placeholderSvg(label, sub, isCover){
  var bg = isCover ? '#F5E4CF' : '#FBF1E4';
  var w = 1040, h = 1470; // 2x for reasonable sharpness in 3D
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'" viewBox="0 0 '+w+' '+h+'">'+
    '<rect width="'+w+'" height="'+h+'" fill="'+bg+'"/>'+
    '<rect x="2" y="2" width="'+(w-4)+'" height="'+(h-4)+'" fill="none" stroke="#275CCC" stroke-opacity="0.15" stroke-width="2"/>'+
    '<text x="'+(w/2)+'" y="'+(h/2-16)+'" font-family="Georgia,serif" font-size="68" fill="#132559" text-anchor="middle" font-weight="bold">'+label+'</text>'+
    '<text x="'+(w/2)+'" y="'+(h/2+50)+'" font-family="monospace" font-size="24" letter-spacing="3" fill="#275CCC" text-anchor="middle">'+sub+'</text>'+
  '</svg>';
  return 'data:image/svg+xml;charset=UTF-8,'+encodeURIComponent(svg);
}

function sampleImageUrls(){
  var urls = [placeholderSvg('Joydip Bhattacharya','SELECTED WORKS · COVER', true)];
  for(var i=1;i<=8;i++){
    urls.push(placeholderSvg('Sample Page '+i, 'PLACEHOLDER — REPLACE VIA SHEET', false));
  }
  urls.push(placeholderSvg('Back Cover','', true));
  return urls;
}

return {
  CONFIG: CONFIG,
  fetchSheetData: fetchSheetData,
  rowToImageUrl: rowToImageUrl,
  sampleImageUrls: sampleImageUrls,
  LOG: LOG
};

})();
