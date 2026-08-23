(function(){

var DATA = window.PortfolioData;
var LOG = DATA.LOG;

var el = {
  gallery: document.getElementById('gallery'),
  categoryNav: document.getElementById('categoryNav'),
  status: document.getElementById('status'),
  loading: document.getElementById('pageLoading')
};

function slug(s){
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

function isVideo(src){ return /\.(mp4|webm|mov)$/i.test(src||''); }

function makeTile(row){
  var url = DATA.rowToImageUrl(row);
  var tile = document.createElement('div');
  tile.className = 'tile';

  var media = isVideo(row.source)
    ? Object.assign(document.createElement('video'), { src:url, autoplay:true, muted:true, loop:true, playsInline:true })
    : Object.assign(document.createElement('img'), { src:url, alt: row.text || row.category, loading:'lazy' });
  tile.appendChild(media);

  if(row.text){
    var cap = document.createElement('div');
    cap.className = 'tile-caption';
    cap.textContent = row.text;
    tile.appendChild(cap);
  }

  var meta = document.createElement('div');
  meta.className = 'tile-meta';
  meta.textContent = [row.category, row.year].filter(Boolean).join(' · ');
  tile.appendChild(meta);

  return tile;
}

function render(groups){
  el.gallery.innerHTML = '';
  el.categoryNav.innerHTML = '';

  groups.forEach(function(g, idx){
    var anchorId = 'cat-'+slug(g.category);

    var navLink = document.createElement('a');
    navLink.href = '#'+anchorId;
    navLink.className = 'nav-link';
    navLink.textContent = g.category;
    el.categoryNav.appendChild(navLink);

    var divider = document.createElement('section');
    divider.className = 'category-divider ' + (idx % 2 === 0 ? 'tone-charcoal' : 'tone-bone');
    divider.id = anchorId;
    divider.innerHTML =
      '<div class="divider-inner">'+
        '<span class="divider-num">'+String(idx+1).padStart(2,'0')+'</span>'+
        '<h2 class="divider-title">'+g.category+'</h2>'+
      '</div>';
    el.gallery.appendChild(divider);

    var grid = document.createElement('div');
    grid.className = 'tile-grid';
    g.cards.forEach(function(card){
      card.rows.forEach(function(row){
        var tileEl = makeTile(row);
        if(card.type === 'cluster') tileEl.classList.add('tile-clustered');
        grid.appendChild(tileEl);
      });
    });
    el.gallery.appendChild(grid);
  });
}

function hideLoading(){ el.loading.classList.add('hidden'); }

function boot(rows){
  var groups = DATA.buildCategoryGroups(rows);
  render(groups);
  hideLoading();
}

el.status.textContent = 'Loading portfolio…';
DATA.fetchSheetData()
  .then(function(rows){
    console.log(LOG, 'Google Sheets import succeeded.');
    el.status.textContent = '';
    boot(rows);
  })
  .catch(function(err){
    console.error(LOG, 'Google Sheets import FAILED:', err.message);
    console.error(LOG, 'Full error:', err);
    el.status.classList.add('error');
    el.status.innerHTML = 'Google Sheets import failed: '+err.message+'<br>Showing sample placeholder content. See console for full diagnostic log.';
    boot(DATA.sampleRows());
  });

})();
