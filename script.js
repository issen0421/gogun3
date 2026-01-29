// ▼▼▼ ここにGASのウェブアプリURLを貼り付けてください ▼▼▼
// --- 語群検索用 ---
// ▼▼▼ ここにGASのURLを貼り付けてください ▼▼▼
const GAS_URL = "https://script.google.com/macros/s/AKfycbwjavHiBOUOYrA_WCq2lxuWtuOMpGWsc_D7MtMn0tgdVjTqE8m_7cbcguahrbkCEtd_Uw/exec"; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

let appData = [];

// 起動時にデータを取得
window.onload = function() {
    loadData();
    loadData(); // 語群データ読み込み
    searchWords(); // 語群検索初期化
    searchKanji(); // 漢字検索初期化
};

// スプレッドシートからデータを取得する関数
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
    const resultArea = document.getElementById('resultArea');
    
    countEl.innerText = "スプレッドシートからデータを読み込んでいます...";
    resultArea.innerHTML = '<div class="loading">読み込み中...</div>';
    countEl.innerText = "データ読み込み中...";

try {
const response = await fetch(GAS_URL);
        if (!response.ok) {
            throw new Error("ネットワーク応答エラー");
        }
        if (!response.ok) throw new Error("Network response was not ok");
appData = await response.json();
        
countEl.innerText = `読み込み完了（全${appData.length}件）。文字を入力してください。`;
        resultArea.innerHTML = ""; // ロード表示を消す
        search(); // すでに入力がある場合に備えて検索実行
        searchWords(); 
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
@@ -44,51 +106,39 @@ function normalizeString(str) {
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
        if (isMatch) html += `<span class="highlight">${char}</span>`;
        else html += char;
}
return html;
}

// 検索処理
function search() {
function searchWords() {
const input = document.getElementById('searchInput').value.trim();
const resultArea = document.getElementById('resultArea');
    const resultCount = document.getElementById('resultCount');
const looseMode = document.getElementById('looseMode').checked;

resultArea.innerHTML = "";

    // データがまだロードされていない場合は何もしない
if (appData.length === 0) return;

if (!input) {
        resultCount.innerText = `文字を入力してください（全${appData.length}語群）`;
        document.getElementById('resultCount').innerText = `文字を入力してください（全${appData.length}語群）`;
return;
}

@@ -97,9 +147,7 @@ function search() {
let nearMatches = [];

appData.forEach(group => {
        // スプレッドシートのデータによってはwordsが文字列のままの場合があるので配列化を確認
let wordsArray = Array.isArray(group.words) ? group.words : [];
        
const combinedText = wordsArray.join("");

const missingChars = inputChars.filter(originalChar => {
@@ -121,13 +169,10 @@ function search() {
}
});

    // ソート：単語数が少ない順
perfectMatches.sort((a, b) => a.group.words.length - b.group.words.length);
nearMatches.sort((a, b) => a.group.words.length - b.group.words.length);

    const allMatches = [...perfectMatches, ...nearMatches];

    allMatches.forEach(match => {
    [...perfectMatches, ...nearMatches].forEach(match => {
const group = match.group;
const isPerfect = match.missing.length === 0;
const card = document.createElement('div');
@@ -152,11 +197,4 @@ function search() {
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
