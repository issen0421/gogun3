// ▼▼▼ ここにGASのウェブアプリURLを貼り付けてください ▼▼▼
const GAS_URL = "https://script.google.com/macros/s/AKfycbwjavHiBOUOYrA_WCq2lxuWtuOMpGWsc_D7MtMn0tgdVjTqE8m_7cbcguahrbkCEtd_Uw/exec"; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

let appData = [];

// 起動時にデータを取得
window.onload = function() {
    loadData();
};

// スプレッドシートからデータを取得する関数
async function loadData() {
    const countEl = document.getElementById('resultCount');
    const resultArea = document.getElementById('resultArea');
    
    countEl.innerText = "スプレッドシートからデータを読み込んでいます...";
    resultArea.innerHTML = '<div class="loading">読み込み中...</div>';

    try {
        const response = await fetch(GAS_URL);
        if (!response.ok) {
            throw new Error("ネットワーク応答エラー");
        }
        appData = await response.json();
        
        countEl.innerText = `読み込み完了（全${appData.length}件）。文字を入力してください。`;
        resultArea.innerHTML = ""; // ロード表示を消す
        search(); // すでに入力がある場合に備えて検索実行
    } catch (error) {
        console.error(error);
        countEl.innerText = "データの読み込みに失敗しました。";
        resultArea.innerHTML = `<div class="no-result" style="color:red">エラー: データが取得できませんでした。<br>URLが正しいか、GASがデプロイされているか確認してください。</div>`;
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
        
        // 入力された文字の中に、この文字と一致するものがあるか確認
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
        
        if (isMatch) {
            html += `<span class="highlight">${char}</span>`;
        } else {
            html += char;
        }
    }
    return html;
}

// 検索処理
function search() {
    const input = document.getElementById('searchInput').value.trim();
    const resultArea = document.getElementById('resultArea');
    const resultCount = document.getElementById('resultCount');
    const looseMode = document.getElementById('looseMode').checked;
    
    resultArea.innerHTML = "";

    // データがまだロードされていない場合は何もしない
    if (appData.length === 0) return;

    if (!input) {
        resultCount.innerText = `文字を入力してください（全${appData.length}語群）`;
        return;
    }

    const inputChars = input.split("");
    let perfectMatches = [];
    let nearMatches = [];

    appData.forEach(group => {
        // スプレッドシートのデータによってはwordsが文字列のままの場合があるので配列化を確認
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

    // ソート：単語数が少ない順
    perfectMatches.sort((a, b) => a.group.words.length - b.group.words.length);
    nearMatches.sort((a, b) => a.group.words.length - b.group.words.length);

    const allMatches = [...perfectMatches, ...nearMatches];

    allMatches.forEach(match => {
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

    if (allMatches.length > 0) {
        resultCount.innerHTML = `完全一致: <strong style="color:#27ae60">${perfectMatches.length}件</strong> / 惜しい: <strong style="color:#e67e22">${nearMatches.length}件</strong>`;
    } else {
        resultCount.innerText = "条件に合う語群が見つかりませんでした。";
        resultArea.innerHTML = `<div class="no-result">条件に合う語群が見つかりませんでした。</div>`;
    }
}
