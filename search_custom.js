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

    // カスタムモードに切り替え
    switchTab('custom');
    
    activeLayout = customLayout;
    resetSelection();
    
    // search_gojuon.js の initGrid を利用
    initGrid('customGrid', 'lineCanvasCustom', customLayout);
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

// html側の古い関数名対応
function resetCustom() {
    resetSelection();
}
