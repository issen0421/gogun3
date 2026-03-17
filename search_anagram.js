// アナグラム（抽出・並び替え・分割）検索用スクリプト

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

    // 文字列を数字の配列にパースする関数
    const parseGroup = (str) => {
        let s = str.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).trim();
        // 空白が含まれている場合は空白区切り、そうでなければ1文字ずつ区切る
        if (/[\s]/.test(s)) {
            return s.split(/\s+/).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        } else {
            return s.split('').map(n => parseInt(n, 10)).filter(n => !isNaN(n));
        }
    };

    // 変換前の数字列
    const seqFrom = parseGroup(rawFrom);
    
    // 変換後の数字列（カンマや＋などで複数のグループに分割対応）
    // 例: "135, 24" -> "135", " 24"
    const toGroupsRaw = rawTo.replace(/[，、＋+／/]/g, ',').split(',');
    const seqToGroups = [];
    
    for (let g of toGroupsRaw) {
        if (!g.trim()) continue;
        const seq = parseGroup(g);
        if (seq.length > 0) {
            seqToGroups.push(seq);
        }
    }

    if (seqFrom.length === 0 || seqToGroups.length === 0) {
        countEl.innerText = "数字が正しく読み取れませんでした";
        return;
    }

    // 全ての変換後の数字が、変換前(seqFrom)に存在するかチェック
    for (let group of seqToGroups) {
        for (let num of group) {
            if (!seqFrom.includes(num)) {
                // ★エラーメッセージを親切に改良
                if (num >= 10 && seqFrom.length < 10) {
                    countEl.innerHTML = `<span style="color:#e74c3c; font-weight:bold;">エラー: 変換後の数字「${num}」が変換前に存在しません。</span><br><span style="font-size:12px;">※複数の単語に分ける場合は<b>「スペース」ではなく「カンマ( , )」</b>で区切ってください。</span>`;
                } else {
                    countEl.innerHTML = `<span style="color:#e74c3c;">エラー: 変換後の数字「${num}」が変換前に存在しません</span>`;
                }
                return;
            }
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

    // 検索高速化用マップ (Key: 正規化単語, Value: 元の単語の配列)
    // ※複数の元の単語が同じ正規化キーになる可能性があるため（例：かば、がば）
    const wordMapTo = new Map();
    targetWords.forEach(w => {
        const norm = normalizeForAnagram(w, looseMode);
        if (!wordMapTo.has(norm)) {
            wordMapTo.set(norm, w); // 代表として1つだけ保持する（処理速度優先）
        }
    });

    const lenFrom = seqFrom.length;
    // 変換前の長さに合う単語だけ抽出
    const wordsFrom = targetWords.filter(w => w.length === lenFrom);

    let foundPairs = [];
    let seenPairs = new Set(); // 重複表示防止用

    countEl.innerText = "検索中...";

    // メインの検索ループ
    wordsFrom.forEach(wordA => {
        const normA = normalizeForAnagram(wordA, looseMode);
        
        let targetWordsGroup = [];
        let isValid = true;
        
        // 各単語グループについて検証
        for (let seqTo of seqToGroups) {
            let wordB_norm = "";
            for (let num of seqTo) {
                // seqFrom の何番目にある数字かを取得
                // （例: seqFrom=[1,2,3,4,5], num=3 -> idx=2 -> normA[2]）
                let idx = seqFrom.indexOf(num); 
                if (idx === -1 || idx >= normA.length) {
                    isValid = false; 
                    break;
                }
                wordB_norm += normA[idx];
            }
            if (!isValid) break;

            // 抽出した文字列が辞書に存在するか？
            if (wordMapTo.has(wordB_norm)) {
                targetWordsGroup.push(wordMapTo.get(wordB_norm));
            } else {
                isValid = false;
                break;
            }
        }

        if (!isValid) return;

        // 自分自身への変換のみの場合は除外（例: いんせき -> いんせき）
        if (targetWordsGroup.length === 1 && wordA === targetWordsGroup[0]) return;

        // ペアを保存
        const pairKey = `${wordA}:${targetWordsGroup.join(',')}`;
        if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            foundPairs.push({
                from: wordA,
                toGroup: targetWordsGroup,
                seqToGroups: seqToGroups // 表示用
            });
        }
    });

    if (foundPairs.length === 0) {
        countEl.innerText = "条件に合うペアは見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
        return;
    }

    countEl.innerText = `${foundPairs.length}組のパターンが見つかりました`;

    // 数字配列を文字列化する関数（10以上が含まれていればスペース区切り）
    const formatSeq = (arr) => arr.join(arr.some(n => n >= 10) ? ' ' : '');

    // 結果の描画
    foundPairs.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        
        const dispFrom = formatSeq(seqFrom);
        // 複数グループがある場合は「+」で繋ぐ
        const dispTo = pair.seqToGroups.map(formatSeq).join(' + ');

        // 変換後の単語群のHTML
        const toWordsHtml = pair.toGroup
            .map(w => `<span class="word-item" style="font-size:1.3em;">${w}</span>`)
            .join('<span style="margin: 0 5px; color:#aaa; font-size:1.2em;">＋</span>');

        card.innerHTML = `
            <div style="margin-bottom:5px; font-size:0.8em; color:#777;">
                配置: <span style="font-weight:bold; color:#e74c3c;">${dispFrom} → ${dispTo}</span>
            </div>
            <div class="word-list" style="align-items: center; flex-wrap: wrap;">
                <span class="word-item" style="font-size:1.3em;">${pair.from}</span>
                <span style="margin: 0 10px; color:#aaa;">▶</span>
                ${toWordsHtml}
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
