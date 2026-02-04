// 文字ずらし2 (個別指定シフト) 用スクリプト

const HIRAGANA_SEQ_S2 = "あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをん";
const ALPHABET_SEQ_S2 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// キャッシュ用
let shift2Index = {
    allWords: new Set(),
    isReady: false
};

function searchShift2() {
    const rawInput = document.getElementById('shift2Input').value.trim();
    const resultArea = document.getElementById('shift2ResultArea');
    const countEl = document.getElementById('shift2Count');
    
    // 辞書設定の取得
    const useStd = document.getElementById('useDictStandard_shift2').checked;
    const usePig = document.getElementById('useDictPig_shift2').checked;
    const useEng = document.getElementById('useDictEnglish_shift2').checked;
    const useIll1 = document.getElementById('useDictIllustLv1_shift2')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2_shift2')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3_shift2')?.checked;

    resultArea.innerHTML = "";

    // 入力値の解析 (例: "1 -2 3" -> [1, -2, 3])
    // 全角数字も半角に直し、カンマやスペースで区切る
    let normalizedInput = rawInput
        .replace(/[０-９]/g, s => String.fromCharCode(s.charCodeAt(0) - 0xFEE0))
        .replace(/[−－]/g, '-')
        .replace(/[,，、]/g, ' ');
    
    let shifts = normalizedInput.split(/\s+/)
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n));

    if (shifts.length === 0) {
        countEl.innerText = "ずらす数を入力してください（例: 1 -2 3）";
        return;
    }

    // 検索対象の単語リストを作成
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

    // 単語の長さでフィルタリング（入力された数値の個数と同じ長さの単語のみ対象）
    const targetLength = shifts.length;
    let candidateWords = targetWords.filter(w => w.length === targetLength);

    // 高速検索用にSetを作成
    // (アルファベットは大文字化して格納、日本語は正規化して格納)
    const wordSet = new Set();
    candidateWords.forEach(w => {
        wordSet.add(normalizeForShift2(w));
    });

    let foundPairs = [];
    let usedPairs = new Set(); // 重複表示防止 (A->B が出たら A->Bはもう出さない)

    // 全候補単語について、シフト後の単語が存在するかチェック
    candidateWords.forEach(wordA => {
        const normA = normalizeForShift2(wordA);
        const isAlphabet = /^[a-zA-Z]+$/.test(wordA);
        const sequence = isAlphabet ? ALPHABET_SEQ_S2 : HIRAGANA_SEQ_S2;

        // シフト後の文字列を作成
        let wordBChars = "";
        let isValidShift = true;

        for (let i = 0; i < normA.length; i++) {
            const char = normA[i];
            const idx = sequence.indexOf(char);
            
            // 対応外の文字が含まれていたらスキップ
            if (idx === -1) {
                isValidShift = false;
                break;
            }

            const shift = shifts[i];
            let shiftedIdx = (idx + shift) % sequence.length;
            if (shiftedIdx < 0) shiftedIdx += sequence.length;
            
            wordBChars += sequence[shiftedIdx];
        }

        if (!isValidShift) return;

        // 生成された WordB が辞書に存在するか？
        if (wordSet.has(wordBChars)) {
            // 見つかった！
            // 表示用に元の表記を探す（Setには正規化文字しか入っていないため、候補リストから探すのはコスト高いが、
            // ここでは簡易的に wordBChars そのものを表示するか、candidateから探す。
            // 正確を期すならMapを作るべきだが、今回はヒット数が少ない想定なので
            // Setにある＝wordBChars自体が単語として成立している。
            // ただし、大文字小文字やひらがなの違いを吸収しているので、
            // 辞書内の「元の表記」を探して表示してあげると親切。
            
            let originalWordB = candidateWords.find(w => normalizeForShift2(w) === wordBChars);
            if (!originalWordB) originalWordB = wordBChars; // フォールバック

            // 自分自身への変換は除外する（全て0ずらしの場合など）
            if (wordA === originalWordB) return;

            const pairKey = `${wordA}:${originalWordB}`;
            if (usedPairs.has(pairKey)) return;
            usedPairs.add(pairKey);

            foundPairs.push({
                from: wordA,
                to: originalWordB,
                shifts: shifts
            });
        }
    });

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
        
        // シフト情報の表示整形
        const shiftInfo = pair.shifts.map(n => (n >= 0 ? `+${n}` : n)).join(' ');

        card.innerHTML = `
            <div style="margin-bottom:5px; font-size:0.8em; color:#777;">
                ずらし: <span style="font-weight:bold; color:#e74c3c;">${shiftInfo}</span>
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

function normalizeForShift2(str) {
    // 英語は大文字化、日本語は正規化（濁点とりなど）
    if (/^[a-zA-Z]+$/.test(str)) {
        return str.toUpperCase();
    }
    // かな正規化（search_shift.jsのロジックを流用）
    let res = "";
    const seq = HIRAGANA_SEQ_S2;
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
