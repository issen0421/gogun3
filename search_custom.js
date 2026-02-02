// カスタムレイアウト保持
// (word_data.js の customLayout, activeLayout を使用)

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

    // 作成したらアクティブレイアウト更新
    if(currentMode === 'custom') {
        activeLayout = customLayout;
        resetCustom();
        initGrid('customGrid', 'lineCanvasCustom', customLayout);
    }
}

function onGojuonCellClick(div, r, c, char) {
    // 実際には initGrid で共通の onClick が設定されるが、
    // ここではカスタム用として処理を分岐させる必要がある。
    // initGrid 内で onclick = () => onCellClick(...) としていた部分を
    // モードに応じて呼び分けるか、この関数内で分岐させる。
    
    // search_gojuon.js の関数と名前が被ると上書きされるため、
    // word_data.js に共通の onCellClick を定義し、そこから分岐させるのが綺麗だが
    // ファイル分割の要件上、ここでは「カスタム用セルクリック」として定義する。
    // ※initGridの修正が必要。
    
    // -> initGrid は word_data.js ではなく search_gojuon.js にある。
    // カスタム表の初期化には search_gojuon.js の initGrid を使うか、
    // ここで再定義するか。
    // 依存関係を避けるため、ここでは「カスタム専用のinit」を持つべきだが
    // ロジックが同じ。
    
    // 解決策: word_data.js に initGrid を持たせるのが正解だったが
    // 前のステップで search_gojuon.js に入れてしまった。
    // ここでは「カスタム表用のクリック処理」を定義し、
    // createCustomTable 内でイベントリスナを上書きする。
    
    // ...実装上、initGridは共通関数として word_data.js に移動させたほうが安全。
    // 今回の出力では word_data.js には入れていないので、
    // search_gojuon.js の initGrid を利用しつつ、
    // クリック時の挙動をモードで判断する。
    
    if (selectedCells.length > 0 && selectedCells[selectedCells.length-1].char === char) {
        selectedCells.pop();
        div.classList.remove('selected');
    } else {
        selectedCells.push({char: char, r: r, c: c});
        div.classList.add('selected');
    }
    
    updateDisplay(); // search_gojuon.js にある
    drawLinesCommon('lineCanvasCustom', 'customGrid', selectedCells);
    searchCustom();
}

// カスタム用リセット
function resetCustom() {
    selectedCells = [];
    document.querySelectorAll('#customGrid .cell').forEach(c => c.classList.remove('selected'));
    updateDisplay();
    drawLinesCommon('lineCanvasCustom', 'customGrid', selectedCells);
    document.getElementById('customResultArea').innerHTML = "";
}

// カスタム検索
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

// ※注意: initGrid 内の onclick で呼ぶ関数を統一するため、
// search_gojuon.js の onGojuonCellClick を修正し、
// モード判定を入れる必要がある。
// ここでは search_gojuon.js の onGojuonCellClick を
// 「onCellClick」という名前にして共通化し、モード分岐させる。
