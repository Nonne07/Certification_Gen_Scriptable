// --------------------------------------------------------------
// Certificate Generator App Logic
// --------------------------------------------------------------

// Layout Coordinates (based on 1600 x 1131 resolution)
// Layout Coordinates (based on 1600 x 1131 resolution)
const CONFIG = {
  canvasWidth: 1600,
  canvasHeight: 1131,
  name: {
    y: 520, // Centered vertically
    font: '700 90px "Dancing Script", cursive',
    color: '#184551',
    align: 'center'
  },
  course: {
    y: 670, // Moved down to avoid overlapping the line above
    font: 'bold 28px Inter, sans-serif',
    color: '#000000',
    align: 'center'
  },
  date: {
    x: 625, // Moved back slightly right to 625px
    y: 707, 
    font: '27px Inter, sans-serif',
    color: '#000000',
    align: 'center',
    letterSpacing: '1.5px'
  },
  rank: {
    x: 885, // Right after the colon
    y: 747, 
    font: 'bold 28px Inter, sans-serif',
    color: '#d34b32',
    align: 'left'
  }
};

// Global State
let isGridView = false;
let currentIndex = 0;
let isFileLoaded = false;
let records = []; // Array of {Name, Course, Date, Rank}
let bgImage = null; // Image object for background

// DOM Elements
const themeBtn = document.getElementById('theme-toggle');
const tabs = document.querySelectorAll('.tab');
const panes = document.querySelectorAll('.tab-pane');
const singleNav = document.getElementById('single-nav');
const singleWrapper = document.getElementById('single-view-wrapper');
const gridWrapper = document.getElementById('grid-view-wrapper');
const previewArea = document.getElementById('preview-area');
const btnSingle = document.getElementById('btn-single');
const btnGrid = document.getElementById('btn-grid');
const mainCanvas = document.getElementById('preview-canvas');
const downloadBtn = document.getElementById('download-btn');

// --------------------------------------------------------------
// Fetch Configurations
// --------------------------------------------------------------
fetch('./courses.json').then(res => res.json()).then(data => {
  const select = document.getElementById('input-course');
  data.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
  if(data.length > 0) drawSingle();
}).catch(console.error);

fetch('./ranks.json').then(res => res.json()).then(data => {
  const select = document.getElementById('input-rank');
  data.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
  if(data.length > 0) drawSingle();
}).catch(console.error);

// Set default date to today
const today = new Date().toISOString().split('T')[0];
document.getElementById('input-date').value = today;

// --------------------------------------------------------------
// Theme
// --------------------------------------------------------------
const setTheme = t => {
  document.documentElement.dataset.theme = t;
  localStorage.setItem('theme', t);
};
themeBtn.addEventListener('click', () => {
  const newT = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(newT);
});
setTheme(localStorage.getItem('theme') || 'light');


// --------------------------------------------------------------
// Background Template Loading
// --------------------------------------------------------------
bgImage = new Image();
bgImage.onload = () => {
  refreshViews();
};
// Use a local template image file with cache busting to avoid browser caching
bgImage.src = './template.png?v=' + new Date().getTime();


// --------------------------------------------------------------
// Tabs & Views
// --------------------------------------------------------------
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    tabs.forEach(t => t.classList.remove('active'));
    panes.forEach(p => p.style.display = 'none');
    tab.classList.add('active');
    document.getElementById(tab.dataset.target).style.display = 'block';
    
    // Switch to single view if returning to manual
    if (tab.dataset.target === 'tab-manual' && isGridView) {
      switchView('single');
    } else {
      refreshViews();
    }
  });
});

function switchView(view) {
  if(view === 'grid') {
    isGridView = true;
    btnGrid.classList.add('active');
    btnSingle.classList.remove('active');
    singleNav.style.display = 'none';
    singleWrapper.style.display = 'none';
    gridWrapper.style.display = 'grid';
    previewArea.style.alignItems = 'flex-start';
    renderGrid();
  } else {
    isGridView = false;
    btnSingle.classList.add('active');
    btnGrid.classList.remove('active');
    singleNav.style.display = 'block';
    gridWrapper.style.display = 'none';
    singleWrapper.style.display = 'block';
    previewArea.style.alignItems = 'center';
    drawSingle();
  }
}

btnSingle.addEventListener('click', () => switchView('single'));
btnGrid.addEventListener('click', () => switchView('grid'));

function refreshViews() {
  if (isGridView) {
    renderGrid();
  } else {
    drawSingle();
  }
}


// --------------------------------------------------------------
// Data Input Handling
// --------------------------------------------------------------
document.querySelectorAll('#student-form input, #student-form select').forEach(el => {
  el.addEventListener('input', () => {
    if(!isGridView) drawSingle();
  });
});

document.getElementById('csv-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  document.getElementById('upload-status').textContent = file ? file.name : 'No file chosen';
  if(file) {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        records = results.data;
        isFileLoaded = true;
        currentIndex = 0;
        document.getElementById('csv-controls').style.display = 'block';
        refreshViews();
      }
    });
  }
});

document.getElementById('prev-btn').addEventListener('click', () => {
  if(isFileLoaded && !isGridView && records.length > 0) {
    currentIndex = (currentIndex - 1 + records.length) % records.length;
    drawSingle();
  }
});

document.getElementById('next-btn').addEventListener('click', () => {
  if(isFileLoaded && !isGridView && records.length > 0) {
    currentIndex = (currentIndex + 1) % records.length;
    drawSingle();
  }
});


