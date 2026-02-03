async function loadAllDictionaries() {
    const statusEl = document.getElementById('txtStatus');
    if(statusEl) statusEl.innerText = "辞書読み込み中...";
    
    const loadFile = async (filename) => {
        try {
            const res = await fetch(filename);
            if (!res.ok) return [];
            const text = await res.text();
            return text.split(/\r\n|\n/).map(w => w.trim()).filter(w => w);
        } catch (e) { return []; }
    };

    const [std, pig, eng] = await Promise.all([
        loadFile('日本語一般語.txt'),
        loadFile('豚辞書.txt'),
        loadFile('英語一般語.txt')
    ]);

    dictStandard = std;
    dictPig = pig;
    dictEnglish = eng;

    if(statusEl) {
        let msg = "";
        msg += `日:${std.length}語 `;
        msg += `豚:${pig.length}語 `;
        msg += `英:${eng.length}語`;
        statusEl.innerText = msg;
    }
}

function initGojuuonTable() {
    activeLayout = GOJUON_LAYOUT; // word_data.js で定義
    // word_data.js の initGrid を使用
    if(typeof initGrid === 'function') {
        initGrid('gojuonGrid', 'lineCanvasGojuon', GOJUON_LAYOUT);
    }
}

function searchGojuon() {
    const useStd = document.getElementById('useDictStandard').checked;
    const usePig = document.getElementById('useDictPig').checked;

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    targetWords = [...new Set(targetWords)];

    searchByShapeCommon(selectedCells, targetWords, GOJUON_LAYOUT, 'gojuonResultArea');
}

function resetGojuon() {
    resetSelection(); // word_data.js の関数
}
