// 編集モードやドラッグ変数は word_data.js で定義済み

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
    // 余白追加
    customLayout.forEach(row => { for(let i=0; i<5; i++) row.push(''); });
    const totalCols = cols + 5;
    for(let i=0; i<5; i++) {
        customLayout.push(new Array(totalCols).fill(''));
    }

    if(currentMode === 'custom') {
        activeLayout = customLayout;
        isEditMode = false;
        if(document.getElementById('editModeCheckbox')) document.getElementById('editModeCheckbox').checked = false;
        updateEditModeStatus();
        resetCustom();
        renderCustomGrid();
    }
}

function addCustomRow() {
    if(!customLayout || customLayout.length === 0) return;
    const cols = customLayout[0].length;
    customLayout.push(new Array(cols).fill(''));
    activeLayout = customLayout;
    renderCustomGrid();
}

function addCustomCol() {
    if(!customLayout || customLayout.length === 0) return;
    customLayout.forEach(row => row.push(''));
    activeLayout = customLayout;
    renderCustomGrid();
}

function toggleEditMode() {
    isEditMode = document.getElementById('editModeCheckbox').checked;
    updateEditModeStatus();
    resetCustom(); 
    renderCustomGrid();
}

function updateEditModeStatus() {
    const status = document.getElementById('editModeStatus');
    const controls = document.getElementById('gojuonControlsCustom');
    const layoutControls = document.getElementById('layoutControls');
    
    if(isEditMode) {
        status.innerText = "現在は「配置編集」モードです。文字をドラッグして移動できます。";
        status.style.color = "#e67e22";
        if(controls) controls.style.display = 'none'; 
        if(layoutControls) layoutControls.style.display = 'flex'; 
    } else {
        status.innerText = "現在は「検索」モードです。マスをクリックして選択してください。";
        status.style.color = "#333";
        if(controls) controls.style.display = 'block'; 
        if(layoutControls) layoutControls.style.display = 'none'; 
    }
}

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
                div.className = 'cell edit-cell';
                if(!char) div.classList.add('empty-placeholder');
                div.draggable = true;
                div.ondragstart = (e) => handleDragStart(e, rIndex, cIndex);
                div.ondragover = (e) => handleDragOver(e);
                div.ondrop = (e) => handleDrop(e, rIndex, cIndex);
            } else {
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

function handleDragStart(e, r, c) {
    if (!customLayout[r][c]) {
        e.preventDefault();
        return;
    }
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

    let targetWords = [];
    if (useStd) targetWords = targetWords.concat(dictStandard);
    if (usePig) targetWords = targetWords.concat(dictPig);
    if (useEng) targetWords = targetWords.concat(dictEnglish);
    targetWords = [...new Set(targetWords)];

    searchByShapeCommon(selectedCells, targetWords, customLayout, 'customResultArea');
}
