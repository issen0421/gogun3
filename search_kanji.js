function expandKanjiKeywords() {
    if (typeof KANJI_DATA === 'undefined') return;
    if (typeof PART_EXPANSION === 'undefined') {
        console.warn("PART_EXPANSION is not defined.");
        return;
    }
    
    KANJI_DATA.forEach(item => {
        if (!item.k2) item.k2 = [];
        if (!item.k3) item.k3 = [];

        // 自動追加用の一時セット
        const autoAdd = { k: new Set(), k2: new Set(), k3: new Set() };

        // 1. 展開ロジック (k -> k2 -> k3 の順に波及させる)
        const processLevel = (currentKeywords, currentLevel) => {
            currentKeywords.forEach(key => {
                const rule = PART_EXPANSION[key];
                if (rule) {
                    if (rule.same) rule.same.forEach(p => autoAdd[currentLevel].add(p));

                    let target1 = (currentLevel === 'k') ? 'k2' : 'k3';
                    if (rule.lower1) rule.lower1.forEach(p => autoAdd[target1].add(p));

                    // kのlower2はk3へ。k2のlower2はk3へ。
                    let target2 = 'k3';
                    if (rule.lower2) rule.lower2.forEach(p => autoAdd[target2].add(p));
                }
            });
        };

        if (item.k) processLevel(item.k, 'k');
        if (item.k2) processLevel(item.k2, 'k2');
        if (item.k3) processLevel(item.k3, 'k3');

        // 2. 統合と重複削除（自動登録優先＝手動で書いてあっても自動登録の場所に移動させるイメージ）
        // 実際には「自動登録されるべきパーツが、他のフィールドにあったら削除し、あるべき場所に追加する」
        
        ['k', 'k2', 'k3'].forEach(targetField => {
            const partsToAdd = Array.from(autoAdd[targetField]);
            partsToAdd.forEach(part => {
                // 他のすべてのフィールドからこのパーツを削除
                ['k', 'k2', 'k3'].forEach(field => {
                    const idx = item[field].indexOf(part);
                    if (idx !== -1) item[field].splice(idx, 1);
                });
                // ターゲットに追加
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

    if (!resultArea) return;
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

    if(countEl) countEl.innerText = `ヒット: ${filteredData.length}件`;

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

    // 類似漢字検索（自分自身を分母にする）
    let similarHtml = '';
    let allMyKeywords = [...(item.k || [])];
    if(item.k2) allMyKeywords = allMyKeywords.concat(item.k2);
    if(item.k3) allMyKeywords = allMyKeywords.concat(item.k3);

    const myTotal = allMyKeywords.length; // ★分母は自分のパーツ数

    if (myTotal >= 1) { 
        const similarItems = KANJI_DATA.map(otherItem => {
            if (otherItem.c === item.c) return null;
            let otherKeywords = [...(otherItem.k || [])];
            if(otherItem.k2) otherKeywords = otherKeywords.concat(otherItem.k2);
            if(otherItem.k3) otherKeywords = otherKeywords.concat(otherItem.k3);
            if (otherKeywords.length === 0) return null;

            const commonKeywords = otherKeywords.filter(k => allMyKeywords.includes(k));
            const commonCount = commonKeywords.length;
            
            if (commonCount >= 2) {
                // ★一致率 = 共通数 / 自分の総数
                const ratio = commonCount / myTotal;
                return { 
                    data: otherItem, 
                    count: commonCount, 
                    total: myTotal, // 表示用も自分
                    ratio: ratio 
                };
            }
            return null;
        }).filter(val => val !== null);

        similarItems.sort((a, b) => {
            if (b.ratio !== a.ratio) return b.ratio - a.ratio; // 一致率順
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