// --------------------------------------------------------------
// Rendering
// --------------------------------------------------------------
function formatAppDate(dateString) {
  if (!dateString) return '';
  // If dateString is YYYY-MM-DD from the date picker
  const parts = dateString.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  return dateString; // fallback
}

function getCurrentData() {
  const isManual = document.querySelector('.tab.active').dataset.target === 'tab-manual';
  if (isManual) {
    return {
      Name: document.getElementById('input-name').value || '',
      Course: document.getElementById('input-course').value || '',
      Date: formatAppDate(document.getElementById('input-date').value) || '',
      Rank: document.getElementById('input-rank').value || ''
    };
  } else if (isFileLoaded && records.length > 0) {
    // If CSV data needs formatting, do it here too, but assume CSV provides exact string for now
    return records[currentIndex];
  }
  return { Name: 'Name', Course: 'FUNDAMENTAL OF IC DESIGN AND VERIFICATION', Date: '08/06/2026', Rank: 'GOOD' };
}

function drawSingle() {
  const ctx = mainCanvas.getContext('2d');
  const data = getCurrentData();
  
  if (isFileLoaded && document.querySelector('.tab.active').dataset.target === 'tab-csv') {
    document.getElementById('record-count').textContent = `${currentIndex + 1} / ${records.length}`;
  }

  renderToContext(ctx, CONFIG.canvasWidth, CONFIG.canvasHeight, data);
}

function renderGrid() {
  if (!isFileLoaded || records.length === 0) return;
  gridWrapper.innerHTML = '';
  
  records.forEach((data, index) => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    
    const canvas = document.createElement('canvas');
    canvas.width = CONFIG.canvasWidth;
    canvas.height = CONFIG.canvasHeight;
    const ctx = canvas.getContext('2d');
    renderToContext(ctx, canvas.width, canvas.height, data);
    
    const info = document.createElement('div');
    info.className = 'grid-item-info';
    info.textContent = `${index + 1}. ${data.Name || 'Unknown'}`;

    item.appendChild(canvas);
    item.appendChild(info);
    gridWrapper.appendChild(item);
  });
}

function renderToContext(ctx, w, h, data) {
  // Clear
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  
  // Draw Background if uploaded
  if (bgImage) {
    ctx.drawImage(bgImage, 0, 0, w, h);
  } else {
    // Draw placeholder outline if no background
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#a0aec0';
    ctx.font = '24px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Please upload the blank certificate template in the "Manual Entry" tab.', w/2, 60);
  }

  // Restore default baseline
  ctx.textBaseline = 'alphabetic';
  const centerX = w / 2;

  // 1. Name
  if (data.Name) {
    ctx.font = CONFIG.name.font;
    ctx.fillStyle = CONFIG.name.color;
    ctx.textAlign = CONFIG.name.align;
    ctx.fillText(data.Name, centerX, CONFIG.name.y);
  }

  // 2. Course
  if (data.Course) {
    ctx.font = CONFIG.course.font;
    ctx.fillStyle = CONFIG.course.color;
    ctx.textAlign = CONFIG.course.align;
    ctx.fillText(data.Course, centerX, CONFIG.course.y);
  }

  // 3. Date (in the gap)
  if (data.Date) {
    ctx.font = CONFIG.date.font;
    ctx.fillStyle = CONFIG.date.color;
    ctx.textAlign = CONFIG.date.align;
    if ('letterSpacing' in ctx && CONFIG.date.letterSpacing) {
      ctx.letterSpacing = CONFIG.date.letterSpacing;
    }
    ctx.fillText(data.Date, CONFIG.date.x, CONFIG.date.y);
    if ('letterSpacing' in ctx && CONFIG.date.letterSpacing) {
      ctx.letterSpacing = '0px';
    }
  }

  // 4. Rank (after CLASSIFICATION:)
  if (data.Rank) {
    ctx.font = CONFIG.rank.font;
    ctx.fillStyle = CONFIG.rank.color;
    ctx.textAlign = CONFIG.rank.align;
    ctx.fillText(data.Rank, CONFIG.rank.x, CONFIG.rank.y);
  }
}

// --------------------------------------------------------------
// Downloading
// --------------------------------------------------------------
downloadBtn.addEventListener('click', () => {
  const isManual = document.querySelector('.tab.active').dataset.target === 'tab-manual';
  
  if (isManual) {
    // Download single
    const data = getCurrentData();
    downloadCanvas(mainCanvas, `${data.Name || 'certificate'}.png`);
  } else {
    // Download bulk (one by one or zip)
    // For simplicity, without an external zip library, we trigger multiple downloads
    // A better way is using JSZip, but since we are vanilla, we will download them sequentially.
    if (!isFileLoaded || records.length === 0) {
      alert("No CSV data loaded!");
      return;
    }
    
    if(confirm(`This will download ${records.length} images directly to your computer. Proceed?`)) {
      records.forEach((record, idx) => {
        // Create an offscreen canvas for each
        const offscreen = document.createElement('canvas');
        offscreen.width = CONFIG.canvasWidth;
        offscreen.height = CONFIG.canvasHeight;
        renderToContext(offscreen.getContext('2d'), offscreen.width, offscreen.height, record);
        
        // Trigger download with slight delay to prevent browser blocking
        setTimeout(() => {
          downloadCanvas(offscreen, `${record.Name || 'cert_' + idx}.png`);
        }, idx * 200);
      });
    }
  }
});

function downloadCanvas(canvas, filename) {
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Initial draw
document.fonts.ready.then(() => {
  drawSingle();
});


