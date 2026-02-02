async function loadData() {
    const countEl = document.getElementById('resultCount');
    if (countEl) countEl.innerText = "データ読み込み中...";

    try {
        const response = await fetch(GAS_URL_WORD);
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
