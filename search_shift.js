// 定義された順番
const HIRAGANA_SEQUENCE = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const ALPHABET_SEQUENCE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function searchShift() {
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

    // 検索対象の辞書キーを決定
    let targetDictKeys = [];
    if (useStd) targetDictKeys.push('std');
    if (usePig) targetDictKeys.push('pig');
    if (useEng) targetDictKeys.push('eng');

    if (targetDictKeys.length === 0) {
        countEl.innerText = "辞書を読み込み中または選択されていません";
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
        // 濁音・半濁音・拗音を正規化して基本文字にする（同一視するため）
        normalizedInput = normalizeToSequence(rawInput, sequence);
    }

    // 入力文字がシーケンスに含まれていない場合はエラー
    for (let char of normalizedInput) {
        if (!sequence.includes(char)) {
            countEl.innerText = `対応していない文字が含まれています: ${char}`;
            return;
        }
    }

    let results = [];

    // --- ロジック分岐 ---

    if (allowPlusMinus) {
        // [±同一視モード]
        // 辞書を走査して、条件に合うものを探す
        let matched = [];
        
        targetDictKeys.forEach(key => {
            let dict = [];
            if(key === 'std') dict = dictStandard;
            if(key === 'pig') dict = dictPig;
            if(key === 'eng') dict = dictEnglish;

            dict.forEach(word => {
                // 文字数チェック
                if (word.length !== normalizedInput.length) return;
                const isWordAlpha = /^[a-zA-Z]+$/.test(word);
                if (isAlphabet !== isWordAlpha) return;

                // 辞書単語も正規化
                let normalizedWord = "";
                if (isAlphabet) normalizedWord = word.toUpperCase();
                else normalizedWord = normalizeToSequence(word, sequence);

                // 1文字目のズレ幅(絶対値)を計算
                let idxIn = sequence.indexOf(normalizedInput[0]);
                let idxWord = sequence.indexOf(normalizedWord[0]);
                if (idxIn === -1 || idxWord === -1) return;

                // 距離計算 (円環)
                let diff = (idxWord - idxIn + sequence.length) % sequence.length;
                let shiftAmount = Math.min(diff, sequence.length - diff); // 絶対値としての距離

                // 2文字目以降も同じ shiftAmount かチェック
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

        // 重複除去
        matched = [...new Set(matched)];
        
        if (matched.length > 0) {
            results.push({
                shift: "±同一視",
                shiftedString: "（複数パターン）",
                words: matched
            });
        }

    } else {
        // [通常モード] (固定ずらし + アナグラム)
        
        // 全パターンのずらしを試行 (0 to len-1)
        for (let shift = 0; shift < sequence.length; shift++) {
            // ずらした文字列を作成
            let shiftedString = "";
            for (let char of normalizedInput) {
                let index = sequence.indexOf(char);
                let shiftedIndex = (index + shift) % sequence.length;
                shiftedString += sequence[shiftedIndex];
            }

            // 辞書検索
            let matched = [];
            targetDictKeys.forEach(key => {
                if (allowAnagram) {
                    // アナグラム検索: ソートした文字列をキーにしてMapから引く
                    const sorted = shiftedString.split('').sort().join('');
                    const found = anagramMaps[key][sorted];
                    if (found) matched = matched.concat(found);
                } else {
                    // 通常検索: Setから引く
                    if (dictSets[key].has(shiftedString)) {
                        matched.push(shiftedString);
                    }
                }
            });
            // 重複除去
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

// 入力文字列を、指定されたシーケンス内の文字に正規化する
// (濁点・小文字などを、シーケンスにある親文字に変換)
function normalizeToSequence(str, sequence) {
    let res = "";
    for (let char of str) {
        // そのままシーケンスにあればOK
        if (sequence.includes(char)) {
            res += char;
            continue;
        }
        
        // 正規化（濁点除去・小文字変換）してトライ
        // 五十音表独自の「同一視」ルール
        let normalizedChar = char;
        
        // カタカナ -> ひらがな
        if (/[\u30a1-\u30f6]/.test(char)) {
            normalizedChar = String.fromCharCode(char.charCodeAt(0) - 0x60);
        }

        // 濁点・半濁点・小文字の手動マッピング
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
