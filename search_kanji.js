// 自動展開ルール PART_EXPANSION は kanji_parts.js で定義されています。

function expandKanjiKeywords() {
    if (typeof KANJI_DATA === 'undefined') return;
    if (typeof PART_EXPANSION === 'undefined') {
        console.warn("PART_EXPANSION is not defined. Skipping expansion.");
        return;
    }
    
    KANJI_DATA.forEach(item => {
        // 初期化
        if (!item.k2) item.k2 = [];
        if (!item.k3) item.k3 = [];

        // 自動追加するパーツを一時的に格納するセット
        const autoAdd = {
            k: new Set(),
            k2: new Set(),
            k3: new Set()
        };

        // --- 1. ルールに基づいて追加候補を計算 ---
        const processLevel = (currentKeywords, currentLevel) => {
            currentKeywords.forEach(key => {
                const rule = PART_EXPANSION[key];
                if (rule) {
                    // same: 同じ階層へ
                    if (rule.same) {
                        rule.same.forEach(p => autoAdd[currentLevel].add(p));
                    }

                    // lower1: 1つ下の階層へ
                    let targetLower1 = 'k3';
                    if (currentLevel === 'k') targetLower1 = 'k2';
                    else if (currentLevel === 'k2') targetLower1 = 'k3';
                    
                    if (rule.lower1) {
                        rule.lower1.forEach(p => autoAdd[targetLower1].add(p));
                    }

                    // lower2: 2つ下の階層へ (k -> k3)
                    let targetLower2 = 'k3';
                    
                    if (rule.lower2) {
                        rule.lower2.forEach(p => autoAdd[targetLower2].add(p));
                    }
                }
            });
        };

        // 各階層にある既存のキーワードを使って展開計算
        if (item.k) processLevel(item.k, 'k');
        if (item.k2) processLevel(item.k2, 'k2');
        if (item.k3) processLevel(item.k3, 'k3');

        // --- 2. 重複削除と統合 (自動登録優先) ---
        ['k', 'k2', 'k3'].forEach(targetField => {
            const partsToAdd = Array.from(autoAdd[targetField]);
            
            partsToAdd.forEach(part => {
                // 他のすべてのフィールドからこのパーツを削除
                ['k', 'k2', 'k3'].forEach(field => {
                    const idx = item[field].indexOf(part);
                    if (idx !== -1) {
                        item[field].splice(idx, 1);
                    }
                });

                // ターゲットフィールドに追加
                item[targetField].push(part);
            });
        });
    });
}

function searchKanji() {
    const rawInput = document.getElementById('kanjiInput').value.trim();
    const searchInput = rawInput; 

    const sortOption = document.getElementById('sortOption').value;
    const useK2 = document.getElementById('useK2').checked;
    const useK3 = document.getElementById('useK3').checked;
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
            // 検索対象キーワードの結合
            let keywords = [...(item.k || [])];
            if (useK2 && item.k2) keywords = keywords.concat(item.k2);
            if (useK3 && item.k3) keywords = keywords.concat(item.k3);

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
    // 類似検索用に全キーワードを統合
    let allMyKeywords = [...(item.k || [])];
    if(item.k2) allMyKeywords = allMyKeywords.concat(item.k2);
    if(item.k3) allMyKeywords = allMyKeywords.concat(item.k3);

    // ★分母にする「自分自身のパーツ総数」
    const myTotal = allMyKeywords.length;

    if (myTotal >= 1) { 
        const similarItems = KANJI_DATA.map(otherItem => {
            if (otherItem.c === item.c) return null;
            
            // 相手のキーワード
            let otherKeywords = [...(otherItem.k || [])];
            if(otherItem.k2) otherKeywords = otherKeywords.concat(otherItem.k2);
            if(otherItem.k3) otherKeywords = otherKeywords.concat(otherItem.k3);
            
            if (otherKeywords.length === 0) return null;

            // 共通パーツ抽出
            const commonKeywords = otherKeywords.filter(k => allMyKeywords.includes(k));
            const commonCount = commonKeywords.length;
            
            // 2つ以上共通していれば候補とする
            if (commonCount >= 2) {
                // 一致率（網羅率）
                const ratio = commonCount / myTotal;
                
                return { 
                    data: otherItem, 
                    count: commonCount, 
                    total: myTotal, 
                    ratio: ratio 
                };
            }
            return null;
        }).filter(val => val !== null);

        // ソート：一致率（ratio）が高い順
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
            similarHtml = `<div class="similar-section"><span class="similar-title">🔍 似ている漢字（共通数/自分のパーツ数）</span><div class="similar-list">${listHtml}</div></div>`;
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
    const modal = document.getElementById('detailModal');
    if (modal) modal.style.display = "none";
    document.getElementById('kanjiInput').value = tag;
    
    // タグ検索時はチェックボックスをONにする
    if(document.getElementById('useK2')) document.getElementById('useK2').checked = true;
    if(document.getElementById('useK3')) document.getElementById('useK3').checked = true;

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
