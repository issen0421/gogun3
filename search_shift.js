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
        // インデックスは使わず、辞書全単語をスキャンして判定する
        let allWords = [];
        targetDictKeys.forEach(key => {
            if (key === 'std') allWords = allWords.concat(dictStandard);
            if (key === 'pig') allWords = allWords.concat(dictPig);
            if (key === 'eng') allWords = allWords.concat(dictEnglish);
        });

        // 重複除去
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

            // この単語が条件（距離Nで一致、または距離Nでアナグラム一致）を満たすか判定
            const checkResult = checkDistanceMatch(normalizedInput, normalizedWord, sequence, allowAnagram);
            
            if (checkResult.isMatch) {
                // 表示用データの作成
                let diffDetail = "";
                
                if (allowAnagram) {
                    // アナグラムの場合は文字の対応が一意ではないので距離のみ表示
                    diffDetail = `距離 ${checkResult.distance} (並び替え)`;
                } else {
                    // 通常時は「+2 -2 +2」のように内訳を表示
                    diffDetail = calculateDiffStringDetailed(normalizedInput, normalizedWord, sequence);
                }

                results.push({
                    headerMain: `<span style="color:#e74c3c; font-size:1.1em; letter-spacing:1px;">${diffDetail}</span>`,
                    headerSub: `(元: ${word})`,
                    word: word,
                    sortKey: checkResult.distance // 距離が小さい順にソートするため
                });
            }
        });

    } 
    // ============================================================
    //  モードB: 通常モード (PlusMinus OFF)
    //  「全員一律で +N ずらした単語」を探す
    // ============================================================
    else {
        // 全パターンのずらしを試行 (0 ～ length-1)
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

                    // ずらしラベル
                    let shiftLabel = "";
                    if (shift === 0) shiftLabel = "そのまま";
                    else if (shift <= sequence.length / 2) shiftLabel = `+${shift}`;
                    else shiftLabel = `-${sequence.length - shift}`;

                    let subText = allowAnagram ? `(${shiftedString} の並び替え)` : `(${shiftedString})`;

                    results.push({
                        headerMain: `ずらし: <span style="color:#e74c3c; font-size:1.2em;">${shiftLabel}</span>`,
                        headerSub: subText,
                        word: word,
                        sortKey: shift // ずらし量が小さい順
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
// 戻り値: { isMatch: boolean, distance: number }
function checkDistanceMatch(input, target, sequence, allowAnagram) {
    const maxDist = Math.floor(sequence.length / 2);
    
    // 距離 0 から maxDist まで順に試す
    // (※ 複数ヒットする可能性もあるが、最短距離のNを採用して返す)
    for (let N = 0; N <= maxDist; N++) {
        if (canMatchWithDistance(input, target, sequence, N, allowAnagram)) {
            return { isMatch: true, distance: N };
        }
    }
    return { isMatch: false, distance: -1 };
}

// 指定された距離Nで一致するか？
function canMatchWithDistance(input, target, sequence, N, allowAnagram) {
    if (!allowAnagram) {
        // --- 通常比較 ---
        // 全ての文字ペアで、距離がちょうど N である必要がある
        for (let i = 0; i < input.length; i++) {
            let dist = getMinDistance(input[i], target[i], sequence);
            if (dist !== N) return false;
        }
        return true;
    } else {
        // --- アナグラム比較 ---
        // inputの各文字を「距離N」ずらした文字集合と、targetの文字集合が一致するか？
        // 単純比較はできないため、バックトラック探索でマッチングを行う
        return canMatchAnagramRecursive(input.split(''), target.split(''), sequence, N);
    }
}

// アナグラム用の再帰マッチング判定
function canMatchAnagramRecursive(inputChars, targetChars, sequence, N) {
    if (inputChars.length === 0) return true;
    
    const charIn = inputChars[0];
    const restIn = inputChars.slice(1);
    
    // charIn に対して、targetChars の中から「距離N」であるものを探す
    for (let i = 0; i < targetChars.length; i++) {
        const charTg = targetChars[i];
        if (getMinDistance(charIn, charTg, sequence) === N) {
            // マッチ候補発見。これを使って残りを再帰判定
            const restTg = [...targetChars];
            restTg.splice(i, 1); // 使った文字を削除
            
            if (canMatchAnagramRecursive(restIn, restTg, sequence, N)) {
                return true;
            }
        }
    }
    return false;
}

// 2文字間の最短距離を返す
function getMinDistance(c1, c2, sequence) {
    let idx1 = sequence.indexOf(c1);
    let idx2 = sequence.indexOf(c2);
    if (idx1 === -1 || idx2 === -1) return -1;
    let diff = Math.abs(idx1 - idx2);
    return Math.min(diff, sequence.length - diff);
}

// 詳細な差分文字列 ("+2 -2 +2") を生成する (アナグラムOFF時用)
function calculateDiffStringDetailed(input, target, sequence) {
    let diffs = [];
    for (let i = 0; i < input.length; i++) {
        let idxIn = sequence.indexOf(input[i]);
        let idxTg = sequence.indexOf(target[i]);
        
        let diff = (idxTg - idxIn + sequence.length) % sequence.length;
        // 近い方で表示 (+25 よりも -1 と表示したい)
        if (diff > sequence.length / 2) {
            diff -= sequence.length;
        }
        
        let sign = diff >= 0 ? "+" : ""; 
        diffs.push(sign + diff);
    }
    return diffs.join(" ");
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
