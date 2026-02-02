// ▼▼▼ ここにGASのURLを貼り付けてください ▼▼▼
const GAS_URL = "https://script.google.com/macros/s/AKfycbwjavHiBOUOYrA_WCq2lxuWtuOMpGWsc_D7MtMn0tgdVjTqE8m_7cbcguahrbkCEtd_Uw/exec"; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

let appData = []; 
let dictStandard = []; // 日本語一般語.txt
let dictPig = [];      // 豚辞書.txt
let dictEnglish = [];  // 英語一般語.txt

// モード管理
let currentMode = 'gojuon'; // 'gojuon' or 'custom'
let activeLayout = []; 
let selectedCells = []; 
let customLayout = [];

window.onload = function() {
    loadData(); 
    loadAllDictionaries(); 
    
    if (typeof KANJI_DATA !== 'undefined') {
        searchKanji();
    }
    
    // 初期化：五十音
    activeLayout = GOJUON_LAYOUT;
    initGrid('gojuonGrid', 'lineCanvasGojuon', GOJUON_LAYOUT);
};

// タブ切り替え
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    if (tabName === 'gojuon') {
        currentMode = 'gojuon';
        activeLayout = GOJUON_LAYOUT;
        resetSelection();
    } else if (tabName === 'custom') {
        currentMode = 'custom';
        if (customLayout.length > 0) activeLayout = customLayout;
        resetSelection();
    }
}

// 共通ユーティリティ
function hiraToKata(str) {
    return str.replace(/[\u3041-\u3096]/g, m => String.fromCharCode(m.charCodeAt(0) + 0x60));
}
function normalizeString(str) {
    // アルファベットは大文字に統一
    let res = str.normalize('NFD').replace(/[\u3099\u309A]/g, "");
    res = res.toUpperCase();
    const smallToLarge = { 'っ':'つ', 'ゃ':'や', 'ゅ':'ゆ', 'ょ':'よ', 'ぁ':'あ', 'ぃ':'い', 'ぅ':'う', 'ぇ':'え', 'ぉ':'お' };
    return res.split('').map(char => smallToLarge[char] || char).join('');
}

// 五十音表レイアウト
const GOJUON_LAYOUT = [
    ['ん','わ','ら','や','ま','は','な','た','さ','か','あ'],
    ['','','り','','み','ひ','に','ち','し','き','い'],
    ['','','る','ゆ','む','ふ','ぬ','つ','す','く','う'],
    ['','','れ','','め','へ','ね','て','せ','け','え'],
    ['','を','ろ','よ','も','ほ','の','と','そ','こ','お']
];

// 辞書読み込み
async function loadAllDictionaries() {
    const statusEl = document.getElementById('txtStatus');
    statusEl.innerText = "辞書読み込み中...";
    const loadFile = async (filename) => {
        try {
            const res = await fetch(filename);
            if (!res.ok) return [];
            const text = await res.text();
            return text.split(/\r\n|\n/).map(w => w.trim()).filter(w => w);
        } catch (e) { return []; }
    };

    const [std, pig, eng] = await Promise.all([
        loadFile('日本語一般語.txt'),
        loadFile('豚辞書.txt'),
        loadFile('英語一般語.txt')
    ]);

    dictStandard = std;
    dictPig = pig;
    dictEnglish = eng;

    let msg = "";
    msg += `日:${std.length}語 `;
    msg += `豚:${pig.length}語 `;
    msg += `英:${eng.length}語`;
    statusEl.innerText = msg;
}

// グリッド生成（共通）
function initGrid(gridId, canvasId, layout) {
    const grid = document.getElementById(gridId);
    if(!grid) return;
    grid.innerHTML = "";
    const cols = layout[0].length;
    grid.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
    grid.style.gridTemplateRows = `repeat(${layout.length}, 40px)`;

    layout.forEach((row, rIndex) => {
        row.forEach((char, cIndex) => {
            const div = document.createElement('div');
            div.className = char ? 'cell' : 'cell empty';
            div.innerText = char;
            div.dataset.r = rIndex;
            div.dataset.c = cIndex;
            div.dataset.char = char;
            if (char) {
                div.onclick = () => onCellClick(div, rIndex, cIndex, char);
            }
            grid.appendChild(div);
        });
    });
    setTimeout(() => {
        const canvas = document.getElementById(canvasId);
        if(canvas) {
            canvas.width = grid.offsetWidth;
            canvas.height = grid.offsetHeight;
        }
    }, 100);
}

