// カスタム表2 (2つの表の対応検索) 用スクリプト

let custom2LayoutLeft = [];
let custom2LayoutRight = [];

function createCustom2Tables() {
    const textLeft = document.getElementById('custom2InputLeft').value.replace(/\s/g, '').toUpperCase();
    const textRight = document.getElementById('custom2InputRight').value.replace(/\s/g, '').toUpperCase();
    const cols = parseInt(document.getElementById('custom2Cols').value, 10);

    if (cols < 1) return;

    // 表データを生成する関数
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

    // 高さを合わせる（行数が違う場合、多い方に合わせる）
    const maxRows = Math.max(custom2LayoutLeft.length, custom2LayoutRight.length);
    const alignHeight = (layout) => {
        while (layout.length < maxRows) {
            layout.push(new Array(cols).fill(''));
        }
    };
    alignHeight(custom2LayoutLeft);
    alignHeight(custom2LayoutRight);

    renderCustom2Grids();
    
    // 結果エリアリセット
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
    grid.style.gridTemplateColumns = `repeat(${cols}, 30px)`; // 少し小さめに
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
            
            // クリック時に座標をハイライトする処理（視覚確認用）
            div.onclick = () => highlightPair(r, c);
            
            grid.appendChild(div);
        });
    });
}

function highlightPair(r, c) {
    // 左右両方のグリッドの (r,c) をハイライト
    ['custom2GridLeft', 'custom2GridRight'].forEach(id => {
        const grid = document.getElementById(id);
        if(grid) {
            // 一旦全解除
            grid.querySelectorAll('.cell').forEach(el => el.classList.remove('selected'));
            // 対象をハイライト
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
    
    // レイアウトチェック
    if (custom2LayoutLeft.length === 0 || custom2LayoutRight.length === 0) {
        countEl.innerText = "先に表を作成してください";
        return;
    }

    // 検索語長
    const searchLen = parseInt(document.getElementById('custom2SearchLen').value, 10);
    if (isNaN(searchLen) || searchLen < 1) {
        countEl.innerText = "単語の長さを指定してください";
        return;
    }

    // 辞書取得
    const useStd = document.getElementById('useDictStandard_custom2').checked;
    const usePig = document.getElementById('useDictPig_custom2').checked;
    const useEng = document.getElementById('useDictEnglish_custom2').checked;
    const useIll1 = document.getElementById('useDictIllustLv1_custom2')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2_custom2')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3_custom2')?.checked;

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
    // 高速照合用Set
    const wordSet = new Set(candidateWords.map(w => normalizeForCustom2(w)));

    countEl.innerText = "検索中...";

    // --- 検索実行 ---
    // 戦略:
    // 1. 左の表にある文字の座標マップを作る {'あ': [[r,c], [r,c]], ...}
    // 2. 辞書の単語(W_L)を一つずつ取り出し、左の表で構成可能かチェック
    // 3. 構成可能な座標の組み合わせを全て列挙
    // 4. その座標を右の表に当てはめて文字列(S_R)を作る
    // 5. S_R が辞書にあるかチェック

    // 左表のインデックス化
    const leftMap = {};
    custom2LayoutLeft.forEach((row, r) => {
        row.forEach((char, c) => {
            if (!char) return;
            const norm = normalizeForCustom2(char); // 正規化してキーにする
            if (!leftMap[norm]) leftMap[norm] = [];
            leftMap[norm].push({r, c});
        });
    });

    let foundPairs = [];
    let foundKeys = new Set(); // 重複排除用 "WORDL:WORDR"

    // 左辞書をループ
    candidateWords.forEach(wordLeft => {
        const normLeft = normalizeForCustom2(wordLeft);
        
        // そもそも左表に文字が足りているか簡易チェック
        for (let char of normLeft) {
            if (!leftMap[char]) return; // この文字が表にないならスキップ
        }

        // 組み合わせ探索 (バックトラック)
        // path: [{r,c}, {r,c}, ...]
        const findPaths = (idx, currentPath) => {
            if (idx >= normLeft.length) {
                // 単語構成完了 -> 右表チェック
                checkRightTable(wordLeft, currentPath);
                return;
            }

            const char = normLeft[idx];
            const coords = leftMap[char];

            coords.forEach(coord => {
                // 同じ座標を重複使用しない（通常パズルルールの適用）
                if (currentPath.some(p => p.r === coord.r && p.c === coord.c)) return;
                
                // 次へ
                findPaths(idx + 1, [...currentPath, coord]);
            });
        };

        findPaths(0, []);
    });

    // 右表をチェックしてペア登録する内部関数
    function checkRightTable(realWordLeft, path) {
        let strRight = "";
        
        // パスの座標に対応する右表の文字を取得
        for (let p of path) {
            const charR = custom2LayoutRight[p.r] && custom2LayoutRight[p.r][p.c];
            if (!charR) return; // 空マスや範囲外なら無効
            strRight += charR;
        }

        const normRight = normalizeForCustom2(strRight);

        // 右の文字列が辞書にあるか？
        if (wordSet.has(normRight)) {
            // 表示用の元の単語を探す（簡易的に候補から検索）
            let realWordRight = candidateWords.find(w => normalizeForCustom2(w) === normRight);
            if (!realWordRight) realWordRight = strRight;

            // ペア登録
            const key = `${realWordLeft}:${realWordRight}`;
            if (!foundKeys.has(key)) {
                foundKeys.add(key);
                foundPairs.push({ left: realWordLeft, right: realWordRight });
            }
        }
    }

    // 結果表示
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

function normalizeForCustom2(str) {
    if (/^[a-zA-Z]+$/.test(str)) {
        return str.toUpperCase();
    }
    let res = "";
    const seq = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
    for (let char of str) {
        if (seq.includes(char)) {
            res += char;
            continue;
        }
        let normalizedChar = char;
        if (/[\u30a1-\u30f6]/.test(char)) {
            normalizedChar = String.fromCharCode(char.charCodeAt(0) - 0x60);
        }
        const map = {
            'が':'か', 'ぎ':'き', 'ぐ':'く', 'げ':'け', 'ご':'こ',
            'ざ':'さ', 'じ':'し', 'ず':'す', 'ぜ':'せ', 'ぞ':'そ',
            'だ':'た', 'ぢ':'ち', 'づ':'つ', 'で':'て', 'ど':'と',
            'ば':'は', 'び':'ひ', 'ぶ':'ふ', 'べ':'へ', 'ぼ':'ほ',
            'ぱ':'は', 'ぴ':'ひ', 'ぷ':'ふ', 'ぺ':'へ', 'ぽ':'ほ',
            'ぁ':'あ', 'ぃ':'い', 'ぅ':'う', 'ぇ':'え', 'ぉ':'お',
            'っ':'つ', 'ゃ':'や', 'ゅ':'ゆ', 'ょ':'よ', 'ゎ':'わ',
            'ゔ':'う', 'ゐ':'い', 'ゑ':'え'
        };
        if (map[normalizedChar]) normalizedChar = map[normalizedChar];
        res += normalizedChar;
    }
    return res;
}
