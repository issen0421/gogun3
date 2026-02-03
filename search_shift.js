// 定義された順番
const HIRAGANA_SEQUENCE = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const ALPHABET_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 検索を高速化するためのインデックス（通常モード用）
let shiftIndexes = {
    std: { set: null, anagram: null },
    pig: { set: null, anagram: null },
    eng: { set: null, anagram: null }
};
let isShiftIndexReady = false;

// 辞書配列から検索用インデックスを作る関数
function prepareShiftIndexes() {
    if (isShiftIndexReady) return;
    if ((!dictStandard || dictStandard.length === 0) && (!dictEnglish || dictEnglish.length === 0)) return;

    const buildIndex = (wordList) => {
        const set = new Set();
        const anagramMap = {};
        
        wordList.forEach(rawWord => {
            let word = rawWord;
            if (/^[a-zA-Z]+$/.test(rawWord)) {
                word = rawWord.toUpperCase();
            } else {
                word = normalizeToSequence(rawWord, HIRAGANA_SEQUENCE);
            }
            if(!word) return;

            set.add(word);
            
            const sorted = word.split('').sort().join('');
            if (!anagramMap[sorted]) anagramMap[sorted] = [];
            anagramMap[sorted].push(word);
        });
        return { set: set, anagram: anagramMap };
    };

    if (dictStandard) shiftIndexes.std = buildIndex(dictStandard);
    if (dictPig)      shiftIndexes.pig = buildIndex(dictPig);
    if (dictEnglish)  shiftIndexes.eng = buildIndex(dictEnglish);

    isShiftIndexReady = true;
}

