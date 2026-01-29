// ... (前半のGAS URLやloadData関数などはそのまま)

// ------------------------------------
// 漢字検索機能
// ------------------------------------
function searchKanji() {
    const input = document.getElementById('kanjiInput').value.trim();
    const sortOption = document.getElementById('sortOption').value;
    const resultArea = document.getElementById('kanjiResultArea');
    const countEl = document.getElementById('kanjiCount');

    resultArea.innerHTML = "";

    // データフィルタリング
    let filteredData = KANJI_DATA;

    if (input) {
        // ★ここが変更点: 漢字(c)そのものか、キーワード配列(k)に含まれるかをチェック
        filteredData = KANJI_DATA.filter(item => {
            return item.c.includes(input) || (item.k && item.k.some(keyword => keyword.includes(input)));
        });
    }

    // ソート処理
    filteredData.sort((a, b) => {
        if (sortOption === "grade_asc") return a.g - b.g;
        if (sortOption === "grade_desc") return b.g - a.g;
        if (sortOption === "stroke_asc") return a.s - b.s;
        if (sortOption === "stroke_desc") return b.s - a.s;
        return 0;
    });

    // 結果表示
    countEl.innerText = `ヒット: ${filteredData.length}件`;

    filteredData.forEach(item => {
        const card = document.createElement('div');
        card.className = 'kanji-card';
        // 画数や部首が0の場合は「-」などを表示
        const strokeDisplay = item.s > 0 ? item.s + '画' : '-';
        
        // ★ここも変更点: 部首表示を削除
        card.innerHTML = `
            <span class="kanji-char">${item.c}</span>
            <div class="kanji-info">
                <span>小${item.g}</span>
                <span>${strokeDisplay}</span>
            </div>
        `;
        resultArea.appendChild(card);
    });

    if (filteredData.length === 0) {
        resultArea.innerHTML = `<div class="no-result">見つかりませんでした</div>`;
    }
}
// ... (後半の語群検索ロジックはそのまま)
