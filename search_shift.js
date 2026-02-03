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

    for (let char of normalizedInput) {
        if (!sequence.includes(char)) {
            countEl.innerText = `対応していない文字が含まれています: ${char}`;
            return;
        }
    }

    let results = [];

    // --- モードA: ±同一視 (PlusMinus) ---
    if (allowPlusMinus) {
        // ★修正点: ずらし量ごとに単語をまとめるオブジェクト
        let matchedByShift = {}; 
        
        targetDictKeys.forEach(key => {
            let dict = [];
            if(key === 'std') dict = dictStandard;
            if(key === 'pig') dict = dictPig;
            if(key === 'eng') dict = dictEnglish;

            dict.forEach(word => {
                if (word.length !== normalizedInput.length) return;
                const isWordAlpha = /^[a-zA-Z]+$/.test(word);
                if (isAlphabet !== isWordAlpha) return;

                let normalizedWord = "";
                if (isAlphabet) normalizedWord = word.toUpperCase();
                else normalizedWord = normalizeToSequence(word, sequence);

                // 1文字目のズレ幅を計算
                let idxIn = sequence.indexOf(normalizedInput[0]);
                let idxWord = sequence.indexOf(normalizedWord[0]);
                if (idxIn === -1 || idxWord === -1) return;

                // 0〜sequence.length-1 の範囲でのズレ量
                let diff = (idxWord - idxIn + sequence.length) % sequence.length;
                let shiftAmount = Math.min(diff, sequence.length - diff); 

                let isMatch = true;
                for (let i = 1; i < normalizedInput.length; i++) {
                    let iIn = sequence.indexOf(normalizedInput[i]);
                    let iW = sequence.indexOf(normalizedWord[i]);
                    if (iIn === -1 || iW === -1) { isMatch = false; break; }
                    
                    let d = (iW - iIn + sequence.length) % sequence.length;
                    let s = Math.min(d, sequence.length - d);
                    
                    if (s !== shiftAmount) {
                        isMatch = false;
                        break;
                    }
                }

                if (isMatch) {
                    // ★修正点: diff (実際の移動量) をキーにして保存
                    if (!matchedByShift[diff]) matchedByShift[diff] = [];
                    matchedByShift[diff].push(word);
                }
            });
        });

        // ★修正点: 集計した結果を results 配列に展開
        Object.keys(matchedByShift).sort((a,b)=>a-b).forEach(shiftKey => {
            const shiftVal = parseInt(shiftKey);
            const words = [...new Set(matchedByShift[shiftKey])];
            
            // ラベル作成 (+1, -2 などの表記)
            let shiftLabel = "";
            if (shiftVal === 0) shiftLabel = "そのまま";
            else if (shiftVal <= sequence.length / 2) shiftLabel = `+${shiftVal}`;
            else shiftLabel = `-${sequence.length - shiftVal}`;

            results.push({
                shift: shiftLabel,
                shiftedString: `(相対関係が一致)`, 
                words: words
            });
        });

    } else {
        // --- モードB: 通常の全探索ずらし ---
        for (let shift = 0; shift < sequence.length; shift++) {
            let shiftedString = "";
            for (let char of normalizedInput) {
                let index = sequence.indexOf(char);
                let shiftedIndex = (index + shift) % sequence.length;
                shiftedString += sequence[shiftedIndex];
            }

            let matched = [];
            targetDictKeys.forEach(key => {
                if (shiftIndexes[key]) {
                    if (allowAnagram) {
                        const sorted = shiftedString.split('').sort().join('');
                        const found = shiftIndexes[key].anagram[sorted];
                        if (found) matched = matched.concat(found);
                    } else {
                        if (shiftIndexes[key].set.has(shiftedString)) {
                            matched.push(shiftedString);
                        }
                    }
                }
            });
            matched = [...new Set(matched)];
            
            if (matched.length > 0) {
                let shiftLabel = "";
                if (shift === 0) shiftLabel = "そのまま";
                else if (shift <= sequence.length / 2) shiftLabel = `+${shift}`;
                else shiftLabel = `-${sequence.length - shift}`;

                results.push({
                    shift: shiftLabel,
                    shiftedString: shiftedString,
                    words: matched
                });
            }
        }
    }

    // 結果表示
    if (results.length === 0) {
        countEl.innerText = "見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">条件に合う単語はありません</div>`;
        return;
    }

    // 合計件数を計算して表示
    const totalWords = results.reduce((sum, res) => sum + res.words.length, 0);
    countEl.innerText = `${results.length}パターン (${totalWords}語) が見つかりました`;

    results.forEach(res => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        
        const wordsHtml = res.words.map(w => `<span class="word-item">${w}</span>`).join("");
        
        card.innerHTML = `
            <span class="group-name">
                ずらし: <span style="color:#e74c3c; font-size:1.2em;">${res.shift}</span> 
                <span style="font-size:0.8em; color:#777;">${res.shiftedString}</span>
            </span>
            <div class="word-list">${wordsHtml}</div>
        `;
        resultArea.appendChild(card);
    });
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
