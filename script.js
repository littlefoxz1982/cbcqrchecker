// QR Checker - professional version with progress bars and detailed records
let operator = "";
const masterMap = {
  "T1": { "A1": 10 },
  "PC280-0K026": { "FFRHD": 1, "FFLHD": 1, "RRRHD": 1, "RRLHD": 1, "MANUALARMRESTD": 1 },
  "PC280-0K026-T2": { "FFRHD": 1, "FFLHD": 1, "RRRHD": 1, "RRLHD": 1 },
  "PC280-0K027": { "FFRHB": 1, "FFLHB": 1, "RRRHB": 1, "RRLHB": 1, "MANUALARMRESTB": 1 },
  "PC280-0K027-T2": { "FFRHB": 1, "FFLHB": 1, "RRRHB": 1, "RRLHB": 1 },
  "PC280-0K028": { "FRRHD": 1, "MANUALFRRHD": 1 },
  "PC280-0K029": { "FRLHD": 1, "MANUALFRLHD": 1 },  
  "PC280-0K02A": { "RRRHD": 1, "MANUALRRRHD": 1 },  
  "PC280-0K02B": { "RRLHD": 1, "MANUALRRLHD": 1 },
  "PC280-0K02C": { "FRRHB": 1, "MANUALFRRHB": 1 },
  "PC280-0K02D": { "FRLHB": 1, "MANUALFRLHB": 1 },
  "PC280-0K02F": { "RRRHB": 1, "MANUALRRRHB": 1 },
  "PC280-0K02G": { "RRLHB": 1, "MANUALRRLHB": 1 },
  "PC466-0K00R": { "SPMTB": 1, "MANUALSPMTB": 1 },
  "PC466-0K00Q": { "SPMTD": 1, "MANUALSPMTD": 1 },
  "PC466-0K00S": { "SPATD": 1, "MANUALSPATD": 1 },
  "PC466-0K00T": { "SPATB": 1, "MANUALSPATB": 1 },
  "PC466-0K00R-T2": { "SPMTB": 5 },
  "PC466-0K00Q-T2": { "SPMTD": 5 },
  "PC466-0K00S-T2": { "SPATD": 10 },
  "PC466-0K00T-T2": { "SPATB": 10 },
  "T3":{"C1":1,"C2":1,"C3":1}
};

let currentMaster = null;
let currentCounts = {}; // scanned counts per child
let totalRequired = 0;
let totalScanned = 0;

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('qrInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const code = e.target.value.trim();
      e.target.value = '';
      if (!operator) { showStatus('Please confirm operator name first','danger'); return; }
      if (!code) return;
      handleScan(code);
    }
  });
});

function confirmOperator(){
  const name = document.getElementById('operatorName').value.trim();
  if(!name){ alert('Please type operator name'); return; }
  operator = name;
  document.getElementById('qrInput').disabled = false;
  document.getElementById('operatorName').disabled = true;
  document.getElementById('confirmOperatorBtn').disabled = true;
  showStatus(`Operator confirmed: ${operator}`,'success');
  document.getElementById('qrInput').focus();
}

function handleScan(code){
  if(!currentMaster){
    // treat as master attempt
    if(masterMap[code]){
      loadMaster(code);
    } else {
      showStatus('Unknown master code: '+code,'danger');
    }
    return;
  }
  // treat as child
  processChild(code);
}

function loadMaster(code){
  currentMaster = code;
  currentCounts = {};
  totalRequired = 0;
  totalScanned = 0;
  const defs = masterMap[code];
  for(let p in defs){ currentCounts[p] = 0; totalRequired += defs[p]; }
  renderChecklist();
  showStatus(`Master ${code} loaded — required ${totalRequired} part(s).`,'info');
  document.getElementById('progressArea').style.display = 'block';
  document.getElementById('nextMasterBtn').classList.add('d-none');
  document.getElementById('qrInput').disabled = false;
}

