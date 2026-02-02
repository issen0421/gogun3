async function loadRedoneData() {
    const countEl = document.getElementById('redoneCount');
    if (countEl) countEl.innerText = "データ読み込み中...";
    try {
        const response = await fetch(GAS_URL_REDONE);
        if (!response.ok) throw new Error("Network response was not ok");
        redoneData = await response.json();
        if (countEl) countEl.innerText = `読み込み完了（全${redoneData.length}件）。文字を入力してください。`;
    } catch (error) {
        console.error(error);
        if (countEl) countEl.innerText = "解き直しデータの読み込みに失敗しました。";
    }
}

function searchRedone() {
    const charFrom = document.getElementById('redoneFrom').value.trim();
    const charTo = document.getElementById('redoneTo').value.trim();
    const matchLastChar = document.getElementById('matchLastChar').checked; 
    const matchSameLength = document.getElementById('matchSameLength').checked;
    
    const resultArea = document.getElementById('redoneResultArea');
    const countEl = document.getElementById('redoneCount');
    
    resultArea.innerHTML = "";

    if (!charFrom || !charTo) {
        countEl.innerText = "変換前と変換後の文字を両方入力してください";
        return;
    }

    if (redoneData.length === 0) {
        countEl.innerText = "解き直しデータを読み込み中です...";
        return;
    }

    let foundPairs = [];

    redoneData.forEach(group => {
        const words = Array.isArray(group.words) ? group.words : [];
        if (words.length < 2) return;

        for (let i = 0; i < words.length; i++) {
            for (let j = 0; j < words.length; j++) {
                if (i === j) continue;

                const w1 = words[i];
                const w2 = words[j];

                if (matchSameLength && w1.length !== w2.length) continue;

                let isMatch = false;
                let idx1 = -1; 
                let idx2 = -1; 

                const len = Math.min(w1.length, w2.length);
                for (let k = 0; k < len; k++) {
                    if (w1[k] === charFrom && w2[k] === charTo) {
                        isMatch = true;
                        idx1 = k;
                        idx2 = k;
                        break; 
                    }
                }

                if (!isMatch && matchLastChar) {
                    if (w1.length > 0 && w2.length > 0) {
                        const last1 = w1.length - 1;
                        const last2 = w2.length - 1;
                        if (w1[last1] === charFrom && w2[last2] === charTo) {
                            isMatch = true;
                            idx1 = last1;
                            idx2 = last2;
                        }
                    }
                }

                if (isMatch) {
                    foundPairs.push({
                        groupName: group.groupName,
                        w1: w1,
                        w2: w2,
                        idx1: idx1,
                        idx2: idx2
                    });
                }
            }
        }
    });

    countEl.innerText = `ヒット: ${foundPairs.length}件`;

    if (foundPairs.length === 0) {
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
        return;
    }

    foundPairs.forEach(item => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        
        const highlightChar = (str, idx) => {
            if (idx < 0 || idx >= str.length) return str;
            return str.substring(0, idx) + 
                   `<span class="highlight">${str[idx]}</span>` + 
                   str.substring(idx + 1);
        };

        const w1Html = highlightChar(item.w1, item.idx1);
        const w2Html = highlightChar(item.w2, item.idx2);

        card.innerHTML = `
            <span class="group-name">${item.groupName}</span>
            <div class="word-list">
                <span class="word-item">${w1Html}</span>
                <span style="font-size:12px; align-self:center;">→</span>
                <span class="word-item">${w2Html}</span>
            </div>
        `;
        resultArea.appendChild(card);
    });
}
