// GAS URL
const GAS_URL_WORD = "https://script.google.com/macros/s/AKfycbwjavHiBOUOYrA_WCq2lxuWtuOMpGWsc_D7MtMn0tgdVjTqE8m_7cbcguahrbkCEtd_Uw/exec"; 
const GAS_URL_REDONE = "https://script.google.com/macros/s/AKfycbwXDCSMakZ9lNb23ZFSSZk2fEJjLorzfIM5leiDIg_z3zsgFVn3L_59GSGkiYifElMG/exec"; 

// 共有データ変数
var appData = [];        
var redoneData = [];     
var dictStandard = [];   
var dictPig = [];        
var dictEnglish = [];    

// 高速化用データ
var dictSets = { std: new Set(), pig: new Set(), eng: new Set() };
var anagramMaps = { std: {}, pig: {}, eng: {} };

// モード管理
var currentMode = 'gojuon'; 
var activeLayout = []; 
var selectedCells = []; 
var customLayout = [];
var isEditMode = false;
var dragSrc = null;

// 五十音レイアウト (共通)
var GOJUON_LAYOUT = [
    ['ん','わ','ら','や','ま','は','な','た','さ','か','あ'],
    ['','','り','','み','ひ','に','ち','し','き','い'],
    ['','','る','ゆ','む','ふ','ぬ','つ','す','く','う'],
    ['','','れ','','め','へ','ね','て','せ','け','え'],
    ['','を','ろ','よ','も','ほ','の','と','そ','こ','お']
];

window.onload = function() {
    if(typeof loadData === 'function') loadData();             
    if(typeof loadRedoneData === 'function') loadRedoneData();       
    if(typeof loadAllDictionaries === 'function') loadAllDictionaries();  
    
    if (typeof KANJI_DATA !== 'undefined' && typeof searchKanji === 'function') {
        if(typeof expandKanjiKeywords === 'function') expandKanjiKeywords();
        searchKanji();
    }
    
    if(typeof initGojuuonTable === 'function') {
        initGojuuonTable();
    }
};

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'gojuon') {
        currentMode = 'gojuon';
        activeLayout = GOJUON_LAYOUT;
        if(typeof resetGojuon === 'function') resetGojuon();
    } else if (tabName === 'custom') {
        currentMode = 'custom';
        if (customLayout.length > 0) activeLayout = customLayout;
        if(typeof resetCustom === 'function') resetCustom();
    } else if (tabName === 'redone') {
        currentMode = 'redone';
    } else if (tabName === 'shift') {
        currentMode = 'shift';
    }
}

// 共通UI操作
function onCellClick(div, r, c, char) {
    if (selectedCells.length > 0 && selectedCells[selectedCells.length-1].char === char) {
        selectedCells.pop();
        div.classList.remove('selected');
    } else {
        selectedCells.push({char: char, r: r, c: c});
        div.classList.add('selected');
    }
    
    updateDisplay();
    drawLinesCommon(); 
    
    if (currentMode === 'gojuon' && typeof searchGojuon === 'function') searchGojuon();
    else if (currentMode === 'custom' && typeof searchCustom === 'function') searchCustom();
}

function resetSelection() {
    selectedCells = [];
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
    updateDisplay();
    drawLinesCommon();
    if(document.getElementById('gojuonResultArea')) document.getElementById('gojuonResultArea').innerHTML = "";
    if(document.getElementById('customResultArea')) document.getElementById('customResultArea').innerHTML = "";
}

function updateDisplay() {
    const text = selectedCells.map(s => s.char).join(' → ');
    const gojuonDisp = document.getElementById('gojuonSelectDisplay');
    if(gojuonDisp) gojuonDisp.innerText = "選択: " + (text || "なし");
    const customDisp = document.getElementById('customSelectDisplay');
    if(customDisp) customDisp.innerText = "選択: " + (text || "なし");
}