function searchShift() {
    prepareShiftIndexes();

    const rawInput = document.getElementById('shiftInput').value.trim();
    const resultArea = document.getElementById('shiftResultArea');
    const countEl = document.getElementById('shiftCount');
    
    const useStd = document.getElementById('useDictStandard_shift').checked;
    const usePig = document.getElementById('useDictPig_shift').checked;
    const useEng = document.getElementById('useDictEnglish_shift').checked;
    const allowAnagram = document.getElementById('allowAnagram').checked;
    const allowPlusMinus = document.getElementById('allowPlusMinus').checked;

    resultArea.innerHTML = "";

    if (!rawInput) {
        countEl.innerText = "文字を入力してください";
        return;
    }

    if (!isShiftIndexReady) {
        countEl.innerText = "辞書データを準備中... もう一度入力してください";
        return;
    }

    // 検索対象辞書のキー
    let targetDictKeys = [];
    if (useStd) targetDictKeys.push('std');
    if (usePig) targetDictKeys.push('pig');
    if (useEng) targetDictKeys.push('eng');

    if (targetDictKeys.length === 0) {
        countEl.innerText = "辞書が選択されていません";
        return;
    }

    // 入力文字の判定と正規化
    let isAlphabet = /^[a-zA-Z]+$/.test(rawInput);
    let sequence = "";
    let normalizedInput = "";

    if (isAlphabet) {
        sequence = ALPHABET_SEQUENCE;
        normalizedInput = rawInput.toUpperCase();
    } else {
        sequence = HIRAGANA_SEQUENCE;
        normalizedInput = normalizeToSequence(rawInput, sequence);
    }

    // 文字チェック
    for (let char of normalizedInput) {
        if (!sequence.includes(char)) {
            countEl.innerText = `対応していない文字が含まれています: ${char}`;
            return;
        }
    }

    let results = [];
    let foundWordSet = new Set(); // 重複排除用

    // ============================================================
    //  モードA: ±同一視 (PlusMinus) が ON の場合
    //  「距離がNなら、+方向でも-方向でもOK」な単語を探す
    // ============================================================
    if (allowPlusMinus) {
        // 全単語スキャン
        let allWords = [];
        targetDictKeys.forEach(key => {
            if (key === 'std') allWords = allWords.concat(dictStandard);
            if (key === 'pig') allWords = allWords.concat(dictPig);
            if (key === 'eng') allWords = allWords.concat(dictEnglish);
        });
        allWords = [...new Set(allWords)];

        allWords.forEach(word => {
            if (word.length !== normalizedInput.length) return;

            // 単語の正規化
            let normalizedWord = "";
            if (isAlphabet) {
                if (!/^[a-zA-Z]+$/.test(word)) return;
                normalizedWord = word.toUpperCase();
            } else {
                if (/^[a-zA-Z]+$/.test(word)) return;
                normalizedWord = normalizeToSequence(word, sequence);
            }

            // 判定と詳細取得
            const checkResult = checkDistanceMatch(normalizedInput, normalizedWord, sequence, allowAnagram);
            
            if (checkResult.isMatch) {
                let diffStr = checkResult.diffString;
                let subText = `(元: ${word})`;

                // アナグラムの場合は (並び替え) を付記
                if (allowAnagram) {
                    diffStr += ' <span style="font-size:0.8em; color:#555; margin-left:5px;">(並び替え)</span>';
                }

                results.push({
                    headerMain: `<span style="color:#e74c3c; font-size:1.1em; letter-spacing:1px;">${diffStr}</span>`,
                    headerSub: subText,
                    word: word,
                    sortKey: checkResult.distance
                });
            }
        });

    } 
    // ============================================================
    //  モードB: 通常モード (PlusMinus OFF)
    //  「全員一律で +N ずらした単語」を探す
    // ============================================================
    else {
        for (let shift = 0; shift < sequence.length; shift++) {
            let shiftedString = "";
            for (let char of normalizedInput) {
                let index = sequence.indexOf(char);
                let shiftedIndex = (index + shift) % sequence.length;
                shiftedString += sequence[shiftedIndex];
            }

            targetDictKeys.forEach(key => {
                if (!shiftIndexes[key]) return;
                
                let matchedWords = [];
                
                if (allowAnagram) {
                    const sorted = shiftedString.split('').sort().join('');
                    const found = shiftIndexes[key].anagram[sorted];
                    if (found) matchedWords = found;
                } else {
                    if (shiftIndexes[key].set.has(shiftedString)) {
                        matchedWords.push(shiftedString);
                    }
                }

                matchedWords.forEach(word => {
                    if (foundWordSet.has(word)) return;
                    foundWordSet.add(word);

                    let shiftLabel = "";
                    if (shift === 0) shiftLabel = "そのまま";
                    else if (shift <= sequence.length / 2) shiftLabel = `+${shift}`;
                    else shiftLabel = `-${sequence.length - shift}`;

                    let subText = allowAnagram ? `(${shiftedString} の並び替え)` : `(${shiftedString})`;

                    results.push({
                        headerMain: `ずらし: <span style="color:#e74c3c; font-size:1.2em;">${shiftLabel}</span>`,
                        headerSub: subText,
                        word: word,
                        sortKey: shift
                    });
                });
            });
        }
    }

    // 結果表示
    if (results.length === 0) {
        countEl.innerText = "見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">条件に合う単語はありません</div>`;
        return;
    }

    countEl.innerText = `${results.length}語が見つかりました`;

    // ソート (距離/ずらし量昇順 -> 単語昇順)
    results.sort((a, b) => {
        if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
        return a.word.localeCompare(b.word);
    });

    results.forEach(res => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        card.innerHTML = `
            <div style="margin-bottom:5px;">
                ${res.headerMain} <span style="font-size:0.8em; color:#777;">${res.headerSub}</span>
            </div>
            <div class="word-list">
                <span class="word-item" style="font-size:1.2em;">${res.word}</span>
            </div>
        `;
        resultArea.appendChild(card);
    });
}


// --------------------------------------------------------------------------
//  判定ロジック関数群
// --------------------------------------------------------------------------

// 入力とターゲットが、ある距離N（±N）の関係にあるか調べる
// 戻り値: { isMatch: boolean, distance: number, diffString: string }
function checkDistanceMatch(input, target, sequence, allowAnagram) {
    const maxDist = Math.floor(sequence.length / 2);
    
    // 距離 0 から maxDist まで順に試す
    for (let N = 0; N <= maxDist; N++) {
        const res = getDiffStringIfMatches(input, target, sequence, N, allowAnagram);
        if (res.isMatch) {
            return { isMatch: true, distance: N, diffString: res.diffString };
        }
    }
    return { isMatch: false, distance: -1, diffString: "" };
}

// 指定された距離Nで一致するか判定し、一致すれば差分文字列を返す
function getDiffStringIfMatches(input, target, sequence, N, allowAnagram) {
    if (!allowAnagram) {
        // --- 通常比較 ---
        let diffs = [];
        for (let i = 0; i < input.length; i++) {
            const d = getSignedDistance(input[i], target[i], sequence);
            if (Math.abs(d) !== N && Math.abs(d) !== (sequence.length - N) % sequence.length) {
                return { isMatch: false };
            }
            // 表示用の符号付き距離 (+2, -2)
            // 距離Nが正解なら、表示は +N か -N になるはず
            let disp = d;
            // 遠回り表現の補正（例: +24 -> -2, -24 -> +2）
            if (disp > sequence.length / 2) disp -= sequence.length;
            if (disp < -sequence.length / 2) disp += sequence.length;
            
            // 距離がNと一致するか再確認（補正後）
            if (Math.abs(disp) !== N) return { isMatch: false };

            let sign = disp >= 0 ? "+" : "";
            diffs.push(sign + disp);
        }
        return { isMatch: true, diffString: diffs.join(" ") };

    } else {
        // --- アナグラム比較 ---
        // ヒットした単語(target)の各文字が、入力(input)のどの文字から作られたか(+N or -N)を探索する
        const result = solveAnagramDiff(input.split(''), target.split(''), sequence, N);
        if (result) {
            return { isMatch: true, diffString: result.join(" ") };
        }
        return { isMatch: false };
    }
}

// アナグラム時の差分パターンを探索する
// targetの並び順に合わせて、それぞれの文字が「入力のどの文字から +N/-N されたか」のリストを返す
function solveAnagramDiff(inputChars, targetChars, sequence, N) {
    // 再帰関数の定義
    // currentDiffs: 現在確定している差分リスト
    // remainingInput: まだ使っていない入力文字
    // targetIdx: 次に判定するターゲット文字のインデックス
    const backtrack = (remainingInput, targetIdx, currentDiffs) => {
        // 全てのターゲット文字を処理できたら成功
        if (targetIdx >= targetChars.length) {
            return currentDiffs;
        }

        const charTg = targetChars[targetIdx];

        // remainingInput の中から、charTg との距離が N (±N) になる文字を探す
        for (let i = 0; i < remainingInput.length; i++) {
            const charIn = remainingInput[i];
            
            // 距離と符号付き差分を計算
            let d = getSignedDistance(charIn, charTg, sequence);
            let disp = d;
            // 補正
            if (disp > sequence.length / 2) disp -= sequence.length;
            if (disp < -sequence.length / 2) disp += sequence.length;

            if (Math.abs(disp) === N) {
                // 条件に合う文字が見つかった
                let sign = disp >= 0 ? "+" : "";
                const diffStr = sign + disp;

                // 入力文字を消費して次へ
                const nextInput = [...remainingInput];
                nextInput.splice(i, 1);
                
                const result = backtrack(nextInput, targetIdx + 1, [...currentDiffs, diffStr]);
                if (result) return result;
            }
        }
        return null;
    };

    return backtrack(inputChars, 0, []);
}

// 符号付き距離を返す (c1 -> c2)
// 単純な引き算 (0〜len-1)
function getSignedDistance(c1, c2, sequence) {
    let idx1 = sequence.indexOf(c1);
    let idx2 = sequence.indexOf(c2);
    if (idx1 === -1 || idx2 === -1) return 9999;
    return (idx2 - idx1 + sequence.length) % sequence.length;
}

// 正規化関数
function normalizeToSequence(str, sequence) {
    let res = "";
    for (let char of str) {
        if (sequence.includes(char)) {
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