function renderChecklist(){
  const area = document.getElementById('checklistArea') || document.getElementById('checklist');
  const defs = masterMap[currentMaster];
  if(!defs){ area.innerHTML = '<p class="text-muted">No master loaded.</p>'; return; }
  // child progress list
  let html = '<div class="mb-2"><small class="text-muted">Child part progress</small></div>';
  html += '<div id="childProgressListInner">';
  for(let p in defs){
    const req = defs[p], sc = currentCounts[p] || 0;
    const percent = Math.round((sc/req)*100);
    const barClass = sc>=req ? 'bg-success' : 'bg-info';
    html += `<div class="mb-2">
      <div class="d-flex justify-content-between mb-1"><div class="fw-semibold">${p}</div><div><span class="badge bg-primary badge-part">${sc}/${req}</span></div></div>
      <div class="progress progress-small"><div class="progress-bar ${barClass}" role="progressbar" style="width:${percent}%">${percent}%</div></div>
    </div>`;
  }
  html += '</div>';
  area.innerHTML = html;
  // overall progress
  const overall = totalRequired ? Math.round((totalScanned/totalRequired)*100) : 0;
  const overallBar = document.getElementById('overallBar');
  if(overallBar){ overallBar.style.width = overall + '%'; overallBar.innerText = overall + '%'; }
  // update child progress area if present
  const childArea = document.getElementById('childProgressList');
  if(childArea){ childArea.innerHTML = area.innerHTML; }
}

function processChild(code){
  const defs = masterMap[currentMaster];
  if(!defs[code]){ showStatus(`Scanned ${code} is not a child of ${currentMaster}`,'warning'); logRecord(code,'Invalid'); return; }
  const required = defs[code];
  const current = currentCounts[code] || 0;
  if(current >= required){ showStatus(`${code} already reached required qty`,'warning'); logRecord(code,'Over-scanned'); return; }
  currentCounts[code] = current + 1;
  totalScanned++;
  // log child matched
  logRecord(code,'Matched');
  showStatus(`${code} matched (${currentCounts[code]}/${required})`,'success');
  renderChecklist();
  if(totalScanned >= totalRequired){ // complete
    onMasterComplete();
  }
}

function logRecord(child, status){
  const tbody = document.querySelector('#resultsTable tbody');
  const row = tbody.insertRow();
  const now = new Date().toLocaleString();
  row.insertCell(0).innerText = now;
  row.insertCell(1).innerText = operator;
  row.insertCell(2).innerText = currentMaster;
  row.insertCell(3).innerText = child;
  row.insertCell(4).innerText = status;
}

function onMasterComplete(){
  showStatus(`All parts matched for ${currentMaster}`,'success');
  // add summary row
  const tbody = document.querySelector('#resultsTable tbody');
  const row = tbody.insertRow();
  row.classList.add('completed-row');
  const now = new Date().toLocaleString();
  row.insertCell(0).innerHTML = `<i class="bi bi-check-circle-fill text-success"></i> ${now}`;
  row.insertCell(1).innerText = operator;
  row.insertCell(2).innerText = currentMaster;
  row.insertCell(3).innerText = '—';
  row.insertCell(4).innerHTML = `<span class="text-success fw-bold">Master Completed ✓</span>`;
  // show next master button and lock QR input until nextMaster
  document.getElementById('nextMasterBtn').classList.remove('d-none');
  document.getElementById('qrInput').disabled = true;
}

function nextMaster(){
  currentMaster = null;
  currentCounts = {};
  totalRequired = 0;
  totalScanned = 0;
  document.getElementById('checklistArea').innerHTML = '<p class="text-muted">No master loaded.</p>';
  document.getElementById('childProgressList').innerHTML = '';
  document.getElementById('progressArea').style.display = 'none';
  document.getElementById('nextMasterBtn').classList.add('d-none');
  document.getElementById('qrInput').disabled = false;
  document.getElementById('qrInput').focus();
  showStatus('Ready for next master scan.','info');
}

function showStatus(msg, type='info'){
  const box = document.getElementById('statusBox') || document.getElementById('status');
  box.innerHTML = `<div class="alert alert-${type} mb-0">${msg}</div>`;
}

function exportAllRecords(){
  // include headers
  const rows = [];
  const table = document.getElementById('resultsTable');
  const headers = Array.from(table.querySelectorAll('thead th')).map(h => h.innerText.trim());
  rows.push(headers.join(','));
  const trList = Array.from(table.querySelectorAll('tbody tr'));
  trList.forEach(tr => {
    const cols = Array.from(tr.querySelectorAll('td')).map(td => {
      return '"' + td.innerText.replace(/"/g,'""') + '"';
    });
    rows.push(cols.join(','));
  });
  const csv = rows.join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'QR_Checker_All_Records.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function clearAll(){
  if(!confirm('Clear all records?')) return;
  document.querySelector('#resultsTable tbody').innerHTML = '';
  showStatus('All records cleared','info');
}