function drawLinesCommon() {
    const canvasId = (currentMode === 'gojuon') ? 'lineCanvasGojuon' : 'lineCanvasCustom';
    const gridId = (currentMode === 'gojuon') ? 'gojuonGrid' : 'customGrid';
    const canvas = document.getElementById(canvasId);
    const grid = document.getElementById(gridId);
    if (!canvas || !grid) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (selectedCells.length < 2) return;

    ctx.beginPath();
    ctx.strokeStyle = "rgba(231, 76, 60, 0.7)";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    selectedCells.forEach((cell, index) => {
        const targetDiv = grid.querySelector(`div[data-r="${cell.r}"][data-c="${cell.c}"]`);
        if (targetDiv) {
            const rect = targetDiv.getBoundingClientRect();
            const gridRect = grid.getBoundingClientRect();
            const x = rect.left - gridRect.left + rect.width / 2;
            const y = rect.top - gridRect.top + rect.height / 2;
            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
    });
    ctx.stroke();
}

// 共通検索ロジック: 形状検索
function searchByShapeCommon(selectedCells, targetWords, layout, resultAreaId) {
    const resultArea = document.getElementById(resultAreaId);
    if(!resultArea) return;
    resultArea.innerHTML = "";
    
    if (selectedCells.length < 2) return;
    if (!targetWords || targetWords.length === 0) return;

    const isCustom = (resultAreaId === 'customResultArea');
    const suffix = isCustom ? '_custom' : '';
    const rotEl = document.getElementById('allowRotation' + suffix);
    const refEl = document.getElementById('allowReflection' + suffix);
    const allowRotation = rotEl ? rotEl.checked : false;
    const allowReflection = refEl ? refEl.checked : false;

    const inputVectors = [];
    for(let i=0; i<selectedCells.length-1; i++) {
        inputVectors.push({
            dr: selectedCells[i+1].r - selectedCells[i].r,
            dc: selectedCells[i+1].c - selectedCells[i].c
        });
    }

    let patterns = [inputVectors];
    if (allowRotation) {
        const rot90 = inputVectors.map(v => ({ dr: v.dc, dc: -v.dr }));
        const rot180 = inputVectors.map(v => ({ dr: -v.dr, dc: -v.dc }));
        const rot270 = inputVectors.map(v => ({ dr: -v.dc, dc: v.dr }));
        patterns.push(rot90, rot180, rot270);
    }
    if (allowReflection) {
        const currentPatterns = [...patterns];
        currentPatterns.forEach(pat => {
            const reflected = pat.map(v => ({ dr: v.dr, dc: -v.dc }));
            patterns.push(reflected);
        });
    }

    const matchedWords = [];

    targetWords.forEach(word => {
        if (word.length !== selectedCells.length) return;

        const coords = [];
        let isValid = true;
        for (let char of word) {
            const normalized = normalizeString(char);
            const coord = getCoordCommon(normalized, layout);
            if (!coord) {
                isValid = false;
                break;
            }
            coords.push(coord);
        }
        if (!isValid) return;

        const wordVectors = [];
        for(let i=0; i<coords.length-1; i++) {
            wordVectors.push({
                dr: coords[i+1].r - coords[i].r,
                dc: coords[i+1].c - coords[i].c
            });
        }

        for(let pat of patterns) {
            let isMatch = true;
            for(let i=0; i<pat.length; i++) {
                if (pat[i].dr !== wordVectors[i].dr || pat[i].dc !== wordVectors[i].dc) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                matchedWords.push(word);
                break;
            }
        }
    });

    const uniqueMatches = [...new Set(matchedWords)];
    uniqueMatches.sort((a, b) => a.localeCompare(b, 'ja'));

    if (uniqueMatches.length === 0) {
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
        return;
    }

    const card = document.createElement('div');
    card.className = 'group-card match-perfect';
    const wordsHtml = uniqueMatches.map(w => `<span class="word-item">${w}</span>`).join("");
    card.innerHTML = `
        <span class="group-name">同じ形の単語 (${uniqueMatches.length}件)</span>
        <div class="word-list">${wordsHtml}</div>
    `;
    resultArea.appendChild(card);
}

function getCoordCommon(char, layout) {
    if(!layout) return null;
    for(let r=0; r<layout.length; r++) {
        for(let c=0; c<layout[r].length; c++) {
            if (layout[r][c] === char) return {r, c};
        }
    }
    return null;
}

// 辞書インデックス構築
function buildSearchIndex(key, words) {
    dictSets[key] = new Set(words);
    anagramMaps[key] = {};
    words.forEach(word => {
        const normalized = normalizeString(word);
        const sorted = normalized.split('').sort().join('');
        if (!anagramMaps[key][sorted]) anagramMaps[key][sorted] = [];
        anagramMaps[key][sorted].push(word);
    });
}
