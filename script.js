// ▼▼▼ ここにGASのURLを貼り付けてください ▼▼▼
const GAS_URL = "https://script.google.com/macros/s/AKfycbwjavHiBOUOYrA_WCq2lxuWtuOMpGWsc_D7MtMn0tgdVjTqE8m_7cbcguahrbkCEtd_Uw/exec"; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

let appData = []; // 語群データ（GASから取得）

window.onload = function() {
    loadData(); // 語群データ読み込み開始
    
    // 漢字データが読み込まれているか確認して初期検索
    if (typeof KANJI_DATA !== 'undefined') {
        searchKanji();
    }
};

// タブ切り替え
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ------------------------------------
// ユーティリティ: ひらがな→カタカナ変換（現在は使用していません）
// ------------------------------------
function hiraToKata(str) {
    return str.replace(/[\u3041-\u3096]/g, function(match) {
        var chr = match.charCodeAt(0) + 0x60;
        return String.fromCharCode(chr);
    });
}

// ------------------------------------
// 漢字検索機能
// ------------------------------------
function searchKanji() {
    // 画面の入力値は書き換えず、取得だけする
    const rawInput = document.getElementById('kanjiInput').value.trim();
    
    // 【修正箇所】内部でカタカナに変換する処理を削除し、入力値をそのまま検索に使用します
    const searchInput = rawInput;

    const sortOption = document.getElementById('sortOption').value;
    const checkbox = document.getElementById('useExtendedSearch');
    const useExtended = checkbox ? checkbox.checked : false;
    
    const resultArea = document.getElementById('kanjiResultArea');
    const countEl = document.getElementById('kanjiCount');

    resultArea.innerHTML = "";

    // KANJI_DATAが読み込まれているか確認
    if (typeof KANJI_DATA === 'undefined') {
        resultArea.innerHTML = `<div class="no-result">漢字データ読み込みエラー<br>kanji_data.jsが見つかりません</div>`;
        return;
    }

    let filteredData = KANJI_DATA;

    if (searchInput) {
        // 1文字ずつに分解してAND検索（すべて含むか）を行う
        const inputChars = searchInput.split('');

        filteredData = KANJI_DATA.filter(item => {
            // 検索対象となるキーワードリストをまとめる
            let keywords = [...(item.k || [])];
            if (useExtended) {
                if (item.k2) keywords = keywords.concat(item.k2);
                if (item.k3) keywords = keywords.concat(item.k3);
            }

            // 入力された「すべての文字」について、条件を満たすかチェック
            return inputChars.every(char => {
                // 1. 漢字そのものに含まれるか
                const matchChar = item.c.includes(char) || item.c.includes(rawInput);
                
                // 2. キーワードのいずれかに含まれるか
                const matchKeyword = keywords.some(k => k.includes(char));
                
                return matchChar || matchKeyword;
            });
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
        return list.map(word => `<span class="${className}">${word}</span>`).join('');
    };

    body.innerHTML = `
        <div class="detail-header">
            <span class="detail-char">${item.c}</span>
            <div class="detail-meta">小学${item.g}年生 / ${strokeDisplay}</div>
        </div>
        <div class="keyword-section">
            <span class="keyword-title">基本キーワード (k)</span>
            <div class="keyword-tags">${makeTags(item.k, 'k-tag')}</div>
        </div>
        <div class="keyword-section">
            <span class="keyword-title">拡張キーワード1 (k2)</span>
            <div class="keyword-tags">${makeTags(item.k2, 'k2-tag')}</div>
        </div>
        <div class="keyword-section">
            <span class="keyword-title">拡張キーワード2 (k3)</span>
            <div class="keyword-tags">${makeTags(item.k3, 'k3-tag')}</div>
        </div>
    `;

    modal.style.display = "block";
}

function closeModal() {
    const modal = document.getElementById('detailModal');
    if (modal) modal.style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('detailModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
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

// 文字の正規化（濁点・半濁点・拗音の除去）
function normalizeString(str) {
    let res = str.normalize('NFD').replace(/[\u3099\u309A]/g, "");
    const smallToLarge = {
        'っ': 'つ', 'ゃ': 'や', 'ゅ': 'ゆ', 'ょ': 'よ',
        'ぁ': 'あ', 'ぃ': 'い', 'ぅ': 'う', 'ぇ': 'え', 'ぉ': 'お'
    };
    return res.split('').map(char => smallToLarge[char] || char).join('');
}

// ハイライト用のHTML生成関数
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
