// 定義された順番
const HIRAGANA_SEQUENCE = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const ALPHABET_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 検索を高速化するためのインデックス
let shiftIndexes = {
    std: { set: null, anagram: null },
    pig: { set: null, anagram: null },
    eng: { set: null, anagram: null },
    // ★追加
    ill1: { set: null, anagram: null },
    ill2: { set: null, anagram: null },
    ill3: { set: null, anagram: null }
};
let isShiftIndexReady = false;

// 辞書配列から検索用インデックスを作る関数
function prepareShiftIndexes() {
    if (isShiftIndexReady) return;
    // 辞書が空かどうかチェック（イラスト辞書がなくても他があればOK）
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
    
    // ★追加
    if (dictIllustLv1) shiftIndexes.ill1 = buildIndex(dictIllustLv1);
    if (dictIllustLv2) shiftIndexes.ill2 = buildIndex(dictIllustLv2);
    if (dictIllustLv3) shiftIndexes.ill3 = buildIndex(dictIllustLv3);

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
    // ★追加: イラスト辞書のチェック状態
    const useIll1 = document.getElementById('useDictIllustLv1_shift')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2_shift')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3_shift')?.checked;

    const allowAnagram = document.getElementById('allowAnagram').checked;
    const allowPlusMinus = document.getElementById('allowPlusMinus').checked;
    
    // ★追加: 濁点区別設定
    const looseMode = document.getElementById('looseMode_shift')?.checked;

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
    // ★追加
    if (useIll1) targetDictKeys.push('ill1');
    if (useIll2) targetDictKeys.push('ill2');
    if (useIll3) targetDictKeys.push('ill3');

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
    let foundWordSet = new Set(); 

    // 全単語リストを作成
    let allWords = [];
    if(useStd) allWords = allWords.concat(dictStandard);
    if(usePig) allWords = allWords.concat(dictPig);
    if(useEng) allWords = allWords.concat(dictEnglish);
    if(useIll1) allWords = allWords.concat(dictIllustLv1);
    if(useIll2) allWords = allWords.concat(dictIllustLv2);
    if(useIll3) allWords = allWords.concat(dictIllustLv3);
    
    allWords = [...new Set(allWords)];

    // ============================================================
    //  モードA: ±同一視 (PlusMinus) が ON の場合
    // ============================================================
    if (allowPlusMinus) {
        allWords.forEach(word => {
            if (word.length !== normalizedInput.length) return;

            let normalizedWord = "";
            if (isAlphabet) {
                if (!/^[a-zA-Z]+$/.test(word)) return;
                normalizedWord = word.toUpperCase();
            } else {
                if (/^[a-zA-Z]+$/.test(word)) return;
                // ★LooseMode対応: 比較用ターゲットを正規化する
                // ShiftLogicは清音ベースなので、LooseならnormalizeToSequence(清音化)を使い、
                // Strictなら生の単語（濁点あり）を比較対象にする必要があるが、
                // distance計算には清音化が必要。
                // そこで、まずは清音化して距離を計算し、マッチしたら最後に厳密チェックを行う。
                normalizedWord = normalizeToSequence(word, sequence);
            }

            const checkResult = checkDistanceMatch(normalizedInput, normalizedWord, sequence, allowAnagram);
            
            if (checkResult.isMatch) {
                // Strictモードの場合の追加チェック
                if (!looseMode && !isAlphabet) {
                    // 辞書の単語(word)に濁点が含まれていて、それが正規化で消えていた場合、
                    // 「ずらして一致」とはみなさない（厳密には文字が違うため）。
                    // 例: 入力「か」+1 -> 「き」。辞書「ぎ」。
                    // normalizedWordは「き」なので距離一致するが、wordは「ぎ」。
                    // strictなら「き」!=「ぎ」なので弾く。
                    if (normalizeStrict(word) !== normalizedWord) return;
                }

                let diffStr = checkResult.diffString;
                let subText = `(元: ${word})`;

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
    // ============================================================
    else {
        for (let shift = 0; shift < sequence.length; shift++) {
            let shiftedString = "";
            for (let char of normalizedInput) {
                let index = sequence.indexOf(char);
                let shiftedIndex = (index + shift) % sequence.length;
                shiftedString += sequence[shiftedIndex];
            }

            // shiftedString は常に清音
            
            allWords.forEach(word => {
                if (word.length !== shiftedString.length) return;
                
                let targetNorm = "";
                if(isAlphabet) {
                    if (!/^[a-zA-Z]+$/.test(word)) return;
                    targetNorm = word.toUpperCase();
                } else {
                    if (/^[a-zA-Z]+$/.test(word)) return;
                    // ★LooseMode対応
                    targetNorm = looseMode ? normalizeString(word) : normalizeStrict(word);
                }

                let isMatch = false;
                if(allowAnagram) {
                    const s1 = shiftedString.split('').sort().join('');
                    const s2 = targetNorm.split('').sort().join('');
                    if(s1 === s2) isMatch = true;
                } else {
                    if(shiftedString === targetNorm) isMatch = true;
                }

                if(isMatch) {
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
                }
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
//  判定ロジック関数群 (共通)
// --------------------------------------------------------------------------

function checkDistanceMatch(input, target, sequence, allowAnagram) {
    const maxDist = Math.floor(sequence.length / 2);
    for (let N = 0; N <= maxDist; N++) {
        const res = getDiffStringIfMatches(input, target, sequence, N, allowAnagram);
        if (res.isMatch) {
            return { isMatch: true, distance: N, diffString: res.diffString };
        }
    }
    return { isMatch: false, distance: -1, diffString: "" };
}

function getDiffStringIfMatches(input, target, sequence, N, allowAnagram) {
    if (!allowAnagram) {
        // --- 通常比較 ---
        let diffs = [];
        for (let i = 0; i < input.length; i++) {
            const idxIn = sequence.indexOf(input[i]);
            const idxTg = sequence.indexOf(target[i]);
            
            const dObj = getDiffInfo(idxIn, idxTg, sequence);
            
            if (Math.abs(dObj.disp) !== N) return { isMatch: false };

            diffs.push(dObj.html);
        }
        return { isMatch: true, diffString: diffs.join(" ") };

    } else {
        // --- アナグラム比較 ---
        const result = solveAnagramDiff(input.split(''), target.split(''), sequence, N);
        if (result) {
            return { isMatch: true, diffString: result.join(" ") };
        }
        return { isMatch: false };
    }
}

function getDiffInfo(idx1, idx2, sequence) {
    const len = sequence.length;
    const rawDiff = idx2 - idx1;
    let disp = (idx2 - idx1 + len) % len;
    if (disp > len / 2) disp -= len;

    const isLoop = (rawDiff !== disp);

    let sign = disp >= 0 ? "+" : "";
    let text = sign + disp;

    let html = text;
    if (isLoop && disp !== 0) { 
        html = `<span class="loop-highlight" title="境界をまたぎました">${text}<span class="loop-mark">↺</span></span>`;
    }

    return { disp: disp, html: html };
}

function solveAnagramDiff(inputChars, targetChars, sequence, N) {
    const backtrack = (remainingInput, targetIdx, currentDiffs) => {
        if (targetIdx >= targetChars.length) {
            return currentDiffs;
        }

        const charTg = targetChars[targetIdx];

        for (let i = 0; i < remainingInput.length; i++) {
            const charIn = remainingInput[i];
            
            const idxIn = sequence.indexOf(charIn);
            const idxTg = sequence.indexOf(charTg);
            
            const dObj = getDiffInfo(idxIn, idxTg, sequence);

            if (Math.abs(dObj.disp) === N) {
                const nextInput = [...remainingInput];
                nextInput.splice(i, 1);
                
                const result = backtrack(nextInput, targetIdx + 1, [...currentDiffs, dObj.html]);
                if (result) return result;
            }
        }
        return null;
    };

    return backtrack(inputChars, 0, []);
}

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
