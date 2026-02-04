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
        } catch (e) { 
            console.warn(`Failed to load ${filename}`);
            return []; 
        }
    };

    // ★修正: イラスト辞書Lv.1〜3を追加で読み込む
    const [std, pig, eng, ill1, ill2, ill3] = await Promise.all([
        loadFile('日本語一般語.txt'),
        loadFile('豚辞書.txt'),
        loadFile('英語一般語.txt'),
        loadFile('イラスト辞書Lv.1.txt'),
        loadFile('イラスト辞書Lv.2.txt'),
        loadFile('イラスト辞書Lv.3.txt')
    ]);

    dictStandard = std;
    dictPig = pig;
    dictEnglish = eng;
    dictIllustLv1 = ill1;
    dictIllustLv2 = ill2;
    dictIllustLv3 = ill3;

    if(statusEl) {
        let msg = "";
        msg += `日:${std.length} `;
        msg += `豚:${pig.length} `;
        msg += `英:${eng.length} `;
        // ステータス表示
        msg += `画1:${ill1.length} `;
        msg += `画2:${ill2.length} `;
        msg += `画3:${ill3.length} `;
        statusEl.innerText = msg + "読込完了";
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
    // ★追加: イラスト辞書のチェック状態を取得
    const useIll1 = document.getElementById('useDictIllustLv1')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3')?.checked;

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    
    // ★追加: ターゲットに追加
    if (useIll1) targetWords = targetWords.concat(dictIllustLv1);
    if (useIll2) targetWords = targetWords.concat(dictIllustLv2);
    if (useIll3) targetWords = targetWords.concat(dictIllustLv3);

    targetWords = [...new Set(targetWords)];

    searchByShapeCommon(selectedCells, targetWords, GOJUON_LAYOUT, 'gojuonResultArea');
}

// ユーザーがトリガーする形状変更イベント用
function searchByShape() {
    if(currentMode === 'gojuon') searchGojuon();
    else if(currentMode === 'custom') searchCustom();
}

// html側の古い関数名対応
function resetGojuon() {
    if(typeof resetSelection === 'function') resetSelection();
}
