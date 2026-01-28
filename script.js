// --- 語群検索用 ---
// ▼▼▼ ここにGASのURLを貼り付けてください ▼▼▼
const GAS_URL = "https://script.google.com/macros/s/AKfycbwjavHiBOUOYrA_WCq2lxuWtuOMpGWsc_D7MtMn0tgdVjTqE8m_7cbcguahrbkCEtd_Uw/exec"; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

let appData = [];

window.onload = function() {
    loadData(); // 語群データ読み込み
    searchWords(); // 語群検索初期化
    searchKanji(); // 漢字検索初期化
};

// タブ切り替え
function switchTab(tabName) {
    // ボタンのスタイル切り替え
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');

    // コンテンツの表示切り替え
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ------------------------------------
// 漢字検索機能
// ------------------------------------
function searchKanji() {
    const input = document.getElementById('kanjiInput').value.trim();
    const sortOption = document.getElementById('sortOption').value;
    const resultArea = document.getElementById('kanjiResultArea');
    const countEl = document.getElementById('kanjiCount');

    resultArea.innerHTML = "";

    // データフィルタリング
    let filteredData = KANJI_DATA;

    if (input) {
        // 入力された文字が含まれる、または部首が一致するものを検索
        filteredData = KANJI_DATA.filter(item => {
            return item.c.includes(input) || (item.r && item.r.includes(input));
        });
    }

    // ソート処理
    filteredData.sort((a, b) => {
        if (sortOption === "grade_asc") return a.g - b.g;
        if (sortOption === "grade_desc") return b.g - a.g;
        if (sortOption === "stroke_asc") return a.s - b.s;
        if (sortOption === "stroke_desc") return b.s - a.s;
        return 0;
    });

    // 結果表示
    countEl.innerText = `ヒット: ${filteredData.length}件`;

    filteredData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'kanji-card';
        // 画数や部首が0の場合は「-」などを表示
        const strokeDisplay = item.s > 0 ? item.s + '画' : '-';
        const radicalDisplay = item.r ? item.r : '-';
        
        card.innerHTML = `
            <span class="kanji-char">${item.c}</span>
            <div class="kanji-info">
                <span>小${item.g}</span>
                <span>${strokeDisplay}</span>
                <span>${radicalDisplay}</span>
            </div>
        `;
        resultArea.appendChild(card);
    });

    if (filteredData.length === 0) {
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
    }
}

// ------------------------------------
// 語群検索機能（既存のものをそのまま）
// ------------------------------------
async function loadData() {
    const countEl = document.getElementById('resultCount');
    countEl.innerText = "データ読み込み中...";

    try {
        const response = await fetch(GAS_URL);
        if (!response.ok) throw new Error("Network response was not ok");
        appData = await response.json();
        countEl.innerText = `読み込み完了（全${appData.length}件）。文字を入力してください。`;
        searchWords(); 
    } catch (error) {
        console.error(error);
        countEl.innerText = "データの読み込みに失敗しました。";
    }
}

function normalizeString(str) {
    let res = str.normalize('NFD').replace(/[\u3099\u309A]/g, "");
    const smallToLarge = {
        'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
        'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お'
    };
    return res.split('').map(char => smallToLarge[char] || char).join('');
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
            if (c1 === c2) {
                isMatch = true;
                break;
            }
        }
        if (isMatch) html += `<span class="highlight">${char}</span>`;
        else html += char;
    }
    return html;
}

function searchWords() {
    const input = document.getElementById('searchInput').value.trim();
    const resultArea = document.getElementById('resultArea');
    const looseMode = document.getElementById('looseMode').checked;
    
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
}
