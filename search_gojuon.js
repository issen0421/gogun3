// レイアウト定義 (11列 x 5行, あ行を右端に)
const GOJUON_LAYOUT = [
    ['ん','わ','ら','や','ま','は','な','た','さ','か','あ'],
    ['','','り','','み','ひ','に','ち','し','き','い'],
    ['','','る','ゆ','む','ふ','ぬ','つ','す','く','う'],
    ['','','れ','','め','へ','ね','て','せ','け','え'],
    ['','を','ろ','よ','も','ほ','の','と','そ','こ','お']
];

// 辞書読み込み
async function loadAllDictionaries() {
    const statusEl = document.getElementById('txtStatus');
    statusEl.innerText = "辞書読み込み中...";
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

    let msg = "";
    msg += `日:${std.length}語 `;
    msg += `豚:${pig.length}語 `;
    msg += `英:${eng.length}語`;
    statusEl.innerText = msg;
}

// グリッド生成（共通）
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
                div.onclick = () => onGojuonCellClick(div, rIndex, cIndex, char);
            }
            grid.appendChild(div);
        });
    });
    
    // Canvas初期化
    setTimeout(() => {
        const canvas = document.getElementById(canvasId);
        if(canvas) {
            canvas.width = grid.offsetWidth;
            canvas.height = grid.offsetHeight;
        }
    }, 100);
}

// 五十音表初期化
function initGojuuonTable() {
    // 最初は五十音レイアウト
    activeLayout = GOJUON_LAYOUT;
    initGrid('gojuonGrid', 'lineCanvasGojuon', GOJUON_LAYOUT);
}

// セルクリック（五十音表）
function onGojuonCellClick(div, r, c, char) {
    // 五十音モードでなければ無視
    if (currentMode !== 'gojuon') return;

    if (selectedCells.length > 0 && selectedCells[selectedCells.length-1].char === char) {
        selectedCells.pop();
        div.classList.remove('selected');
    } else {
        selectedCells.push({char: char, r: r, c: c});
        div.classList.add('selected');
    }
    updateDisplay();
    drawLinesCommon('lineCanvasGojuon', 'gojuonGrid', selectedCells);
    searchGojuon();
}

function resetGojuon() {
    selectedCells = [];
    document.querySelectorAll('#gojuonGrid .cell').forEach(c => c.classList.remove('selected'));
    updateDisplay();
    drawLinesCommon('lineCanvasGojuon', 'gojuonGrid', selectedCells);
    document.getElementById('gojuonResultArea').innerHTML = "";
}

function updateDisplay() {
    const text = selectedCells.map(s => s.char).join(' → ');
    const displayId = (currentMode === 'gojuon') ? 'gojuonSelectDisplay' : 'customSelectDisplay';
    const displayEl = document.getElementById(displayId);
    if(displayEl) displayEl.innerText = "選択: " + (text || "なし");
}

function searchGojuon() {
    const useStd = document.getElementById('useDictStandard').checked;
    const usePig = document.getElementById('useDictPig').checked;

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    targetWords = [...new Set(targetWords)];

    // 共通検索ロジック呼び出し
    searchByShapeCommon(selectedCells, targetWords, GOJUON_LAYOUT, 'gojuonResultArea');
}
