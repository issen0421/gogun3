// アナグラム（抽出・並び替え）検索用スクリプト

function searchAnagram() {
    const rawFrom = document.getElementById('anagramFrom').value.trim();
    const rawTo = document.getElementById('anagramTo').value.trim();
    const resultArea = document.getElementById('anagramResultArea');
    const countEl = document.getElementById('anagramCount');
    
    // 辞書設定の取得
    const useStd = document.getElementById('useDictStandard_anagram').checked;
    const usePig = document.getElementById('useDictPig_anagram').checked;
    const useEng = document.getElementById('useDictEnglish_anagram').checked;
    const useIll1 = document.getElementById('useDictIllustLv1_anagram')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2_anagram')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3_anagram')?.checked;
    
    // 濁音等の区別設定
    const looseMode = document.getElementById('looseMode_anagram')?.checked;

    resultArea.innerHTML = "";

    if (!rawFrom || !rawTo) {
        countEl.innerText = "変換前と変換後の数字を入力してください";
        return;
    }

    // 入力値の解析 (例: "1234" -> [1,2,3,4] , "1 10 3" -> [1,10,3])
    const parseInput = (str) => {
        let s = str.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).replace(/[,，、]/g, ' ');
        // 空白が含まれている場合は空白区切り、そうでなければ1文字ずつ区切る
        if (/[\s]/.test(s)) {
            return s.split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        } else {
            return s.split('').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        }
    };

    const seqFrom = parseInput(rawFrom);
    const seqTo = parseInput(rawTo);

    if (seqFrom.length === 0 || seqTo.length === 0) {
        countEl.innerText = "数字が正しく読み取れませんでした";
        return;
    }

    // 変換後の数字が変換前の数字セットに存在するかチェック
    for (let num of seqTo) {
        if (!seqFrom.includes(num)) {
            countEl.innerText = `エラー: 変換後の数字「${num}」が変換前に存在しません`;
            return;
        }
    }

    // 辞書マージ
    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    if (useEng) targetWords = targetWords.concat(dictEnglish);
    if (useIll1) targetWords = targetWords.concat(dictIllustLv1);
    if (useIll2) targetWords = targetWords.concat(dictIllustLv2);
    if (useIll3) targetWords = targetWords.concat(dictIllustLv3);

    if (targetWords.length === 0) {
        countEl.innerText = "辞書が選択されていません";
        return;
    }

    // 重複を排除
    targetWords = [...new Set(targetWords)];

    const lenFrom = seqFrom.length;
    const lenTo = seqTo.length;

    // A: 変換前の長さに合う単語
    const wordsFrom = targetWords.filter(w => w.length === lenFrom);
    // B: 変換後の長さに合う単語
    const wordsTo = targetWords.filter(w => w.length === lenTo);

    // 検索高速化のため、変換後の単語群をSetに格納（正規化済み）
    const wordSetTo = new Set();
    wordsTo.forEach(w => {
        wordSetTo.add(normalizeForAnagram(w, looseMode));
    });

    let foundPairs = [];
    let seenPairs = new Set(); // 重複表示防止用

    countEl.innerText = "検索中...";

    // メインの検索ループ
    wordsFrom.forEach(wordA => {
        // 対象単語Aを正規化
        const normA = normalizeForAnagram(wordA, looseMode);
        
        let wordB_norm = "";
        let isValid = true;
        
        // 変換後の順番に従って、wordAから文字を抽出して連結する
        for (let num of seqTo) {
            let idx = seqFrom.indexOf(num); // 0-based のインデックス
            
            if (idx === -1 || idx >= normA.length) {
                isValid = false; 
                break;
            }
            wordB_norm += normA[idx];
        }

        if (!isValid) return;

        // 生成された文字列が、辞書内(B)に存在するか？
        if (wordSetTo.has(wordB_norm)) {
            // 表示用の元の表記(単語B)を探す
            let originalWordB = wordsTo.find(w => normalizeForAnagram(w, looseMode) === wordB_norm);
            if (!originalWordB) originalWordB = wordB_norm;

            // 自分自身への変換で、入力と出力が全く同じ文字列なら除外（例: いんせき -> いんせき）
            if (wordA === originalWordB) return;

            const pairKey = `${wordA}:${originalWordB}`;
            if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                foundPairs.push({
                    from: wordA,
                    to: originalWordB
                });
            }
        }
    });

    if (foundPairs.length === 0) {
        countEl.innerText = "条件に合うペアは見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
        return;
    }

    countEl.innerText = `${foundPairs.length}組のペアが見つかりました`;

    // 結果の描画
    foundPairs.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        
        // ユーザーが入力した数字列を表示に使用
        const formatSeq = (arr) => arr.join(arr.some(n => n >= 10) ? ' ' : '');
        const dispFrom = formatSeq(seqFrom);
        const dispTo = formatSeq(seqTo);

        card.innerHTML = `
            <div style="margin-bottom:5px; font-size:0.8em; color:#777;">
                配置: <span style="font-weight:bold; color:#e74c3c;">${dispFrom} → ${dispTo}</span>
            </div>
            <div class="word-list" style="align-items: center;">
                <span class="word-item" style="font-size:1.3em;">${pair.from}</span>
                <span style="margin: 0 10px; color:#aaa;">▶</span>
                <span class="word-item" style="font-size:1.3em;">${pair.to}</span>
            </div>
        `;
        resultArea.appendChild(card);
    });
}

// 共通の正規化関数を利用するラッパー関数
function normalizeForAnagram(str, isLoose) {
    if (typeof normalizeString === 'function' && typeof normalizeStrict === 'function') {
        return isLoose ? normalizeString(str) : normalizeStrict(str);
    }
    // フォールバック
    if (/^[a-zA-Z]+$/.test(str)) return str.toUpperCase();
    return str;
}
