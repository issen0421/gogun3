// レイアウト定義 (11列 x 5行, あ行を右端に)
const GOJUON_LAYOUT = [
    ['ん','わ','ら','や','ま','は','な','た','さ','か','あ'],
    ['','','り','','み','ひ','に','ち','し','き','い'],
    ['','','る','ゆ','む','ふ','ぬ','つ','す','く','う'],
    ['','','れ','','め','へ','ね','て','せ','け','え'],
    ['','を','ろ','よ','も','ほ','の','と','そ','こ','お']
];

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
    activeLayout = GOJUON_LAYOUT;
    initGrid('gojuonGrid', 'lineCanvasGojuon', GOJUON_LAYOUT);
}

// グリッド生成（五十音・カスタム共通初期化処理）
function initGrid(gridId, canvasId, layout) {
    const grid = document.getElementById(gridId);
    if(!grid) return;
    grid.innerHTML = "";
    
    const cols = layout[0].length;
    grid.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
    grid.style.gridTemplateRows = `repeat(${layout.length}, 40px)`;

    layout.forEach((row, rIndex) => {
        row.forEach((char, cIndex) => {
            const div = document.createElement('div');
            div.className = char ? 'cell' : 'cell empty';
            div.innerText = char;
            div.dataset.r = rIndex;
            div.dataset.c = cIndex;
            div.dataset.char = char;
            if (char) {
                // word_data.js の共通関数を呼ぶ
                div.onclick = () => onCellClick(div, rIndex, cIndex, char);
            }
            grid.appendChild(div);
        });
    });
    
    setTimeout(() => {
        const canvas = document.getElementById(canvasId);
        if(canvas) {
            canvas.width = grid.offsetWidth;
            canvas.height = grid.offsetHeight;
        }
    }, 100);
}

// 五十音表での検索（イベントハンドラから呼ばれる）
function searchGojuon() {
    const useStd = document.getElementById('useDictStandard').checked;
    const usePig = document.getElementById('useDictPig').checked;

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    targetWords = [...new Set(targetWords)];

    searchByShapeCommon(selectedCells, targetWords, GOJUON_LAYOUT, 'gojuonResultArea');
}

// ユーザーがトリガーする形状変更イベント用
function searchByShape() {
    if(currentMode === 'gojuon') searchGojuon();
    else if(currentMode === 'custom') searchCustom();
}

// html側の古い関数名対応（念のため）
function resetGojuon() {
    resetSelection();
}
