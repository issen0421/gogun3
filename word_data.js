// GAS URL
const GAS_URL_WORD = "https://script.google.com/macros/s/AKfycbwjavHiBOUOYrA_WCq2lxuWtuOMpGWsc_D7MtMn0tgdVjTqE8m_7cbcguahrbkCEtd_Uw/exec"; 
const GAS_URL_REDONE = "https://script.google.com/macros/s/AKfycbwXDCSMakZ9lNb23ZFSSZk2fEJjLorzfIM5leiDIg_z3zsgFVn3L_59GSGkiYifElMG/exec"; 

// 共有データ変数
let appData = [];        // 語群検索用
let redoneData = [];     // 解き直し検索用
let dictStandard = [];   // 日本語一般語.txt
let dictPig = [];        // 豚辞書.txt
let dictEnglish = [];    // 英語一般語.txt

// ★追加: イラスト辞書用変数
let dictIllustLv1 = [];
let dictIllustLv2 = [];
let dictIllustLv3 = [];

// モード管理
let currentMode = 'gojuon'; 
let activeLayout = []; 
let selectedCells = []; 
let customLayout = [];

// 初期化処理
window.onload = function() {
    loadData();             // 語群
    loadRedoneData();       // 解き直し
    loadAllDictionaries();  // テキスト辞書（ここですべて読み込まれます）
    
    // 漢字検索の初期表示
    if (typeof KANJI_DATA !== 'undefined' && typeof searchKanji === 'function') {
        if(typeof expandKanjiKeywords === 'function') expandKanjiKeywords();
        searchKanji();
    }
    
    // 五十音表の初期化
    if(typeof initGojuuonTable === 'function') {
        initGojuuonTable();
    }
};

// タブ切り替え関数
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // モードに応じたリセット処理
    if (tabName === 'gojuon') {
        currentMode = 'gojuon';
        if(typeof GOJUON_LAYOUT !== 'undefined') activeLayout = GOJUON_LAYOUT;
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

// -------------------------------------------------------
//  共通関数群
// -------------------------------------------------------

// セルクリック時の共通処理
function onCellClick(div, r, c, char) {
    if (selectedCells.length > 0 && selectedCells[selectedCells.length-1].char === char) {
        selectedCells.pop();
        div.classList.remove('selected');
    } else {
        selectedCells.push({char: char, r: r, c: c});
        div.classList.add('selected');
    }
    
    updateDisplay();
    drawLines();
    
    // モードに応じた検索を実行
    if (currentMode === 'gojuon' && typeof searchGojuon === 'function') {
        searchGojuon();
    } else if (currentMode === 'custom' && typeof searchCustom === 'function') {
        searchCustom();
    }
}

function resetSelection() {
    selectedCells = [];
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
    
    updateDisplay();
    drawLines();

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

function drawLines() {
    const canvasId = (currentMode === 'gojuon') ? 'lineCanvasGojuon' : 'lineCanvasCustom';
    const gridId = (currentMode === 'gojuon') ? 'gojuonGrid' : 'customGrid';
    drawLinesCommon(canvasId, gridId, selectedCells);
}

// ユーティリティ: ひらがな→カタカナ
function hiraToKata(str) {
    if(!str) return "";
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
}

// ユーティリティ: 正規化（濁点除去・大文字化）
function normalizeString(str) {
    if(!str) return "";
    let res = str.normalize('NFD').replace(/[\u3099\u309A]/g, "");
    res = res.toUpperCase();
    const smallToLarge = { 'っ':'つ', 'ゃ':'や', 'ゅ':'ゆ', 'ょ':'よ', 'ぁ':'あ', 'ぃ':'い', 'ぅ':'う', 'ぇ':'え', 'ぉ':'お' };
    return res.split('').map(char => smallToLarge[char] || char).join('');
}

// 共通描画ロジック: 線を描く
function drawLinesCommon(canvasId, gridId, selectedCells) {
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

    // 入力ベクトル
    const inputVectors = [];
    for(let i=0; i<selectedCells.length-1; i++) {
        inputVectors.push({
            dr: selectedCells[i+1].r - selectedCells[i].r,
            dc: selectedCells[i+1].c - selectedCells[i].c
        });
    }

    // パターン生成
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

// ... (前略)

// タブ切り替え関数
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // モードに応じたリセット処理
    if (tabName === 'gojuon') {
        currentMode = 'gojuon';
        if(typeof GOJUON_LAYOUT !== 'undefined') activeLayout = GOJUON_LAYOUT;
        if(typeof resetGojuon === 'function') resetGojuon();
    } else if (tabName === 'custom') {
        currentMode = 'custom';
        if (customLayout.length > 0) activeLayout = customLayout;
        if(typeof resetCustom === 'function') resetCustom();
    } else if (tabName === 'redone') {
        currentMode = 'redone';
    } else if (tabName === 'shift') {
        currentMode = 'shift';
    } else if (tabName === 'shift2') {
        // ★追加: 文字ずらし2
        currentMode = 'shift2';
    }
}

// ... (後略)
