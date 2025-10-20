let operator = "";
let html5QrCodeInline = null;
let quaggaRunning = false;

// keep a short debounce for detections
window._lastDetectedCode = null;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('modeToggle').addEventListener('change', () => {
    const isBarcode = document.getElementById('modeToggle').checked;
    document.getElementById('modeLabel').innerText = isBarcode ? 'Barcode Mode' : 'QR Mode';
  });
});

function confirmOperator(){
  const name = document.getElementById('operatorName').value.trim();
  if(!name){ alert('Please type operator name'); return; }
  operator = name;
  document.getElementById('operatorName').disabled = true;
  document.getElementById('confirmOperatorBtn').disabled = true;
  document.getElementById('qrInput').disabled = false;
  showStatus(`Operator confirmed: ${operator}`,'success');
}

function startInlineScanner(){
  if(!operator){ alert('Please confirm operator first'); return; }
  const isBarcode = document.getElementById('modeToggle').checked;
  document.getElementById('inlineScannerArea').style.display = 'block';
  document.getElementById('startScanBtn').disabled = true;
  document.getElementById('stopScanBtn').disabled = false;
  if(isBarcode){ startBarcodeInline(); } else { startQRInline(); }
}

function stopInlineScanner(){
  if(html5QrCodeInline){
    try{ html5QrCodeInline.stop().catch(()=>{}); }catch(e){}
    html5QrCodeInline = null;
  }
  if(quaggaRunning && window.Quagga){
    try{ Quagga.stop(); Quagga.offDetected(); Quagga.offProcessed(); }catch(e){}
    quaggaRunning = false;
  }
  document.getElementById('html5qrcode_inline').style.display = 'none';
  document.getElementById('quagga_inline').style.display = 'none';
  document.getElementById('inlineScannerArea').style.display = 'none';
  document.getElementById('startScanBtn').disabled = false;
  document.getElementById('stopScanBtn').disabled = true;
  window._lastDetectedCode = null;
}

// QR scanning (unchanged)
function startQRInline(){
  const div = document.getElementById('html5qrcode_inline');
  div.style.display = 'block';
  document.getElementById('quagga_inline').style.display = 'none';
  html5QrCodeInline = new Html5Qrcode("html5qrcode_inline");
  html5QrCodeInline.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    code => {
      handleScan(code.trim());
      // don't auto-stop for QR - allow continuous scans; stop only if you prefer
      // stopInlineScanner();
    }
  ).catch(err => showInlineAlert('Camera error: '+err,'danger'));
}

// Improved barcode config for Quagga
function startBarcodeInline(){
  const preview = document.getElementById('quagga_inline');
  preview.style.display = 'block';
  document.getElementById('html5qrcode_inline').style.display = 'none';

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    showInlineAlert('Camera API not supported in this browser.','danger');
    return;
  }

  // stop any previous Quagga instance
  if(quaggaRunning && window.Quagga){
    try{ Quagga.stop(); Quagga.offDetected(); Quagga.offProcessed(); }catch(e){}
    quaggaRunning = false;
  }

  const numWorkers = (navigator.hardwareConcurrency && navigator.hardwareConcurrency > 0) ? navigator.hardwareConcurrency : 4;

  Quagga.init({
    inputStream: {
      type: "LiveStream",
      constraints: {
        facingMode: "environment",
        width: { min: 640, ideal: 1280, max: 1920 },
        height: { min: 360, ideal: 720 }
      },
      area: { // reduce area to center region to improve detection speed/accuracy
        top: "20%",    // top offset
        right: "10%",  // right offset
        left: "10%",   // left offset
        bottom: "20%"  // bottom offset
      },
      target: document.querySelector('#interactive')
    },
    locator: {
      patchSize: "medium", // x-small, small, medium, large
      halfSample: false    // set false to improve accuracy (may be slower)
    },
    numOfWorkers: numWorkers,
    frequency: 10, // process frames per second
    decoder: {
      readers: [
        "code_128_reader",
        "ean_reader",
        "ean_8_reader",
        "upc_reader",
        "upc_e_reader",
        "code_39_reader",
        "code_93_reader"
      ],
      multiple: false
    },
    locate: true
  }, function(err) {
    if (err) {
      showInlineAlert('Quagga init error: ' + err,'danger');
      return;
    }
    Quagga.start();
    quaggaRunning = true;
    showInlineAlert('Barcode scanner started — point camera at barcode','info');
  });

  // draw boxes for feedback and help users align barcode
  Quagga.onProcessed(function(result) {
    const canvas = document.querySelector('#interactive canvas.drawingBuffer');
    if(!canvas) return;
    // keep Quagga's default drawing; we won't override here, but this hook allows extension later
  });

  // stronger detection filtering: require non-empty code, length >=3, and debounce
  Quagga.onDetected(function(result) {
    try {
      const code = result && result.codeResult && result.codeResult.code;
      if(!code) return;
      // basic filtering: ignore very short codes (noise)
      if(code.length < 3) return;
      // debounce same code
      if(window._lastDetectedCode === code) return;
      window._lastDetectedCode = code;
      setTimeout(()=>{ window._lastDetectedCode = null; }, 1200);

      // optional: you can check result.codeResult.format or result.codeResult.decodedCodes for confidence
      handleScan(code.trim());
      // stop after a successful read to avoid duplicates; remove if you want continuous scanning
      stopInlineScanner();
    } catch(e) {
      // ignore processing errors
    }
  });
}

function showInlineAlert(msg, type='info'){
  document.getElementById('inlineAlertArea').innerHTML = `<div class="alert alert-${type} mb-2">${msg}</div>`;
}

function handleScan(code){
  // integrate with your existing process: place code into input field and provide feedback
  document.getElementById('qrInput').value = code;
  showInlineAlert('Scanned: '+code, 'success');

  // If you already have master/child processing logic in global scope, call it:
  // existing functions like loadMaster, processChild expect certain variables to exist.
  // We'll attempt to call the existing handler if defined.
  if(typeof window._externalHandleScan === 'function'){
    try{ window._externalHandleScan(code); }catch(e){}
  } else {
    // If your previous code expects handleScan, use it
    if(typeof window.handleScan === 'function' && window.handleScan !== handleScan){
      try{ window.handleScan(code); }catch(e){}
    }
  }
}

function showStatus(msg, type='info'){
  const box = document.getElementById('statusBox');
  box.innerHTML = `<div class="alert alert-${type} mb-0">${msg}</div>`;
}
