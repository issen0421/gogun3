// GAS URL
const GAS_URL_WORD = "https://script.google.com/macros/s/AKfycbwjavHiBOUOYrA_WCq2lxuWtuOMpGWsc_D7MtMn0tgdVjTqE8m_7cbcguahrbkCEtd_Uw/exec"; 
const GAS_URL_REDONE = "https://script.google.com/macros/s/AKfycbwXDCSMakZ9lNb23ZFSSZk2fEJjLorzfIM5leiDIg_z3zsgFVn3L_59GSGkiYifElMG/exec"; 

// 共有データ変数
let appData = [];        
let redoneData = [];     
let dictStandard = [];   
let dictPig = [];        
let dictEnglish = [];    
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
    loadData();             
    loadRedoneData();       
    loadAllDictionaries();  
    
    if (typeof KANJI_DATA !== 'undefined' && typeof searchKanji === 'function') {
        if(typeof expandKanjiKeywords === 'function') expandKanjiKeywords();
        searchKanji();
    }
    
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
        currentMode = 'shift2';
    } else if (tabName === 'custom2') {
        currentMode = 'custom2';
    } else if (tabName === 'flick') {
        currentMode = 'flick';
    }
}

// -------------------------------------------------------
//  共通関数群
// -------------------------------------------------------

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

// ------------------------------------
//  文字列正規化ロジック (Strict / Loose)
// ------------------------------------

// ユーティリティ: ひらがな→カタカナ
function hiraToKata(str) {
    if(!str) return "";
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
}

// ★修正: 緩い正規化（濁点除去・小文字大文字化・カタカナ→ひらがな）
function normalizeString(str) {
    if(!str) return "";
    // NFD分解で濁点分離 -> 除去
    let res = str.normalize('NFD').replace(/[\u3099\u309A]/g, "");
    // 英字は大文字
    res = res.toUpperCase();
    // 小文字->大文字 (日本語)
    const smallToLarge = { 'っ':'つ', 'ゃ':'や', 'ゅ':'ゆ', 'ょ':'よ', 'ぁ':'あ', 'ぃ':'い', 'ぅ':'う', 'ぇ':'え', 'ぉ':'お', 'ゎ':'わ' };
    
    // カタカナ->ひらがな変換してから処理
    res = res.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
    
    return res.split('').map(char => smallToLarge[char] || char).join('');
}

// ★追加: 厳密正規化（カタカナ→ひらがな、英字大文字化のみ。濁点・小文字は維持）
function normalizeStrict(str) {
    if(!str) return "";
    let res = str.toUpperCase();
    // カタカナ->ひらがな
    res = res.replace(/[\u30a1-\u30f6]/g, m => String.fromCharCode(m.charCodeAt(0) - 0x60));
    return res;
}

// ★共通検索ロジック: 形状検索 (更新: looseMode対応)
// selectedCells: 選択されたマスのリスト
// targetWords: 検索対象の単語リスト
// layout: グリッドレイアウト
// resultAreaId: 結果表示エリアID
// looseMode: (追加) trueなら濁点無視、falseなら厳密一致
function searchByShapeCommon(selectedCells, targetWords, layout, resultAreaId, looseMode = false) {
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
            // ★変更: モードに応じた正規化をしてから、グリッド上の文字と比較
            // グリッド(layout)上の文字は通常「清音」なので、
            // 辞書の単語(word)も正規化してから探す必要がある。
            // looseMode=false(厳密)の場合、辞書に「が」があってグリッドに「か」しかない場合、
            // normalizeStrict("が")="が" となり、getCoordCommonでヒットしなくなる（意図通り）
            const normChar = looseMode ? normalizeString(char) : normalizeStrict(char);
            
            // getCoordCommonは layout を走査する際、layout内の文字も正規化すべきか？
            // 通常、五十音表などは「清音」で書かれているため、normalizeStrictで比較すればOK
            const coord = getCoordCommon(normChar, layout);
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

// 指定文字がレイアウトのどこにあるか探す
function getCoordCommon(char, layout) {
    if(!layout) return null;
    for(let r=0; r<layout.length; r++) {
        for(let c=0; c<layout[r].length; c++) {
            // layout内の文字も、基本的には入力と同じレベルで比較したい
            // layoutに「が」と書いてあれば「が」でヒットさせたい
            // しかし通常は「か」しか書いてない。
            // normalizeStrict同士の比較でOK
            const layoutChar = layout[r][c];
            if(!layoutChar) continue;
            
            // レイアウト側の文字も正規化（カタカナ->ひらがな等）して比較
            if (normalizeStrict(layoutChar) === char) return {r, c};
        }
    }
    return null;
}