// カスタム表作成
function createCustomTable() {
    // アルファベットは大文字に統一して処理
    const text = document.getElementById('customInputText').value.replace(/\s/g, '').toUpperCase();
    const cols = parseInt(document.getElementById('customCols').value, 10);
    if(!text || cols < 1) return;

    customLayout = [];
    let currentRow = [];
    for (let i = 0; i < text.length; i++) {
        currentRow.push(text[i]);
        if (currentRow.length === cols) {
            customLayout.push(currentRow);
            currentRow = [];
        }
    }
    if (currentRow.length > 0) {
        while(currentRow.length < cols) currentRow.push('');
        customLayout.push(currentRow);
    }

    activeLayout = customLayout;
    resetSelection();
    initGrid('customGrid', 'lineCanvasCustom', customLayout);
}

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
    searchByShape();
}

function resetSelection() {
    selectedCells = [];
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('selected'));
    updateDisplay();
    drawLines();
    const resultId = (currentMode === 'gojuon') ? 'gojuonResultArea' : 'customResultArea';
    document.getElementById(resultId).innerHTML = "";
}

function updateDisplay() {
    const text = selectedCells.map(s => s.char).join(' → ');
    const displayId = (currentMode === 'gojuon') ? 'gojuonSelectDisplay' : 'customSelectDisplay';
    const displayEl = document.getElementById(displayId);
    if(displayEl) displayEl.innerText = "選択: " + (text || "なし");
}

