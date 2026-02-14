// カスタム表2 (2つの表の対応検索) 用スクリプト

let custom2LayoutLeft = [];
let custom2LayoutRight = [];

function createCustom2Tables() {
    // ... (既存のコードと同じ)
    const textLeft = document.getElementById('custom2InputLeft').value.replace(/\s/g, '').toUpperCase();
    const textRight = document.getElementById('custom2InputRight').value.replace(/\s/g, '').toUpperCase();
    const cols = parseInt(document.getElementById('custom2Cols').value, 10);

    if (cols < 1) return;

    const buildLayout = (text) => {
        let layout = [];
        let currentRow = [];
        for (let i = 0; i < text.length; i++) {
            currentRow.push(text[i]);
            if (currentRow.length === cols) {
                layout.push(currentRow);
                currentRow = [];
            }
        }
        if (currentRow.length > 0) {
            while (currentRow.length < cols) currentRow.push('');
            layout.push(currentRow);
        }
        return layout;
    };

    custom2LayoutLeft = buildLayout(textLeft);
    custom2LayoutRight = buildLayout(textRight);

    const maxRows = Math.max(custom2LayoutLeft.length, custom2LayoutRight.length);
    const alignHeight = (layout) => {
        while (layout.length < maxRows) {
            layout.push(new Array(cols).fill(''));
        }
    };
    alignHeight(custom2LayoutLeft);
    alignHeight(custom2LayoutRight);

    renderCustom2Grids();
    
    document.getElementById('custom2ResultArea').innerHTML = "";
    document.getElementById('custom2Count').innerText = "表を作成しました。検索条件を設定して検索してください。";
}

function renderCustom2Grids() {
    renderSingleGrid('custom2GridLeft', custom2LayoutLeft);
    renderSingleGrid('custom2GridRight', custom2LayoutRight);
}

function renderSingleGrid(elementId, layout) {
    const grid = document.getElementById(elementId);
    if (!grid || layout.length === 0) return;

    grid.innerHTML = "";
    const cols = layout[0].length;
    grid.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    grid.style.gridTemplateRows = `repeat(${layout.length}, 30px)`;

    layout.forEach((row, r) => {
        row.forEach((char, c) => {
            const div = document.createElement('div');
            div.className = char ? 'cell' : 'cell empty';
            div.style.width = "30px";
            div.style.height = "30px";
            div.style.fontSize = "14px";
            div.innerText = char;
            div.dataset.r = r;
            div.dataset.c = c;
            div.onclick = () => highlightPair(r, c);
            grid.appendChild(div);
        });
    });
}

function highlightPair(r, c) {
    ['custom2GridLeft', 'custom2GridRight'].forEach(id => {
        const grid = document.getElementById(id);
        if(grid) {
            grid.querySelectorAll('.cell').forEach(el => el.classList.remove('selected'));
            const target = grid.querySelector(`div[data-r="${r}"][data-c="${c}"]`);
            if(target && !target.classList.contains('empty')) {
                target.classList.add('selected');
            }
        }
    });
}

// ----------------------------------------------------
//  検索ロジック
// ----------------------------------------------------
function searchCustom2() {
    const countEl = document.getElementById('custom2Count');
    const resultArea = document.getElementById('custom2ResultArea');
    resultArea.innerHTML = "";
    
    if (custom2LayoutLeft.length === 0 || custom2LayoutRight.length === 0) {
        countEl.innerText = "先に表を作成してください";
        return;
    }

    const searchLen = parseInt(document.getElementById('custom2SearchLen').value, 10);
    if (isNaN(searchLen) || searchLen < 1) {
        countEl.innerText = "単語の長さを指定してください";
        return;
    }

    const useStd = document.getElementById('useDictStandard_custom2').checked;
    const usePig = document.getElementById('useDictPig_custom2').checked;
    const useEng = document.getElementById('useDictEnglish_custom2').checked;
    const useIll1 = document.getElementById('useDictIllustLv1_custom2')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2_custom2')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3_custom2')?.checked;
    
    // ★追加: チェックボックス
    const looseMode = document.getElementById('looseMode_custom2')?.checked;

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    if (useEng) targetWords = targetWords.concat(dictEnglish);
    if (useIll1) targetWords = targetWords.concat(dictIllustLv1);
    if (useIll2) targetWords = targetWords.concat(dictIllustLv2);
    if (useIll3) targetWords = targetWords.concat(dictIllustLv3);

    if (targetWords.length === 0) {
        countEl.innerText = "辞書を選択してください";
        return;
    }

    // 辞書から「指定文字数」の単語だけ抽出
    const candidateWords = targetWords.filter(w => w.length === searchLen);
    
    // ★修正: Setに入れるキーを looseMode に応じて変える
    const wordSet = new Set(candidateWords.map(w => normalizeForCustom2(w, looseMode)));

    countEl.innerText = "検索中...";

    // 左表のインデックス化
    const leftMap = {};
    custom2LayoutLeft.forEach((row, r) => {
        row.forEach((char, c) => {
            if (!char) return;
            // 表の文字も正規化してキーにする
            const norm = normalizeForCustom2(char, looseMode);
            if (!leftMap[norm]) leftMap[norm] = [];
            leftMap[norm].push({r, c});
        });
    });

    let foundPairs = [];
    let foundKeys = new Set(); 

    // 左辞書をループ
    candidateWords.forEach(wordLeft => {
        const normLeft = normalizeForCustom2(wordLeft, looseMode);
        
        for (let char of normLeft) {
            if (!leftMap[char]) return; 
        }

        const findPaths = (idx, currentPath) => {
            if (idx >= normLeft.length) {
                checkRightTable(wordLeft, currentPath);
                return;
            }

            const char = normLeft[idx];
            const coords = leftMap[char];

            coords.forEach(coord => {
                if (currentPath.some(p => p.r === coord.r && p.c === coord.c)) return;
                findPaths(idx + 1, [...currentPath, coord]);
            });
        };

        findPaths(0, []);
    });

    function checkRightTable(realWordLeft, path) {
        let strRight = "";
        
        for (let p of path) {
            const charR = custom2LayoutRight[p.r] && custom2LayoutRight[p.r][p.c];
            if (!charR) return; 
            strRight += charR;
        }

        const normRight = normalizeForCustom2(strRight, looseMode);

        if (wordSet.has(normRight)) {
            let realWordRight = candidateWords.find(w => normalizeForCustom2(w, looseMode) === normRight);
            if (!realWordRight) realWordRight = strRight;

            const key = `${realWordLeft}:${realWordRight}`;
            if (!foundKeys.has(key)) {
                foundKeys.add(key);
                foundPairs.push({ left: realWordLeft, right: realWordRight });
            }
        }
    }

    if (foundPairs.length === 0) {
        countEl.innerText = "条件に合うペアは見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
        return;
    }

    countEl.innerText = `${foundPairs.length}組のペアが見つかりました`;

    foundPairs.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        card.innerHTML = `
            <div class="word-list" style="align-items: center; justify-content: center;">
                <span class="word-item" style="font-size:1.3em;">${pair.left}</span>
                <span style="margin: 0 15px; color:#aaa;">⇔</span>
                <span class="word-item" style="font-size:1.3em;">${pair.right}</span>
            </div>
        `;
        resultArea.appendChild(card);
    });
}

// ★修正: word_data.js の共通関数を使うか、ここで再定義
function normalizeForCustom2(str, isLoose) {
    // グローバル関数 normalizeString / normalizeStrict を使用
    return isLoose ? normalizeString(str) : normalizeStrict(str);
}
