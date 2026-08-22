import { Book3D } from './book3d.js';

var DATA = window.PortfolioData;
var LOG = DATA.LOG;

var el = {
  stage: document.getElementById('stage'),
  loading: document.getElementById('stageLoading'),
  loadingText: document.getElementById('loadingText'),
  status: document.getElementById('status'),
  counter: document.getElementById('counter'),
  btnPrev: document.getElementById('btnPrev'),
  btnNext: document.getElementById('btnNext'),
  btnIndex: document.getElementById('btnIndex')
};

var book = Book3D({
  container: document.getElementById('bookCanvas'),
  onStateChange: function(state){
    console.log(LOG, 'State →', state);
    var busy = (state==='opening' || state==='closing' || state==='turning');
    el.btnPrev.disabled = busy;
    el.btnNext.disabled = busy;
  },
  onPageChange: updateCounter
});

function updateCounter(){
  el.counter.textContent = book.currentLabel();
}

el.btnNext.addEventListener('click', function(){ book.next(); });
el.btnPrev.addEventListener('click', function(){ book.prev(); });
el.btnIndex.addEventListener('click', function(){ book.goToCover(); });

function hideLoading(){ el.loading.classList.add('hidden'); }

function boot(urls){
  hideLoading();
  book.load(urls);
  updateCounter();
}

el.status.textContent = 'Loading portfolio…';
DATA.fetchSheetData()
  .then(function(rows){
    console.log(LOG, 'Google Sheets import succeeded.');
    el.status.textContent = '';
    var urls = rows.map(DATA.rowToImageUrl);
    boot(urls);
  })
  .catch(function(err){
    console.error(LOG, 'Google Sheets import FAILED:', err.message);
    console.error(LOG, 'Full error:', err);
    el.status.classList.add('error');
    el.status.innerHTML = 'Google Sheets import failed: '+err.message+'<br>Showing sample placeholder pages so the book can still be tested. See console for full diagnostic log.';
    el.loadingText.textContent = 'Live data unavailable — loading sample pages…';
    boot(DATA.sampleImageUrls());
  });
