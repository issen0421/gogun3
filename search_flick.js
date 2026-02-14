// フリック入力（12キー）対応検索用スクリプト

// フリックコード定義 (キー番号-方向)
// 方向: 0:真ん中(Tap), 1:左, 2:上, 3:右, 4:下
// 例: "2-0" は「か」行キーの真ん中(=か, A)

const FLICK_MAP_JP = {
    // 1行 (あ)
    'あ':'1-0', 'い':'1-1', 'う':'1-2', 'え':'1-3', 'お':'1-4',
    // 2行 (か) -> ABC
    'か':'2-0', 'き':'2-1', 'く':'2-2', 'け':'2-3', 'こ':'2-4',
    // 3行 (さ) -> DEF
    'さ':'3-0', 'し':'3-1', 'す':'3-2', 'せ':'3-3', 'そ':'3-4',
    // 4行 (た) -> GHI
    'た':'4-0', 'ち':'4-1', 'つ':'4-2', 'て':'4-3', 'と':'4-4',
    // 5行 (な) -> JKL
    'な':'5-0', 'に':'5-1', 'ぬ':'5-2', 'ね':'5-3', 'の':'5-4',
    // 6行 (は) -> MNO
    'は':'6-0', 'ひ':'6-1', 'ふ':'6-2', 'へ':'6-3', 'ほ':'6-4',
    // 7行 (ま) -> PQRS
    'ま':'7-0', 'み':'7-1', 'む':'7-2', 'め':'7-3', 'も':'7-4',
    // 8行 (や) -> TUV
    'や':'8-0', 'ゆ':'8-2', 'よ':'8-4',
    '（':'8-1', '）':'8-3',
    // 9行 (ら) -> WXYZ
    'ら':'9-0', 'り':'9-1', 'る':'9-2', 'れ':'9-3', 'ろ':'9-4',
    // 0行 (わ) 
    'わ':'0-0', 'を':'0-1', 'ん':'0-2', 'ー':'0-3'
};

const FLICK_MAP_EN = {
    // Standard Japanese IME English Layout
    // Key 2
    'A':'2-0', 'B':'2-1', 'C':'2-2',
    // Key 3
    'D':'3-0', 'E':'3-1', 'F':'3-2',
    // Key 4
    'G':'4-0', 'H':'4-1', 'I':'4-2',
    // Key 5
    'J':'5-0', 'K':'5-1', 'L':'5-2',
    // Key 6
    'M':'6-0', 'N':'6-1', 'O':'6-2',
    // Key 7
    'P':'7-0', 'Q':'7-1', 'R':'7-2', 'S':'7-3',
    // Key 8
    'T':'8-0', 'U':'8-1', 'V':'8-2',
    // Key 9
    'W':'9-0', 'X':'9-1', 'Y':'9-2', 'Z':'9-3'
};

