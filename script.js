// Navigation buttons smoothly scroll to respective sections or redirect About Us
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', function (e) {
    e.preventDefault();
    const link = btn.getAttribute('data-link');

    // About Us redirection
    if (btn.id === 'aboutNav') {
      window.location.href = 'about.html';
      return;
    }

    // Scroll top for Home
    if (link === '#hero') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    // Scroll to specific section
    const section = document.querySelector(link);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Camera Controls
function startCamera() {
  const video = document.getElementById('camera');
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then(stream => {
      video.srcObject = stream;
    })
    .catch(err => {
      showCard('Camera access denied or unavailable.', false);
      console.error(err);
    });
}

function scanFromCamera() {
  const video = document.getElementById('camera');
  if (!video.srcObject) {
    showCard('Please start the camera first.', false);
    return;
  }
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  performOCR(canvas.toDataURL('image/png'));
}

function scanImage() {
  const imageInput = document.getElementById('imageInput');
  if (imageInput.files.length === 0) {
    showCard('Please upload an image first.', false);
    return;
  }
  const file = imageInput.files[0];
  performOCR(file);
}

function performOCR(imageSource) {
  showLoader(true);
  hideMeter();
  clearCard();
  Tesseract.recognize(imageSource, 'eng', {
    logger: m => console.log(m),
  })
    .then(({ data: { text } }) => {
      showLoader(false);
      if (!text || text.trim().length === 0) {
        showCard('No ingredients detected.', false);
        return;
      }
      const { percent, healthFlag, chips, note } = evaluateIngredients(text);
      showMeter(percent, healthFlag);
      showCard(text, true, chips, note);
    })
    .catch(err => {
      showLoader(false);
      showCard('Error scanning image.', false);
      console.error(err);
    });
}

function evaluateIngredients(text) {
  const badIngredients = [
    { keyword: 'sugar', note: 'High sugar' },
    { keyword: 'palm oil', note: 'Palm oil' },
    { keyword: 'artificial', note: 'Artificial additives' },
    { keyword: 'preservative', note: 'Preservative' },
    { keyword: 'color', note: 'Color additive' },
    { keyword: 'flavor', note: 'Artificial flavoring' },
  ];
  let flagCount = 0;
  const found = [];
  const input = text.toLowerCase();
  badIngredients.forEach(({ keyword, note }) => {
    if (input.includes(keyword)) {
      flagCount++;
      found.push(note);
    }
  });
  let percent;
  if (flagCount === 0) percent = 90;
  else if (flagCount === 1) percent = 70;
  else if (flagCount === 2) percent = 55;
  else percent = 35;
  let healthFlag = flagCount === 0 ? 'healthy' : 'unhealthy';
  const chips = [
    {
      type: healthFlag,
      text: healthFlag === 'healthy' ? 'Healthy' : 'Contains Additives',
    },
  ];
  const note = found.length ? 'Noted: ' + found.join(', ') : 'Great choice! Almost no flagged additives.';
  return { percent, healthFlag, chips, note };
}

function showLoader(state) {
  document.getElementById('scanner-loader').style.display = state ? 'flex' : 'none';
}

function showCard(text, isGood, chips = [], note = '') {
  const container = document.getElementById('ocrCardContainer');
  container.innerHTML = `
    <div class="card-ingredient">
      <div>
        ${chips
          .map(c => `<span class="chip ${c.type}">${c.text}</span>`)
          .join('')}
      </div>
      <h3>Ingredients Detected</h3>
      <p style="white-space: pre-wrap;">${text.replace(/\n+/g, '<br>')}</p>
      <small>${note}</small>
    </div>
  `;
}
function clearCard() {
  document.getElementById('ocrCardContainer').innerHTML = '';
}

function showMeter(percent, healthFlag) {
  const arc = document.getElementById('meterArc');
  const value = document.getElementById('meterValue');
  const healthLabel = document.getElementById('healthLabel');
  const container = document.getElementById('meterContainer');
  arc.style.stroke = healthFlag === 'healthy' ? '#44c796' : '#fd8e5e';
  let current = 0;
  container.style.display = 'flex';
  const circumference = 2 * Math.PI * 85;
  arc.style.strokeDashoffset = circumference;
  value.textContent = 0;
  healthLabel.textContent = healthFlag === 'healthy' ? 'Healthy' : 'Contains Additives';
  function animate() {
    if (current < percent) {
      current += 2;
      arc.style.strokeDashoffset = circumference - (current / 100) * circumference;
      value.textContent = current;
      requestAnimationFrame(animate);
    } else {
      arc.style.strokeDashoffset = circumference - (percent / 100) * circumference;
      value.textContent = percent;
    }
  }
  animate();
}
function hideMeter() {
  document.getElementById('meterContainer').style.display = 'none';
}
