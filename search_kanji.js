// ------------------------------------
// パーツ自動展開ルール
// キー: k(基本キーワード)にある文字
// 値: { k: [...], k2: [...], k3: [...] } の形式で、自動追加したい文字を指定
// ------------------------------------
const PART_EXPANSION = {
    "田": { 
        k: [], 
        k2: ["ヨ", "口", "ロ", "日", "十", "コ", "干", "土"], 
        k3: ["二", "ニ", "三", "ミ", "王", "ト", "士"] 
    },
    "言": { 
        k: [], 
        k2: ["口", "ロ"], 
        k3: [ "二", "三", "ニ", "ミ"] 
    },
    "音": { 
        k: [], 
        k2: ["立", "日"], 
        k3: ["口", "ロ"] 
    },
    "車": { 
        k: [], 
        k2: ["日", "旦", "亘", "申", "口", "ロ", "田", "由", "甲", "三", "二", "ニ"], 
        k3: ["ミ", "干", "土", "王", "ト", "士"] 
    },
    "門": { 
        k: [], 
        k2: [], 
        k3: ["日", "口", "ロ", "二", "三", "ニ", "ミ"] 
    },
    "口": { 
        k: ["ロ"], 
        k2: ["コ"], 
        k3: [] 
    },
    "日": { 
        k: [], 
        k2: ["口", "ロ", "コ", "ヨ", "ト"], 
        k3: ["ニ", "三", "二", "ミ"] 
    },
    "目": { 
        k: [], 
        k2: [], 
        k3: ["口", "ロ", "コ", "ヨ", "日", "ニ", "三", "二", "ミ"] 
    },
    "貝": { 
        k: ["目", "八", "ハ"], 
        k2: [], 
        k3: ["日", "口", "ロ", "コ", "ヨ", "日", "ニ", "三", "二", "ミ", "ト"] 
    },
    "糸": { 
        k: ["目", "八", "ハ"], 
        k2: [], 
        k3: ["日", "口", "ロ", "コ", "ヨ", "日", "ニ", "三", "二", "ミ", "ト"] 
    },
    "大": { 
        k: [], 
        k2: ["ナ", "人"], 
        k3: [] 
    },
    "エ": { 
        k: ["工"], 
        k2: [], 
        k3: [] 
    },
    "カ": { 
        k: ["力"], 
        k2: ["刀"], 
        k3: [] 
    },
    "タ": { 
        k: ["夕"], 
        k2: ["ク"], 
        k3: [] 
    },
    "ト": { 
        k: ["卜"], 
        k2: [], 
        k3: [] 
    },
    "ニ": { 
        k: ["二"], 
        k2: [], 
        k3: [] 
    },
    "ヌ": { 
        k: ["又"], 
        k2: ["フ"], 
        k3: [] 
    },
    "ハ": { 
        k: ["八"], 
        k2: [], 
        k3: [] 
    },
    "ミ": { 
        k: ["三"], 
        k2: [], 
        k3: [] 
    },
    "ロ": { 
        k: ["口", "コ"], 
        k2: [], 
        k3: [] 
    }
    // 必要に応じてルールを追加してください
};

function expandKanjiKeywords() {
    if (typeof KANJI_DATA === 'undefined') return;
    
    KANJI_DATA.forEach(item => {
        // エラー対策：初期化
        if (!item.k2) item.k2 = [];
        if (!item.k3) item.k3 = [];

        // k に登録されているパーツを見て、自動展開ルールを適用
        if (item.k && item.k.length > 0) {
            const originalKeywords = [...item.k];
            
            originalKeywords.forEach(key => {
                const rule = PART_EXPANSION[key];
                if (rule) {
                    
                    // パーツ追加・重複削除を行うヘルパー関数
                    const applyRule = (parts, targetField) => {
                        if (Array.isArray(parts)) {
                            parts.forEach(part => {
                                // 他のフィールドに同じパーツがあれば削除（自動登録優先）
                                const allFields = ['k', 'k2', 'k3'];
                                allFields.forEach(field => {
                                    if (field !== targetField) {
                                        if (item[field]) {
                                            const idx = item[field].indexOf(part);
                                            if (idx !== -1) {
                                                item[field].splice(idx, 1);
                                            }
                                        }
                                    }
                                });

                                // ターゲットに追加
                                if (!item[targetField].includes(part)) {
                                    item[targetField].push(part);
                                }
                            });
                        }
                    };

                    if (rule.k)  applyRule(rule.k, 'k');
                    if (rule.k2) applyRule(rule.k2, 'k2');
                    if (rule.k3) applyRule(rule.k3, 'k3');
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
    // 類似検索用：自分自身の全キーワードを取得
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
                // ★修正: 分母を自分自身のパーツ総数にする
                const ratio = commonCount / myTotal;
                
                return { 
                    data: otherItem, 
                    count: commonCount, 
                    total: myTotal, // 表示用も自分の総数
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
