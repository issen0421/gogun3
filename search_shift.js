const HIRAGANA_SEQUENCE = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const ALPHABET_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function searchShift() {
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

    let targetDictKeys = [];
    if (useStd) targetDictKeys.push('std');
    if (usePig) targetDictKeys.push('pig');
    if (useEng) targetDictKeys.push('eng');

    if (targetDictKeys.length === 0) {
        countEl.innerText = "辞書を読み込み中または選択されていません";
        return;
    }

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

    if (allowPlusMinus) {
        let matched = [];
        
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

                let idxIn = sequence.indexOf(normalizedInput[0]);
                let idxWord = sequence.indexOf(normalizedWord[0]);
                if (idxIn === -1 || idxWord === -1) return;

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
                    matched.push(word);
                }
            });
        });

        matched = [...new Set(matched)];
        
        if (matched.length > 0) {
            results.push({
                shift: "±同一視",
                shiftedString: "（複数パターン）",
                words: matched
            });
        }

    } else {
        for (let shift = 0; shift < sequence.length; shift++) {
            let shiftedString = "";
            for (let char of normalizedInput) {
                let index = sequence.indexOf(char);
                let shiftedIndex = (index + shift) % sequence.length;
                shiftedString += sequence[shiftedIndex];
            }

            let matched = [];
            targetDictKeys.forEach(key => {
                if (allowAnagram) {
                    const sorted = shiftedString.split('').sort().join('');
                    const found = anagramMaps[key][sorted];
                    if (found) matched = matched.concat(found);
                } else {
                    if (dictSets[key].has(shiftedString)) {
                        matched.push(shiftedString);
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

    if (results.length === 0) {
        countEl.innerText = "見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">条件に合う単語はありません</div>`;
        return;
    }

    countEl.innerText = `${results.length}パターンのずらしで見つかりました`;

    results.forEach(res => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        const wordsHtml = res.words.map(w => `<span class="word-item">${w}</span>`).join("");
        card.innerHTML = `
            <span class="group-name">
                ずらし: <span style="color:#e74c3c; font-size:1.2em;">${res.shift}</span> 
                (${res.shiftedString})
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
        
        if (map[normalizedChar]) {
            normalizedChar = map[normalizedChar];
        }

        res += normalizedChar;
    }
    return res;
}
