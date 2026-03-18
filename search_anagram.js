// アナグラム（抽出・並び替え・固定文字組み合わせ）検索用スクリプト

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
        countEl.innerText = "変換前と変換後の条件を入力してください";
        return;
    }

    // 文字列を「変数(数字)」と「固定文字」の配列にパースする関数
    const parseGroup = (str) => {
        let s = str.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)).trim();
        let tokens = [];
        
        // スペースが含まれていればスペース区切り、なければ1文字ずつ区切る
        if (/[\s]/.test(s)) {
            tokens = s.split(/\s+/).filter(t => t);
        } else {
            tokens = s.split('').filter(t => t);
        }
        
        // 数字なら「変数(var)」、それ以外なら「文字(char)」として判定
        return tokens.map(t => {
            if (/^\d+$/.test(t)) {
                return { type: 'var', id: parseInt(t, 10), raw: t };
            } else {
                return { type: 'char', char: t, raw: t };
            }
        });
    };

    // 変換前
    const parsedFromGroup = parseGroup(rawFrom);
    
    // 変換後（カンマや＋などで複数のグループに分割対応）
    const toGroupsRaw = rawTo.replace(/[，、＋+／/]/g, ',').split(',');
    const parsedToGroups = [];
    
    for (let g of toGroupsRaw) {
        if (!g.trim()) continue;
        const parsed = parseGroup(g);
        if (parsed.length > 0) {
            parsedToGroups.push(parsed);
        }
    }

    if (parsedFromGroup.length === 0 || parsedToGroups.length === 0) {
        countEl.innerText = "入力が正しく読み取れませんでした";
        return;
    }

    // Fromに含まれる変数ID(数字)のリストを作成
    const fromVarIds = new Set();
    parsedFromGroup.forEach(t => {
        if (t.type === 'var') fromVarIds.add(t.id);
    });

    // To(変換後)で使われている変数が、ちゃんとFrom(変換前)に存在するかチェック
    for (let group of parsedToGroups) {
        for (let t of group) {
            if (t.type === 'var' && !fromVarIds.has(t.id)) {
                // ★エラーメッセージを親切に表示
                if (t.id >= 10 && parsedFromGroup.length < 10) {
                    countEl.innerHTML = `<span style="color:#e74c3c; font-weight:bold;">エラー: 変換後の数字「${t.id}」が変換前に存在しません。</span><br><span style="font-size:12px;">※複数の単語に分ける場合は<b>「スペース」ではなく「カンマ( , )」</b>で区切ってください。</span>`;
                } else {
                    countEl.innerHTML = `<span style="color:#e74c3c;">エラー: 変換後の数字「${t.id}」が変換前に存在しません</span>`;
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

    targetWords = [...new Set(targetWords)];

    // 検索高速化用マップ (Key: 正規化単語, Value: 元の単語)
    const wordMapTo = new Map();
    targetWords.forEach(w => {
        const norm = normalizeForAnagram(w, looseMode);
        if (!wordMapTo.has(norm)) {
            wordMapTo.set(norm, w); // 複数ある場合は代表として1つだけ保持
        }
    });

    // 変換前の長さに合う単語だけ抽出
    const lenFrom = parsedFromGroup.length;
    const wordsFrom = targetWords.filter(w => w.length === lenFrom);

    let foundPairs = [];
    let seenPairs = new Set(); // 重複表示防止用

    countEl.innerText = "検索中...";

    // メインの検索ループ
    wordsFrom.forEach(wordA => {
        const normA = normalizeForAnagram(wordA, looseMode);
        
        let isValid = true;
        let varMap = new Map(); // 数字ID -> 抽出された文字

        // 1. Fromグループ(変換前)の条件に当てはまるかチェックし、文字を抽出
        for (let i = 0; i < parsedFromGroup.length; i++) {
            const t = parsedFromGroup[i];
            if (t.type === 'char') {
                // 固定文字のチェック（「あ12」の「あ」に当たる部分が一致しているか）
                const normChar = normalizeForAnagram(t.char, looseMode);
                if (normA[i] !== normChar) {
                    isValid = false;
                    break;
                }
            } else if (t.type === 'var') {
                // 変数(数字)への文字割り当て
                if (varMap.has(t.id)) {
                    // 同じ数字が複数回使われている場合は、同じ文字が入っていなければ無効
                    if (varMap.get(t.id) !== normA[i]) {
                        isValid = false; 
                        break;
                    }
                } else {
                    varMap.set(t.id, normA[i]);
                }
            }
        }

        if (!isValid) return;

        let targetWordsGroup = [];
        
        // 2. Toグループ(変換後)の文字列を生成し、辞書にあるかチェック
        for (let toGroup of parsedToGroups) {
            let normB = "";
            for (let t of toGroup) {
                if (t.type === 'char') {
                    normB += normalizeForAnagram(t.char, looseMode);
                } else if (t.type === 'var') {
                    normB += varMap.get(t.id);
                }
            }

            if (wordMapTo.has(normB)) {
                targetWordsGroup.push(wordMapTo.get(normB));
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
                toGroup: targetWordsGroup
            });
        }
    });

    if (foundPairs.length === 0) {
        countEl.innerText = "条件に合うペアは見つかりませんでした";
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
        return;
    }

    countEl.innerText = `${foundPairs.length}組のパターンが見つかりました`;

    // 表示用にトークン配列を文字列化する関数
    const formatTokens = (tokens) => {
        const hasDoubleDigit = tokens.some(t => t.type === 'var' && t.id >= 10);
        return tokens.map(t => t.raw).join(hasDoubleDigit ? ' ' : '');
    };

    // 結果の描画
    foundPairs.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'group-card match-perfect';
        
        const dispFrom = formatTokens(parsedFromGroup);
        const dispTo = parsedToGroups.map(formatTokens).join(' + ');

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
