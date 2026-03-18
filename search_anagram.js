// アナグラム（抽出・並び替え・固定文字組み合わせ・ワイルドカード）検索用スクリプト

// 正規表現の特殊文字をエスケープする関数
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    
    const looseMode = document.getElementById('looseMode_anagram')?.checked;

    resultArea.innerHTML = "";

    if (!rawFrom || !rawTo) {
        countEl.innerText = "変換前と変換後の条件を入力してください";
        return;
    }

    // ★パース関数（文字、数字、ワイルドカードを仕分ける）
    const parseGroup = (str) => {
        // 全角数字を半角に、全角アスタリスクなどを半角 * に変換
        let s = str.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
                   .replace(/[＊×✕]/g, '*')
                   .trim();
        let tokens = [];
        
        const hasSpace = /[\s]/.test(s);
        
        if (hasSpace) {
            const blocks = s.split(/\s+/).filter(t => t);
            blocks.forEach(block => {
                // 数字の塊、またはそれ以外の1文字に分解
                let matches = block.match(/\d+|[^\d]/g);
                if (matches) {
                    matches.forEach(m => {
                        if (/^\d+$/.test(m)) {
                            tokens.push({ type: 'var', id: parseInt(m, 10), raw: m });
                        } else if (m === '*') {
                            tokens.push({ type: 'wildcard', raw: m });
                        } else {
                            tokens.push({ type: 'char', char: m, raw: m });
                        }
                    });
                }
            });
        } else {
            const chars = s.split('');
            chars.forEach(ch => {
                if (/^\d$/.test(ch)) {
                    tokens.push({ type: 'var', id: parseInt(ch, 10), raw: ch });
                } else if (ch === '*') {
                    tokens.push({ type: 'wildcard', raw: ch });
                } else {
                    tokens.push({ type: 'char', char: ch, raw: ch });
                }
            });
        }
        return tokens;
    };

    // 変換前
    const parsedFromGroup = parseGroup(rawFrom);
    
    // 変換後（カンマで複数グループに分割）
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

    // To(変換後)で使われている変数が、From(変換前)に存在するかチェック
    for (let group of parsedToGroups) {
        for (let t of group) {
            if (t.type === 'var' && !fromVarIds.has(t.id)) {
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

    // 検索高速化用：単語の「長さ」ごとに辞書を分ける
    const wordsByLen = new Map();
    const normWordsByLen = new Map();
    
    targetWords.forEach(w => {
        const len = w.length;
        if (!wordsByLen.has(len)) {
            wordsByLen.set(len, []);
            normWordsByLen.set(len, []);
        }
        wordsByLen.get(len).push(w);
        normWordsByLen.get(len).push({ word: w, norm: normalizeForAnagram(w, looseMode) });
    });

    const lenFrom = parsedFromGroup.length;
    const wordsFrom = wordsByLen.get(lenFrom) || [];

    // 変換後グループごとの事前情報（ワイルドカードの有無、長さなど）
    const toGroupInfo = parsedToGroups.map(toGroup => {
        return {
            tokens: toGroup,
            hasWildcard: toGroup.some(t => t.type === 'wildcard'),
            len: toGroup.length
        };
    });

    let foundPairs = [];
    let seenPairs = new Set(); 

    countEl.innerText = "検索中...";

    // メインの検索ループ
    wordsFrom.forEach(wordA => {
        const normA = normalizeForAnagram(wordA, looseMode);
        
        let isValid = true;
        let varMap = new Map(); // 数字ID -> 抽出された文字

        // 1. Fromグループ(変換前)の条件に当てはまるかチェックし、文字を変数に格納
        for (let i = 0; i < parsedFromGroup.length; i++) {
            const t = parsedFromGroup[i];
            if (t.type === 'char') {
                const normChar = normalizeForAnagram(t.char, looseMode);
                if (normA[i] !== normChar) {
                    isValid = false;
                    break;
                }
            } else if (t.type === 'var') {
                if (varMap.has(t.id)) {
                    if (varMap.get(t.id) !== normA[i]) {
                        isValid = false; 
                        break;
                    }
                } else {
                    varMap.set(t.id, normA[i]);
                }
            } else if (t.type === 'wildcard') {
                // ワイルドカードの場合は何でもOKなのでスルー
            }
        }

        if (!isValid) return;

        // 2. Toグループ(変換後)の条件を満たす単語候補を取得する
        // targetWordsGroupOptions は、各 Toグループ ごとに「見つかった単語の配列」を入れる配列
        // 例: [ ["かば", "がば"], ["たらこ"] ]
        let targetWordsGroupOptions = []; 
        
        for (let info of toGroupInfo) {
            let matchedOptions = [];
            
            if (info.hasWildcard) {
                // ★ワイルドカードがある場合：正規表現を作って検索
                let regexStr = "^";
                for (let t of info.tokens) {
                    if (t.type === 'char') regexStr += escapeRegExp(normalizeForAnagram(t.char, looseMode));
                    else if (t.type === 'var') regexStr += escapeRegExp(varMap.get(t.id));
                    else if (t.type === 'wildcard') regexStr += "."; // 任意の1文字
                }
                regexStr += "$";
                const regex = new RegExp(regexStr);
                
                const candidates = normWordsByLen.get(info.len) || [];
                let localSeen = new Set();
                
                candidates.forEach(item => {
                    if (regex.test(item.norm)) {
                        // 重複排除（同じ正規化文字列になる単語は代表1つだけ）
                        if (!localSeen.has(item.norm)) {
                            localSeen.add(item.norm);
                            matchedOptions.push(item.word);
                        }
                    }
                });
            } else {
                // ワイルドカードがない場合：文字列を組み立てて完全一致検索
                let normB = "";
                for (let t of info.tokens) {
                    if (t.type === 'char') normB += normalizeForAnagram(t.char, looseMode);
                    else if (t.type === 'var') normB += varMap.get(t.id);
                }
                
                const candidates = normWordsByLen.get(info.len) || [];
                const foundItem = candidates.find(item => item.norm === normB);
                if (foundItem) {
                    matchedOptions.push(foundItem.word); // 代表1つ
                }
            }

            // 1つでも単語が見つからなかったら、この From単語 は不成立
            if (matchedOptions.length === 0) {
                isValid = false;
                break;
            }
            targetWordsGroupOptions.push(matchedOptions);
        }

        if (!isValid) return;

        // 3. 各グループの候補の「全ての組み合わせ（直積）」を生成する
        // 例: [[A1, A2], [B1]] -> [[A1, B1], [A2, B1]]
        const combinations = targetWordsGroupOptions.reduce((acc, curr) => {
            return acc.flatMap(d => curr.map(e => [...d, e]));
        }, [[]]);

        // 全ての組み合わせを結果に登録
        combinations.forEach(combo => {
            // 変換前後で全く同じ単語1つのペアになる場合は除外
            if (combo.length === 1 && wordA === combo[0]) return;

            const pairKey = `${wordA}:${combo.join(',')}`;
            if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                foundPairs.push({
                    from: wordA,
                    toGroup: combo
                });
            }
        });
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

function normalizeForAnagram(str, isLoose) {
    if (typeof normalizeString === 'function' && typeof normalizeStrict === 'function') {
        return isLoose ? normalizeString(str) : normalizeStrict(str);
    }
    if (/^[a-zA-Z]+$/.test(str)) return str.toUpperCase();
    return str;
}
