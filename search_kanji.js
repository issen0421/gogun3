// ------------------------------------
// パーツ自動展開ルール
// キー: k(基本キーワード)にある文字
// 値: { k: [...], k2: [...], k3: [...] } の形式で、自動追加したい文字を指定
// ------------------------------------
const PART_EXPANSION = {
    "田": { 
        k: [], // k に追加したいものがあればここに書く
        k2: ["ヨ", "口", "ロ", "日", "十", "コ"], 
        k3: [] 
    },
    "言": { 
        k: [],
        k2: ["口", "ロ"], 
        k3: [] 
    },
    "音": { 
        k: [],
        k2: ["立", "日"], 
        k3: [] 
    },
    "車": { 
        k: [],
        k2: ["日", "旦", "亘", "申", "口", "ロ", "田", "由", "甲"], 
        k3: [] 
    },
    "門": { 
        k: [],
        k2: ["日", "口", "ロ"], 
        k3: [] 
    },
    "口": { 
        k: [],
        k2: ["ロ", "コ"], 
        k3: [] 
    },
    "日": { 
        k: [],
        k2: ["口", "ロ", "コ", "ヨ"], 
        k3: [] 
    },
    "目": { 
        k: [],
        k2: ["日", "口", "ロ", "コ", "ヨ"], 
        k3: [] 
    },
    "貝": { 
        k: [],
        k2: ["目", "日", "口", "ロ", "八", "ハ"], 
        k3: [] 
    }
    // ここに追加していく
};

function expandKanjiKeywords() {
    if (typeof KANJI_DATA === 'undefined') return;
    
    KANJI_DATA.forEach(item => {
        // エラー対策：初期化
        if (!item.k2) item.k2 = [];
        if (!item.k3) item.k3 = [];

        // k に登録されているパーツを見て、自動展開ルールを適用
        // ※ k配列自体が増える可能性があるため、コピーした配列でループを回す
        if (item.k && item.k.length > 0) {
            const originalKeywords = [...item.k];
            
            originalKeywords.forEach(key => {
                const rule = PART_EXPANSION[key];
                if (rule) {
                    // k への追加 (基本キーワード)
                    if (rule.k && Array.isArray(rule.k)) {
                        rule.k.forEach(expandedPart => {
                            if (!item.k.includes(expandedPart)) {
                                item.k.push(expandedPart);
                            }
                        });
                    }
                    // k2 への追加 (拡張キーワード1)
                    if (rule.k2 && Array.isArray(rule.k2)) {
                        rule.k2.forEach(expandedPart => {
                            if (!item.k2.includes(expandedPart)) {
                                item.k2.push(expandedPart);
                            }
                        });
                    }
                    // k3 への追加 (拡張キーワード2)
                    if (rule.k3 && Array.isArray(rule.k3)) {
                        rule.k3.forEach(expandedPart => {
                            if (!item.k3.includes(expandedPart)) {
                                item.k3.push(expandedPart);
                            }
                        });
                    }
                }
            });
        }
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

    if (allMyKeywords.length >= 1) { 
        const similarItems = KANJI_DATA.map(otherItem => {
            if (otherItem.c === item.c) return null;
            let otherKeywords = [...(otherItem.k || [])];
            if(otherItem.k2) otherKeywords = otherKeywords.concat(otherItem.k2);
            if(otherItem.k3) otherKeywords = otherKeywords.concat(otherItem.k3);
            if (otherKeywords.length === 0) return null;

            const commonKeywords = otherKeywords.filter(k => allMyKeywords.includes(k));
            const commonCount = commonKeywords.length;
            const totalKeywords = otherKeywords.length;

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
