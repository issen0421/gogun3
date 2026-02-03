// 定義された順番
const HIRAGANA_SEQUENCE = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const ALPHABET_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// 検索を高速化するためのインデックス
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
        const set = new Set(wordList);
        const anagramMap = {};
        wordList.forEach(word => {
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
    
    // オプション取得
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

    let targetDictKeys = [];
    if (useStd) targetDictKeys.push('std');
    if (usePig) targetDictKeys.push('pig');
    if (useEng) targetDictKeys.push('eng');

    if (targetDictKeys.length === 0) {
        countEl.innerText = "辞書が選択されていません";
        return;
    }

    // 入力文字の種別判定と正規化
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

    // 入力文字チェック
    for (let char of normalizedInput) {
        if (!sequence.includes(char)) {
            countEl.innerText = `対応していない文字が含まれています: ${char}`;
            return;
        }
    }

    // 検索実行
    // 基本ロジック: 「0〜N文字ずらした文字列(またはそのアナグラム)」が辞書にあるか全探索する
    let results = [];
    let foundWordSet = new Set(); // 重複排除用

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
            
            // アナグラムONならアナグラムマップから、OFFなら通常セットから検索
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
                // 重複チェック (同じ単語が別のシフトのアナグラムとしてヒットする場合などを排除)
                // ただし、±同一視モードでは「どのシフトでヒットしたか」が重要かもしれないが、
                // 今回は「単語」をユニークにする。
                if (foundWordSet.has(word)) return;
                foundWordSet.add(word);

                // ずらしラベル (+3 など)
                let shiftLabel = "";
                if (shift === 0) shiftLabel = "そのまま";
                else if (shift <= sequence.length / 2) shiftLabel = `+${shift}`;
                else shiftLabel = `-${sequence.length - shift}`;
                
                // 詳細な文字ごとの差分を計算 (+2 -2 +2 ... のような文字列)
                const diffDetail = calculateDiffString(normalizedInput, word, sequence, isAlphabet);

                results.push({
                    baseShiftLabel: shiftLabel,
                    shiftedString: shiftedString,
                    word: word,
                    diffDetail: diffDetail
                });
            });
        });
    }

    // 結果表示
    if (results.length === 0) {
        countEl.innerText = "見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">条件に合う単語はありません</div>`;
        return;
    }

    countEl.innerText = `${results.length}語が見つかりました`;

    // ±同一視(allowPlusMinus) がONなら、詳細差分を見出しにする
    results.forEach(res => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        
        // ヘッダー情報の出し分け
        let headerMain = "";
        let headerSub = "";

        if (allowPlusMinus) {
            // 詳細モード: 「+2 -2 +2」をメインに表示
            headerMain = `<span style="color:#e74c3c; font-size:1.1em; letter-spacing:1px;">${res.diffDetail}</span>`;
            if (allowAnagram) {
                headerSub = `(元: ${res.baseShiftLabel} のアナグラム)`;
            } else {
                headerSub = `(元: ${res.baseShiftLabel})`;
            }
        } else {
            // 通常モード: 「+3」をメインに表示
            headerMain = `ずらし: <span style="color:#e74c3c; font-size:1.2em;">${res.baseShiftLabel}</span>`;
            if (allowAnagram) {
                headerSub = `(${res.shiftedString} の並び替え)`;
            } else {
                headerSub = `(${res.shiftedString})`;
            }
        }

        card.innerHTML = `
            <div style="margin-bottom:5px;">
                ${headerMain} <span style="font-size:0.8em; color:#777;">${headerSub}</span>
            </div>
            <div class="word-list">
                <span class="word-item" style="font-size:1.2em;">${res.word}</span>
            </div>
        `;
        resultArea.appendChild(card);
    });
}

// 入力文字列(input) から 目標単語(target) への文字ごとのズレを計算して文字列で返す
function calculateDiffString(input, target, sequence, isAlphabet) {
    // ターゲット単語も正規化して比較
    let normalizedTarget = "";
    if (isAlphabet) normalizedTarget = target.toUpperCase();
    else normalizedTarget = normalizeToSequence(target, sequence);

    if (input.length !== normalizedTarget.length) return "";

    let diffs = [];
    for (let i = 0; i < input.length; i++) {
        let idxIn = sequence.indexOf(input[i]);
        let idxTg = sequence.indexOf(normalizedTarget[i]);
        
        if (idxIn === -1 || idxTg === -1) {
            diffs.push("?");
            continue;
        }

        // 差分計算
        let diff = (idxTg - idxIn + sequence.length) % sequence.length;
        // 近い方で表示 (+25 よりも -1 と表示したい)
        if (diff > sequence.length / 2) {
            diff -= sequence.length;
        }
        
        let sign = diff >= 0 ? "+" : ""; // マイナスは自動でつくのでプラスだけ明示
        diffs.push(sign + diff);
    }
    return diffs.join(" ");
}

// 入力文字列を、指定されたシーケンス内の文字に正規化する
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