// 検索実行
function searchFlickPairs() {
    const countEl = document.getElementById('flickCount');
    const resultArea = document.getElementById('flickResultArea');
    
    // 辞書設定
    const useStd = document.getElementById('useDictStandard_flick').checked;
    const usePig = document.getElementById('useDictPig_flick').checked;
    const useEng = document.getElementById('useDictEnglish_flick').checked;
    const useIll1 = document.getElementById('useDictIllustLv1_flick')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2_flick')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3_flick')?.checked;
    
    // オプション（濁点・半濁点・拗音を区別しない）
    const looseMode = document.getElementById('looseMode_flick').checked;

    resultArea.innerHTML = "";
    countEl.innerText = "検索中...";

    // 1. 辞書の準備
    let jpWords = [];
    if (useStd) jpWords = jpWords.concat(dictStandard);
    if (usePig) jpWords = jpWords.concat(dictPig);
    if (useIll1) jpWords = jpWords.concat(dictIllustLv1);
    if (useIll2) jpWords = jpWords.concat(dictIllustLv2);
    if (useIll3) jpWords = jpWords.concat(dictIllustLv3);
    
    let enWords = [];
    if (useEng) enWords = enWords.concat(dictEnglish);

    if (jpWords.length === 0 || enWords.length === 0) {
        countEl.innerText = "日本語辞書と英語辞書の両方が必要です";
        return;
    }

    // 重複除去
    jpWords = [...new Set(jpWords)];
    enWords = [...new Set(enWords)];

    // 2. 日本語をフリックコード列に変換してMap化
    // Key: "2-0,3-1,..." (コード列) -> Value: ["かめ", "..."]
    const jpMap = new Map();

    jpWords.forEach(word => {
        // アルファベットが含まれる日本語単語は除外
        if (/[a-zA-Z]/.test(word)) return;

        const code = getFlickCodeSequence(word, true, looseMode);
        if (!code) return;

        if (!jpMap.has(code)) {
            jpMap.set(code, []);
        }
        jpMap.get(code).push(word);
    });

    // 3. 英語をフリックコード列に変換してマッチング
    let foundPairs = [];
    let seenPairs = new Set(); // 重複排除用 "EnWord:JpWord"

    enWords.forEach(word => {
        // 日本語が含まれる英単語データは除外
        if (/[^\x00-\x7F]/.test(word)) return; 

        const code = getFlickCodeSequence(word, false, looseMode);
        if (!code) return;

        // 日本語Mapに同じコードがあるか？
        if (jpMap.has(code)) {
            const matchedJpWords = jpMap.get(code);
            matchedJpWords.forEach(jpWord => {
                const pairId = `${word}:${jpWord}`;
                if (!seenPairs.has(pairId)) {
                    seenPairs.add(pairId);
                    foundPairs.push({
                        en: word,
                        jp: jpWord,
                        code: code
                    });
                }
            });
        }
    });

    // 4. 結果表示
    if (foundPairs.length === 0) {
        countEl.innerText = "対応するペアは見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
        return;
    }

    // ソート（文字数短い順 -> アルファベット順）
    foundPairs.sort((a, b) => {
        if (a.en.length !== b.en.length) return a.en.length - b.en.length;
        return a.en.localeCompare(b.en);
    });

    countEl.innerText = `${foundPairs.length}組のペアが見つかりました`;

    foundPairs.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        
        card.innerHTML = `
            <div class="word-list" style="justify-content: center; align-items: center;">
                <span class="word-item" style="font-size:1.4em; font-weight:bold;">${pair.en}</span>
                <span style="margin: 0 10px; color:#aaa; font-size:1.2em;">＝</span>
                <span class="word-item" style="font-size:1.4em; font-weight:bold;">${pair.jp}</span>
            </div>
            <div style="margin-top:5px; font-size:0.8em; color:#999; text-align:center;">
                Key: ${formatFlickCode(pair.code)}
            </div>
        `;
        resultArea.appendChild(card);
    });
}

// 単語をフリックコード列に変換
function getFlickCodeSequence(str, isJapanese, isLoose) {
    let codes = [];
    
    // 正規化
    let normalized = str;
    if (isJapanese) {
        if (isLoose) {
            // word_data.js の normalizeString を使用 (濁点除去、小文字->大文字、カタカナ->ひらがな)
            if (typeof normalizeString === 'function') {
                normalized = normalizeString(str);
            } else {
                // フォールバック（念のため）
                normalized = normalizeToCleanFallback(str);
            }
        } else {
            // 厳密モード: 濁点はそのまま。ただしマップにない文字はnullになるため除外される
            // (フリックマップには濁点付き文字は定義していないため、実質的にヒットしなくなる)
            normalized = str; 
        }
    } else {
        normalized = str.toUpperCase();
    }

    for (let char of normalized) {
        let code = null;
        if (isJapanese) {
            code = FLICK_MAP_JP[char];
        } else {
            code = FLICK_MAP_EN[char];
        }

        if (!code) {
            // マップにない文字（記号や、対応していない文字）が含まれる場合、
            // その単語はフリック変換ペアの対象外とする
            return null; 
        }
        codes.push(code);
    }
    return codes.join(',');
}

// 表示用にコードを整形 (例: "2-0" -> "[2･]")
function formatFlickCode(codeSeq) {
    return codeSeq.split(',').map(c => {
        const [key, dir] = c.split('-');
        const arrows = ['･', '←', '↑', '→', '↓']; // 0,1,2,3,4
        return `[${key}${arrows[dir]}]`;
    }).join('');
}

// フォールバック用（word_data.jsが読み込まれていない場合など）
function normalizeToCleanFallback(str) {
    let res = "";
    for (let char of str) {
        let c = char;
        if (/[\u30a1-\u30f6]/.test(c)) {
            c = String.fromCharCode(c.charCodeAt(0) - 0x60);
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
        if (map[c]) c = map[c];
        res += c;
    }
    return res;
}
