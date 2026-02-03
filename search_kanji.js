// ------------------------------------
// パーツ自動展開ルール
// キー: パーツの文字
// 値: { same:[], lower1:[], lower2:[] }
//      same   : 同じ階層に追加 (k->k, k2->k2)
//      lower1 : 1つ下の階層に追加 (k->k2, k2->k3)
//      lower2 : 2つ下の階層に追加 (k->k3, k2->k3)
// ------------------------------------
const PART_EXPANSION = {
    "田": { 
        same: [], 
        lower1: ["ヨ", "口", "ロ", "日", "十", "コ", "干", "土"], 
        lower2: ["二", "ニ", "三", "ミ", "王", "ト", "士"] 
    },
    "言": { 
        same: ["口", "ロ"], 
        lower1: [], 
        lower2: [ "二", "三", "ニ", "ミ"] 
    },
    "音": { 
        same: ["立", "日"], 
        lower1: ["口", "ロ"], 
        lower2: [] 
    },
    "車": { 
        same: [], 
        lower1: ["日", "旦", "亘", "申", "口", "ロ", "田", "由", "甲", "三", "二", "ニ"], 
        lower2: ["ミ", "干", "土", "王", "ト", "士"] 
    },
    "門": { 
        same: [], 
        lower1: [], 
        lower2: ["日", "口", "ロ", "二", "三", "ニ", "ミ"] 
    },
    "口": { 
        same: ["ロ"], 
        lower1: ["コ"], 
        lower2: [] 
    },
    "日": { 
        same: [], 
        lower1: ["口", "ロ", "コ", "ヨ", "ト"], 
        lower2: ["ニ", "三", "二", "ミ"] 
    },
    "目": { 
        same: [], 
        lower1: [], 
        lower2: ["口", "ロ", "コ", "ヨ", "日", "ニ", "三", "二", "ミ"] 
    },
    "貝": { 
        same: ["目", "八", "ハ"], 
        lower1: [], 
        lower2: ["日", "口", "ロ", "コ", "ヨ", "日", "ニ", "三", "二", "ミ", "ト"] 
    },
    "糸": { 
        same: ["目", "八", "ハ"], 
        lower1: [], 
        lower2: ["日", "口", "ロ", "コ", "ヨ", "日", "ニ", "三", "二", "ミ", "ト"] 
    },
    "大": { 
        same: [], 
        lower1: ["ナ", "人"], 
        lower2: [] 
    },
    "エ": { 
        same: ["工"], 
        lower1: [], 
        lower2: [] 
    },
    "カ": { 
        same: ["力"], 
        lower1: ["刀"], 
        lower2: [] 
    },
    "タ": { 
        same: ["夕"], 
        lower1: ["ク"], 
        lower2: [] 
    },
    "ト": { 
        same: ["卜"], 
        lower1: [], 
        lower2: [] 
    },
    "ニ": { 
        same: ["二"], 
        lower1: [], 
        lower2: [] 
    },
    "ヌ": { 
        same: ["又"], 
        lower1: ["フ"], 
        lower2: [] 
    },
    "ハ": { 
        same: ["八"], 
        lower1: [], 
        lower2: [] 
    },
    "ミ": { 
        same: ["三"], 
        lower1: [], 
        lower2: [] 
    },
    "ロ": { 
        same: ["口", "コ"], 
        lower1: [], 
        lower2: [] 
    }
    // 必要に応じてルールを追加してください
};

function expandKanjiKeywords() {
    if (typeof KANJI_DATA === 'undefined') return;
    
    KANJI_DATA.forEach(item => {
        // 初期化（undefined対策）
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
                    // k3の場合はk3のまま

                    if (rule.lower1) {
                        rule.lower1.forEach(p => autoAdd[targetLower1].add(p));
                    }

                    // lower2: 2つ下の階層へ
                    let targetLower2 = 'k3';
                    // k -> k3, それ以外は k3 (これ以上下はないため)
                    
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
        // 自動登録されるパーツが、既に手動で(あるいは別の場所で)登録されていたら消す
        
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