function drawLines() {
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

// 形状検索
function searchByShape() {
    const isCustom = (currentMode === 'custom');
    const resultArea = document.getElementById(isCustom ? 'customResultArea' : 'gojuonResultArea');
    
    // IDの接尾辞を切り替え
    const suffix = isCustom ? '_custom' : '';
    const allowRotation = document.getElementById('allowRotation' + suffix).checked;
    const allowReflection = document.getElementById('allowReflection' + suffix).checked;
    const useStd = document.getElementById('useDictStandard' + suffix).checked;
    const usePig = document.getElementById('useDictPig' + suffix).checked;
    // カスタムの方には英語辞書チェックボックスがある前提
    const useEngEl = document.getElementById('useDictEnglish' + suffix);
    const useEng = useEngEl ? useEngEl.checked : false;

    resultArea.innerHTML = "";
    if (selectedCells.length < 2) return;

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    if (useEng) targetWords = targetWords.concat(dictEnglish);
    targetWords = [...new Set(targetWords)];

    if (targetWords.length === 0) return;

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
            // ★現在のレイアウトから座標を探す
            const coord = getCoord(normalized, activeLayout);
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

        const check = (vecs1, vecs2) => {
            if (vecs1.length !== vecs2.length) return false;
            for(let i=0; i<vecs1.length; i++) {
                if (vecs1[i].dr !== vecs2[i].dr || vecs1[i].dc !== vecs2[i].dc) return false;
            }
            return true;
        };

        for(let pat of patterns) {
            if (check(pat, wordVectors)) {
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

function getCoord(char, layout) {
    for(let r=0; r<layout.length; r++) {
        for(let c=0; c<layout[r].length; c++) {
            if (layout[r][c] === char) return {r, c};
        }
    }
    return null;
}

// ------------------------------------
// 漢字検索機能
// ------------------------------------
function searchKanji() {
    const rawInput = document.getElementById('kanjiInput').value.trim();
    const searchInput = rawInput;
    const sortOption = document.getElementById('sortOption').value;
    const checkbox = document.getElementById('useExtendedSearch');
    const useExtended = checkbox ? checkbox.checked : false;
    
    const resultArea = document.getElementById('kanjiResultArea');
    const countEl = document.getElementById('kanjiCount');

    resultArea.innerHTML = "";

    if (typeof KANJI_DATA === 'undefined') {
        resultArea.innerHTML = `<div class="no-result">漢字データ読み込みエラー</div>`;
        return;
    }

    let filteredData = KANJI_DATA;

    if (searchInput) {
        const inputChars = searchInput.split('');
        filteredData = KANJI_DATA.filter(item => {
            let keywords = [...(item.k || [])];
            if (useExtended) {
                if (item.k2) keywords = keywords.concat(item.k2);
                if (item.k3) keywords = keywords.concat(item.k3);
            }
            return inputChars.every(char => {
                const matchChar = item.c.includes(char) || item.c.includes(rawInput);
                const matchKeyword = keywords.some(k => k.includes(char));
                return matchChar || matchKeyword;
            });
        });
    }

    filteredData.sort((a, b) => {
        if (sortOption === "grade_asc") return a.g - b.g;
        if (sortOption === "grade_desc") return b.g - a.g;
        if (sortOption === "stroke_asc") return a.s - b.s;
        if (sortOption === "stroke_desc") return b.s - a.s;
        return 0;
    });

    countEl.innerText = `ヒット: ${filteredData.length}件`;

    filteredData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'kanji-card';
        card.onclick = () => openModal(item);
        const strokeDisplay = item.s > 0 ? item.s + '画' : '-';
        card.innerHTML = `
            <span class="kanji-char">${item.c}</span>
            <div class="kanji-info">
                <span>小${item.g}</span>
                <span>${strokeDisplay}</span>
            </div>
        `;
        resultArea.appendChild(card);
    });

    if (filteredData.length === 0) {
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
    }
}

// --- モーダル表示機能 ---
function openModal(item) {
    const modal = document.getElementById('detailModal');
    if (!modal) return;
    const body = document.getElementById('modalBody');
    const strokeDisplay = item.s > 0 ? item.s + '画' : '画数不明';
    
    const makeTags = (list, className) => {
        if (!list || list.length === 0) return '<span style="color:#ccc; font-size:12px;">なし</span>';
        return list.map(word => `<span class="${className} clickable-tag" onclick="searchByTag('${word}')">${word}</span>`).join('');
    };

    let similarHtml = '';
    if (item.k && item.k.length > 0) {
        const myKeywords = item.k;
        const similarItems = KANJI_DATA.map(otherItem => {
            if (otherItem.c === item.c) return null;
            if (!otherItem.k || otherItem.k.length === 0) return null;
            
            const commonKeywords = otherItem.k.filter(k => myKeywords.includes(k));
            const commonCount = commonKeywords.length;
            const totalKeywords = otherItem.k.length;

            if (commonCount >= 2) {
                const ratio = commonCount / totalKeywords;
                return { data: otherItem, count: commonCount, total: totalKeywords, ratio: ratio };
            }
            return null;
        }).filter(val => val !== null);

        similarItems.sort((a, b) => {
            if (b.ratio !== a.ratio) return b.ratio - a.ratio;
            return b.count - a.count;
        });

        if (similarItems.length > 0) {
            let listHtml = similarItems.map(sim => {
                return `<div class="similar-card" onclick="openModalByChar('${sim.data.c}')">
                        <span class="similar-char">${sim.data.c}</span>
                        <span class="similar-info">共通:${sim.count}/${sim.total}</span>
                    </div>`;
            }).join('');
            similarHtml = `<div class="similar-section"><span class="similar-title">🔍 似ている漢字（一致率順）</span><div class="similar-list">${listHtml}</div></div>`;
        }
    }

    body.innerHTML = `
        <div class="detail-header">
            <span class="detail-char">${item.c}</span>
            <div class="detail-meta">小学${item.g}年生 / ${strokeDisplay}</div>
        </div>
        <div class="keyword-section"><span class="keyword-title">基本キーワード (k)</span><div class="keyword-tags">${makeTags(item.k, 'k-tag')}</div></div>
        <div class="keyword-section"><span class="keyword-title">拡張キーワード1 (k2)</span><div class="keyword-tags">${makeTags(item.k2, 'k2-tag')}</div></div>
        <div class="keyword-section"><span class="keyword-title">拡張キーワード2 (k3)</span><div class="keyword-tags">${makeTags(item.k3, 'k3-tag')}</div></div>
        ${similarHtml}
    `;
    modal.style.display = "block";
}

function searchByTag(tag) {
    closeModal();
    document.getElementById('kanjiInput').value = tag;
    searchKanji();
}

function openModalByChar(char) {
    const item = KANJI_DATA.find(d => d.c === char);
    if (item) openModal(item);
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.style.display = "none";
}
window.onclick = function(event) {
    if (event.target == document.getElementById('detailModal')) closeModal();
}

// ------------------------------------
// 語群検索機能（GAS連動）
// ------------------------------------
async function loadData() {
    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.innerText = "データ読み込み中...";

    try {
        const response = await fetch(GAS_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        appData = await response.json();
        
        if (countEl) countEl.innerText = `読み込み完了（全${appData.length}件）。文字を入力してください。`;
        searchWords(); 
    } catch (error) {
        console.error(error);
        if (countEl) countEl.innerText = "データの読み込みに失敗しました。";
    }
}

function createHighlightedHtml(word, inputChars, looseMode) {
    let html = "";
    for (let char of word) {
        let isMatch = false;
        for (let inputChar of inputChars) {
            let c1 = char.toLowerCase();
            let c2 = inputChar.toLowerCase();
            if (looseMode) {
                c1 = normalizeString(c1);
                c2 = normalizeString(c2);
            }
            if (c1 === c2) { isMatch = true; break; }
        }
        if (isMatch) html += `<span class="highlight">${char}</span>`;
        else html += char;
    }
    return html;
}

function searchWords() {
    const inputEl = document.getElementById('searchInput');
    if (!inputEl) return;
    
    const input = inputEl.value.trim();
    const resultArea = document.getElementById('resultArea');
    const looseModeEl = document.getElementById('looseMode');
    const looseMode = looseModeEl ? looseModeEl.checked : false;
    
    resultArea.innerHTML = "";

    if (appData.length === 0) return;

    if (!input) {
        document.getElementById('resultCount').innerText = `文字を入力してください（全${appData.length}語群）`;
        return;
    }

    const inputChars = input.split("");
    let perfectMatches = [];
    let nearMatches = [];

    appData.forEach(group => {
        let wordsArray = Array.isArray(group.words) ? group.words : [];
        const combinedText = wordsArray.join("");
        
        const missingChars = inputChars.filter(originalChar => {
            let targetChar = originalChar.toLowerCase();
            let targetTextToSearch = combinedText.toLowerCase();
            if (looseMode) {
                targetChar = normalizeString(targetChar);
                targetTextToSearch = normalizeString(targetTextToSearch);
            }
            return !targetTextToSearch.includes(targetChar);
        });
        
        if (missingChars.length === 0) {
            perfectMatches.push({ group: group, missing: [] });
        } else if (missingChars.length === 1) {
            nearMatches.push({ group: group, missing: missingChars });
        }
    });

    perfectMatches.sort((a, b) => a.group.words.length - b.group.words.length);
    nearMatches.sort((a, b) => a.group.words.length - b.group.words.length);

    const totalCount = perfectMatches.length + nearMatches.length;
    if (totalCount > 0) {
        document.getElementById('resultCount').innerHTML = 
           `完全一致: <strong style="color:#27ae60">${perfectMatches.length}件</strong> / 惜しい: <strong style="color:#e67e22">${nearMatches.length}件</strong>`;
    } else {
        document.getElementById('resultCount').innerText = "条件に合う語群が見つかりませんでした。";
    }

    [...perfectMatches, ...nearMatches].forEach(match => {
        const group = match.group;
        const isPerfect = match.missing.length === 0;
        const card = document.createElement('div');
        card.className = `group-card ${isPerfect ? 'match-perfect' : 'match-near'}`;
        const badgeClass = isPerfect ? 'badge-perfect' : 'badge-near';
        const badgeText = isPerfect ? '揃いました！' : 'あと1文字！';
        
        const wordsHtml = group.words.map(w => {
            const highlighted = createHighlightedHtml(w, inputChars, looseMode);
            return `<span class="word-item">${highlighted}</span>`;
        }).join("");
        
        let html = `
            <span class="badge ${badgeClass}">${badgeText}</span>
            <span class="group-name">${group.groupName}</span>
            <div class="word-list">${wordsHtml}</div>
        `;
        
        if (!isPerfect) {
            html += `<div class="missing-info">※ 「${match.missing[0]}」が含まれていません</div>`;
        }
        card.innerHTML = html;
        resultArea.appendChild(card);
    });
    
    if (totalCount === 0) {
        resultArea.innerHTML = `<div class="no-result">条件に合う語群が見つかりませんでした。</div>`;
    }
}
