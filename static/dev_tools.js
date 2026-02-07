// static/dev_tools.js (v1.1.0)
document.addEventListener("DOMContentLoaded", async () => {
    try {
        const response = await fetch("/api/analytics");
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || "サーバーからのデータ取得に失敗しました。");
        }
        const data = await response.json();

        if (Object.keys(data.by_room_by_user).length === 0) {
            document.getElementById("analytics-container").innerHTML = "<p>まだ分析データがありません。</p>";
            return;
        }

        // グラフ描画関数を削除し、テーブル描画関数のみを呼び出す
        renderAnalyticsTables(data);

    } catch (error) {
        console.error("分析データの取得に失敗:", error);
        document.getElementById("analytics-container").innerHTML = `<p>データの表示に失敗しました: ${error.message}</p>`;
    }
});

/**
 * 3種類の集計テーブルをすべて描画するメイン関数
 */
function renderAnalyticsTables(data) {
    const tableContainer = document.getElementById("analytics-tables-container");
    if (!tableContainer) return;
    tableContainer.innerHTML = ''; // 「読み込み中...」をクリア

    // 1. 全体集計の表
    if (data.overall) {
        tableContainer.innerHTML += '<h2>全体集計</h2>';
        const overallData = data.overall;
        createTable(tableContainer, ['指標', '数値'], [
            ['総参加者数', `${overallData.participants}人`],
            ['総発言数', overallData.posts],
            ['総リアクション数（した数）', Object.values(overallData.reactions_given || {}).reduce((a, b) => a + b, 0)],
            ['総共有ノート編集回数', overallData.note_edits],
            ['総AIファシリテーション利用回数', overallData.facilitator_uses],
            ['総5W1Hフォーム編集回数', overallData.proposal_form_edits || 0],
            ['総進捗確認回数', overallData.progress_check_uses || 0]
        ]);
        
        // 全体のスタンス内訳
        tableContainer.innerHTML += '<h3>スタンス内訳（全体）</h3>';
        const stanceData = Object.entries(overallData.stances || {}).sort((a, b) => b[1] - a[1]); // 多い順
        createTable(tableContainer, ['スタンス', '回数'], stanceData);
    }

    // 2. ルーム別集計の表
    const roomIds = data.by_room ? Object.keys(data.by_room).sort() : [];
    if (roomIds.length > 0) {
        tableContainer.innerHTML += '<h2 style="margin-top: 40px;">ルーム別集計</h2>';
        createTable(tableContainer, 
            ['ルームID', '参加者数', '発言数', 'ノート編集', 'AI利用', '5W1H編集'], // [修正] 追加
            roomIds.map(id => {
                const rData = data.by_room[id];
                return [
                    id, 
                    `${rData.participants}人`, 
                    rData.posts, 
                    rData.note_edits, 
                    rData.facilitator_uses,
                    rData.proposal_form_edits || 0,
                    rData.progress_check_uses || 0
                ];
            })
        );
    }

    // 3. 参加者別データの表（ルームごと）
if (data.by_room_by_user) {
        tableContainer.innerHTML += '<h2 style="margin-top: 40px;">参加者別データ（ルーム別詳細）</h2>';
        
        for (const [roomId, roomData] of Object.entries(data.by_room_by_user)) {
            const users = roomData.users ? Object.keys(roomData.users).sort() : [];
            if (users.length > 0) {
                tableContainer.innerHTML += `<h3>ルーム: ${roomId}</h3>`;
                
                // ヘッダー定義：すべてのスタンス種類を網羅します
                const headers = [
                    '参加者', 
                    '総発言', 
                    '意見', 
                    '質問', 
                    '提案', 
                    '情報提供',      // 追加
                    '進行',          // 追加 (ファシリテーション)
                    'G質問',         // 追加 (Geminiへの質問)
                    'リアクション(した)', 
                    '(された)', 
                    'ノート編集', 
                    'AI利用', 
                    '5W1H編集',
                    '進捗確認'
                ];

                const tableData = users.map(user => {
                    const uData = roomData.users[user] || {};
                    const stances = uData.stances || {};
                    return [
                        user,
                        uData.posts || 0,
                        stances['意見'] || 0,
                        stances['質問'] || 0,
                        stances['提案'] || 0,
                        stances['情報提供'] || 0,          // 追加
                        stances['ファシリテーション'] || 0, // 追加
                        stances['Geminiへの質問'] || 0,    // 追加
                        Object.values(uData.reactions_given || {}).reduce((a, b) => a + b, 0),
                        Object.values(uData.reactions_received || {}).reduce((a, b) => a + b, 0),
                        uData.note_edits || 0,
                        uData.facilitator_uses || 0,
                        uData.proposal_form_edits || 0,
                        uData.progress_check_uses || 0
                    ];
                });
                
                createTable(tableContainer, headers, tableData);
            }
        }
    }
}


/**
 * 汎用テーブル作成ヘルパー関数（これはそのまま残します）
 */
function createTable(parent, headers, rows = []) {
    let tableHTML = '<table><thead><tr>';
    headers.forEach(h => tableHTML += `<th>${h}</th>`);
    tableHTML += '</tr></thead><tbody>';
    rows.forEach(rowData => {
        tableHTML += '<tr>';
        rowData.forEach(cellData => tableHTML += `<td>${cellData}</td>`);
        tableHTML += '</tr>';
    });
    tableHTML += '</tbody></table>';
    parent.innerHTML += tableHTML;
}