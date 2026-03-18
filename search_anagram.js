// アナグラム（抽出・並び替え・固定文字組み合わせ・ワイルドカード）検索用スクリプト

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function searchAnagram() {
    const rawFrom = document.getElementById('anagramFrom').value.trim();
    const rawTo = document.getElementById('anagramTo').value.trim();
    const resultArea = document.getElementById('anagramResultArea');
    const countEl = document.getElementById('anagramCount');
    
    const useStd = document.getElementById('useDictStandard_anagram').checked;
    const usePig = document.getElementById('useDictPig_anagram').checked;
    const useEng = document.getElementById('useDictEnglish_anagram').checked;
    const useIll1 = document.getElementById('useDictIllustLv1_anagram')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2_anagram')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3_anagram')?.checked;
    
    const looseMode = document.getElementById('looseMode_anagram')?.checked;

    if (!rawFrom || !rawTo) {
        countEl.innerText = "変換前と変換後の条件を入力してください";
        resultArea.innerHTML = "";
        return;
    }

    const parseGroup = (str) => {
        let s = str.replace(/[０-９]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
                   .replace(/[＊×✕]/g, '*')
                   .trim();
        let tokens = [];
        const hasSpace = /[\s]/.test(s);
        
        if (hasSpace) {
            const blocks = s.split(/\s+/).filter(t => t);
            blocks.forEach(block => {
                let matches = block.match(/\d+|[^\d]/g);
                if (matches) {
                    matches.forEach(m => {
                        if (/^\d+$/.test(m)) tokens.push({ type: 'var', id: parseInt(m, 10), raw: m });
                        else if (m === '*') tokens.push({ type: 'wildcard', raw: m });
                        else tokens.push({ type: 'char', char: m, raw: m });
                    });
                }
            });
        } else {
            const chars = s.split('');
            chars.forEach(ch => {
                if (/^\d$/.test(ch)) tokens.push({ type: 'var', id: parseInt(ch, 10), raw: ch });
                else if (ch === '*') tokens.push({ type: 'wildcard', raw: ch });
                else tokens.push({ type: 'char', char: ch, raw: ch });
            });
        }
        return tokens;
    };

    const parsedFromGroup = parseGroup(rawFrom);
    const toGroupsRaw = rawTo.replace(/[，、＋+／/]/g, ',').split(',');
    const parsedToGroups = [];
    
    for (let g of toGroupsRaw) {
        if (!g.trim()) continue;
        const parsed = parseGroup(g);
        if (parsed.length > 0) parsedToGroups.push(parsed);
    }

    if (parsedFromGroup.length === 0 || parsedToGroups.length === 0) {
        countEl.innerText = "入力が正しく読み取れませんでした";
        resultArea.innerHTML = "";
        return;
    }

    const fromVarIds = new Set();
    parsedFromGroup.forEach(t => { if (t.type === 'var') fromVarIds.add(t.id); });

    for (let group of parsedToGroups) {
        for (let t of group) {
            if (t.type === 'var' && !fromVarIds.has(t.id)) {
                if (t.id >= 10 && parsedFromGroup.length < 10) {
                    countEl.innerHTML = `<span style="color:#e74c3c; font-weight:bold;">エラー: 変換後の数字「${t.id}」が変換前に存在しません。</span><br><span style="font-size:12px;">※複数の単語に分ける場合は<b>「スペース」ではなく「カンマ( , )」</b>で区切ってください。</span>`;
                } else {
                    countEl.innerHTML = `<span style="color:#e74c3c;">エラー: 変換後の数字「${t.id}」が変換前に存在しません</span>`;
                }
                resultArea.innerHTML = "";
                return;
            }
        }
    }

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    if (useEng) targetWords = targetWords.concat(dictEnglish);
    if (useIll1) targetWords = targetWords.concat(dictIllustLv1);
    if (useIll2) targetWords = targetWords.concat(dictIllustLv2);
    if (useIll3) targetWords = targetWords.concat(dictIllustLv3);

    if (targetWords.length === 0) {
        countEl.innerText = "辞書が選択されていません";
        resultArea.innerHTML = "";
        return;
    }

    targetWords = [...new Set(targetWords)];

    // 検索中表示 (非同期化)
    countEl.innerHTML = `<span class="searching-text">⏳ 検索中... パターンを計算しています</span>`;
    resultArea.innerHTML = "";
    resultArea.classList.add('loading-area');

    setTimeout(() => {
        try {
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

            const toGroupInfo = parsedToGroups.map(toGroup => {
                return {
                    tokens: toGroup,
                    hasWildcard: toGroup.some(t => t.type === 'wildcard'),
                    len: toGroup.length
                };
            });

            let foundPairs = [];
            let seenPairs = new Set(); 

            wordsFrom.forEach(wordA => {
                const normA = normalizeForAnagram(wordA, looseMode);
                
                let isValid = true;
                let varMap = new Map();

                for (let i = 0; i < parsedFromGroup.length; i++) {
                    const t = parsedFromGroup[i];
                    if (t.type === 'char') {
                        const normChar = normalizeForAnagram(t.char, looseMode);
                        if (normA[i] !== normChar) { isValid = false; break; }
                    } else if (t.type === 'var') {
                        if (varMap.has(t.id)) {
                            if (varMap.get(t.id) !== normA[i]) { isValid = false; break; }
                        } else {
                            varMap.set(t.id, normA[i]);
                        }
                    }
                }

                if (!isValid) return;

                let targetWordsGroupOptions = []; 
                
                for (let info of toGroupInfo) {
                    let matchedOptions = [];
                    
                    if (info.hasWildcard) {
                        let regexStr = "^";
                        for (let t of info.tokens) {
                            if (t.type === 'char') regexStr += escapeRegExp(normalizeForAnagram(t.char, looseMode));
                            else if (t.type === 'var') regexStr += escapeRegExp(varMap.get(t.id));
                            else if (t.type === 'wildcard') regexStr += "."; 
                        }
                        regexStr += "$";
                        const regex = new RegExp(regexStr);
                        
                        const candidates = normWordsByLen.get(info.len) || [];
                        let localSeen = new Set();
                        
                        candidates.forEach(item => {
                            if (regex.test(item.norm)) {
                                if (!localSeen.has(item.norm)) {
                                    localSeen.add(item.norm);
                                    matchedOptions.push(item.word);
                                }
                            }
                        });
                    } else {
                        let normB = "";
                        for (let t of info.tokens) {
                            if (t.type === 'char') normB += normalizeForAnagram(t.char, looseMode);
                            else if (t.type === 'var') normB += varMap.get(t.id);
                        }
                        
                        const candidates = normWordsByLen.get(info.len) || [];
                        const foundItem = candidates.find(item => item.norm === normB);
                        if (foundItem) matchedOptions.push(foundItem.word);
                    }

                    if (matchedOptions.length === 0) {
                        isValid = false;
                        break;
                    }
                    targetWordsGroupOptions.push(matchedOptions);
                }

                if (!isValid) return;

                const combinations = targetWordsGroupOptions.reduce((acc, curr) => {
                    return acc.flatMap(d => curr.map(e => [...d, e]));
                }, [[]]);

                combinations.forEach(combo => {
                    if (combo.length === 1 && wordA === combo[0]) return;

                    const pairKey = `${wordA}:${combo.join(',')}`;
                    if (!seenPairs.has(pairKey)) {
                        seenPairs.add(pairKey);
                        foundPairs.push({ from: wordA, toGroup: combo });
                    }
                });
            });

            if (foundPairs.length === 0) {
                countEl.innerText = "条件に合うペアは見つかりませんでした";
                resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
                return;
            }

            countEl.innerText = `${foundPairs.length}組のパターンが見つかりました`;

            const formatTokens = (tokens) => {
                const hasDoubleDigit = tokens.some(t => t.type === 'var' && t.id >= 10);
                return tokens.map(t => t.raw).join(hasDoubleDigit ? ' ' : '');
            };

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

        } catch (e) {
            console.error(e);
            countEl.innerText = "検索処理中にエラーが発生しました。";
        } finally {
            // 必ずローディングを解除
            resultArea.classList.remove('loading-area');
        }
    }, 50);
}

function normalizeForAnagram(str, isLoose) {
    if (typeof normalizeString === 'function' && typeof normalizeStrict === 'function') {
        return isLoose ? normalizeString(str) : normalizeStrict(str);
    }
    if (/^[a-zA-Z]+$/.test(str)) return str.toUpperCase();
    return str;
}
