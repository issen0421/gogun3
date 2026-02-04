// 編集モードフラグ
let isEditMode = false;
let dragSrc = null; // DnD用

function createCustomTable() {
    const text = document.getElementById('customInputText').value.replace(/\s/g, '').toUpperCase();
    const cols = parseInt(document.getElementById('customCols').value, 10);
    if(!text || cols < 1) return;

    customLayout = [];
    let currentRow = [];
    for (let i = 0; i < text.length; i++) {
        currentRow.push(text[i]);
        if (currentRow.length === cols) {
            customLayout.push(currentRow);
            currentRow = [];
        }
    }
    if (currentRow.length > 0) {
        while(currentRow.length < cols) currentRow.push('');
        customLayout.push(currentRow);
    }

    // 自由配置用に空行を追加（余裕をもたせる）
    for(let i=0; i<2; i++) {
        let emptyRow = new Array(cols).fill('');
        customLayout.push(emptyRow);
    }

    // 作成したらアクティブレイアウト更新
    if(currentMode === 'custom') {
        activeLayout = customLayout;
        // モードリセット
        isEditMode = false;
        if(document.getElementById('editModeCheckbox')) document.getElementById('editModeCheckbox').checked = false;
        updateEditModeStatus();
        
        resetCustom();
        renderCustomGrid();
    }
}

// 編集モード切替
function toggleEditMode() {
    isEditMode = document.getElementById('editModeCheckbox').checked;
    updateEditModeStatus();
    resetCustom(); // 選択解除
    renderCustomGrid(); // 再描画
}

function updateEditModeStatus() {
    const status = document.getElementById('editModeStatus');
    const controls = document.getElementById('gojuonControlsCustom');
    
    if(isEditMode) {
        status.innerText = "現在は「配置編集」モードです。文字をドラッグして移動できます。";
        status.style.color = "#e67e22";
        if(controls) controls.style.display = 'none'; // 検索UIを隠す
    } else {
        status.innerText = "現在は「検索」モードです。マスをクリックして選択してください。";
        status.style.color = "#333";
        if(controls) controls.style.display = 'block'; // 検索UIを表示
    }
}

// カスタム専用グリッド描画（DnD対応）
function renderCustomGrid() {
    const grid = document.getElementById('customGrid');
    if(!grid) return;
    
    grid.innerHTML = "";
    if(!customLayout || customLayout.length === 0) return;

    const cols = customLayout[0].length;
    grid.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
    grid.style.gridTemplateRows = `repeat(${customLayout.length}, 40px)`;

    customLayout.forEach((row, rIndex) => {
        row.forEach((char, cIndex) => {
            const div = document.createElement('div');
            
            if (isEditMode) {
                // 編集モード
                div.className = 'cell edit-cell';
                if(!char) div.classList.add('empty-placeholder');
                
                div.draggable = !!char; // 文字があるならドラッグ可
                
                // DnDイベント
                div.ondragstart = (e) => handleDragStart(e, rIndex, cIndex);
                div.ondragover = (e) => handleDragOver(e);
                div.ondrop = (e) => handleDrop(e, rIndex, cIndex);
                
            } else {
                // 検索モード
                div.className = char ? 'cell' : 'cell empty';
                if (char) {
                    div.onclick = () => onCustomCellClick(div, rIndex, cIndex, char);
                }
            }
            
            div.innerText = char;
            div.dataset.r = rIndex;
            div.dataset.c = cIndex;
            div.dataset.char = char;
            
            grid.appendChild(div);
        });
    });
    
    setTimeout(() => {
        const canvas = document.getElementById('lineCanvasCustom');
        if(canvas) {
            canvas.width = grid.offsetWidth;
            canvas.height = grid.offsetHeight;
        }
    }, 50);
}

// --- DnD Handlers ---
function handleDragStart(e, r, c) {
    dragSrc = { r: r, c: c, char: customLayout[r][c] };
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', customLayout[r][c]);
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDrop(e, r, c) {
    if (e.stopPropagation) e.stopPropagation();
    
    if (!dragSrc || (dragSrc.r === r && dragSrc.c === c)) return false;
    
    const targetChar = customLayout[r][c];
    const srcChar = dragSrc.char;
    
    customLayout[r][c] = srcChar;
    customLayout[dragSrc.r][dragSrc.c] = targetChar;
    
    activeLayout = customLayout;
    renderCustomGrid();
    
    return false;
}

function onCustomCellClick(div, r, c, char) {
    if(typeof onCellClick === 'function') {
        onCellClick(div, r, c, char);
    }
}

function resetCustom() {
    if(typeof resetSelection === 'function') resetSelection();
}

function searchCustom() {
    const useStd = document.getElementById('useDictStandard_custom').checked;
    const usePig = document.getElementById('useDictPig_custom').checked;
    const useEng = document.getElementById('useDictEnglish_custom').checked;
    // ★追加: イラスト辞書
    const useIll1 = document.getElementById('useDictIllustLv1_custom')?.checked;
    const useIll2 = document.getElementById('useDictIllustLv2_custom')?.checked;
    const useIll3 = document.getElementById('useDictIllustLv3_custom')?.checked;

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    if (useEng) targetWords = targetWords.concat(dictEnglish);
    
    if (useIll1) targetWords = targetWords.concat(dictIllustLv1);
    if (useIll2) targetWords = targetWords.concat(dictIllustLv2);
    if (useIll3) targetWords = targetWords.concat(dictIllustLv3);

    targetWords = [...new Set(targetWords)];

    searchByShapeCommon(selectedCells, targetWords, customLayout, 'customResultArea');
}
