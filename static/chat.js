// static/chat.js

(() => {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${protocol}://${window.location.host}/ws/${roomId}/${username}`);

  const messagesElem = document.getElementById("messages");
  const proposalListElem = document.getElementById("proposal-list");
  const inputElem = document.getElementById("message-input");
  const sendBtn = document.getElementById("send-btn");
  const fileUpload = document.getElementById("file-upload");

  const q6Checkboxes = document.querySelectorAll('.q6-check');
  const q6OtherText = document.getElementById('q6-other-text');
  const q6HiddenInput = document.getElementById('proposal-q6');

  const q5Parts = document.querySelectorAll('.q5-part');
  const q5HiddenInput = document.getElementById('proposal-q5');

  const q5Implementer = document.getElementById('q5-implementer');
  const q5Target = document.getElementById('q5-target');
  const q5Stakeholder = document.getElementById('q5-stakeholder');

  let currentStance = null;
  const stanceButtons = document.querySelectorAll("#stance-button-group .stance-btn");

  let allProposals = [];
  let currentProposalIndex = 0;
  const defaultProposal = { q1: "", q2: "", q3: "", q4: "", q5: "", q6: "", q7: "" };
  let proposalTypingTimer;

  function checkSendButtonState() {
      const message = inputElem.value.trim();
      const fileSelected = fileUpload.files.length > 0;
      // スタンスが選択されており、かつメッセージ入力かファイル選択がある場合に有効
      if (currentStance && (message || fileSelected)) {
          sendBtn.disabled = false;
      } else {
          sendBtn.disabled = true;
      }
  }

  stanceButtons.forEach(button => {
      button.addEventListener("click", () => {
          // すべてのボタンから active クラスを削除
          stanceButtons.forEach(btn => {
              btn.classList.remove("active", "btn-primary"); // [変更] "active" と "btn-primary" を削除
              btn.classList.add("btn-outline-secondary"); // [追加] デフォルトスタイルに戻す
          });
          // クリックされたボタンに active クラスを追加
          button.classList.add("active", "btn-primary"); // [変更] "active" と "btn-primary" を追加
          button.classList.remove("btn-outline-secondary");
          // 現在のスタンスを更新
          currentStance = button.dataset.stance;
          checkSendButtonState();
      });
  });

  inputElem.addEventListener('input', checkSendButtonState);
  fileUpload.addEventListener('change', checkSendButtonState);

  sendBtn.disabled = true;

  function resizeTextarea() {
    // 一旦高さをリセットすることで、行を削除したときに縮むようになる
    inputElem.style.height = 'auto'; 
    // スクロールバーを含まない実際のコンテンツの高さを設定
    inputElem.style.height = (inputElem.scrollHeight) + 'px'; 
  }
  // 入力があるたびに高さを調整
  inputElem.addEventListener('input', resizeTextarea);


  const finishBtn = document.getElementById("finish-btn");
  const fileNameDisplay = document.getElementById("file-name");

  const progressCheckBtn = document.getElementById("progress-check-btn");
  const facilitateBtn = document.getElementById("facilitate-btn");
  const progressModal = document.getElementById("progress-modal");
  const progressContent = document.getElementById("progress-content");
  const progressCloseBtn = document.getElementById("progress-close-btn"); 

  const replyingBanner = document.getElementById('replying-to-banner');
  const replyingText = document.getElementById('replying-to-text');
  const cancelReplyBtn = document.getElementById('cancel-reply-btn');
  let replyTarget = null; // 返信先のメッセージ情報を保持

  const noteModal = document.getElementById("note-modal");
  const sharedNoteBtn = document.getElementById("shared-note-btn");
  const noteCloseBtn = document.getElementById("note-close-btn");
  const noteTextarea = document.getElementById("shared-note-textarea");
  let noteTypingTimer;

  const participantsModal = document.getElementById('participants-modal');
  const participantsBtn = document.getElementById('participants-btn');
  const participantsCloseBtn = document.getElementById('participants-close-btn');
  const participantsList = document.getElementById('participants-list');

  const proposalFormModal = document.getElementById("proposal-form-modal");
  const proposalFormCloseBtn = document.getElementById("proposal-form-close-btn");
  const proposalFormBtn = document.getElementById("proposal-form-btn"); // 浮遊ボタン
  
  // フォーム内部の要素
  const proposalPrevBtn = document.getElementById("proposal-prev-btn");
  const proposalNextBtn = document.getElementById("proposal-next-btn");
  const proposalAddBtn = document.getElementById("proposal-add-btn");
  const proposalPageIndicator = document.getElementById("proposal-page-indicator");
  const proposalFormInputs = document.querySelectorAll("#proposal-form-content [data-key]");
  const postProposalToChatBtn = document.getElementById("post-proposal-to-chat-btn");

function addProposalToList(message) {
    const { message_id, username: fromUser, content } = message;

    // 既にリストにないか確認 (履歴読み込みで二重追加を防ぐ)
    if (proposalListElem.querySelector(`[data-proposal-message-id="${message_id}"]`)) {
        return;
    }

    const li = document.createElement("li");
    li.dataset.proposalMessageId = message_id;
    li.className = 'proposal-item'; // CSSでスタイルを当てる

    // 提案のヘッダー (誰から)
    const header = document.createElement("div");
    header.className = 'proposal-header';
    header.innerHTML = `<strong>${fromUser === username ? "あなた" : fromUser}</strong>さんからの提案:`;
    li.appendChild(header);

    // 提案内容
    const contentDiv = document.createElement("div");
    contentDiv.className = 'proposal-content';
    contentDiv.textContent = content;
    li.appendChild(contentDiv);

    // ボタンコンテナ
    const controlsDiv = document.createElement("div");
    controlsDiv.className = 'proposal-controls';

    // 返信ボタン (既存の setReplyMode 関数を再利用)
    const replyBtn = document.createElement('button');
    replyBtn.className = 'proposal-reply-btn';
    replyBtn.textContent = '↪ 返信';
    replyBtn.onclick = () => setReplyMode(message);
    controlsDiv.appendChild(replyBtn);

    // 解決ボタン
    const resolveBtn = document.createElement('button');
    resolveBtn.className = 'proposal-resolve-btn';
    resolveBtn.textContent = '✅ 解決';
    resolveBtn.onclick = () => {
        if (confirm('この提案を「解決済み」にしますか？\n（一覧から非表示になりますが、チャット履歴には残ります）')) {
            ws.send(JSON.stringify({
                type: 'resolve_proposal',
                message_id: message_id
            }));
        }
    };
    controlsDiv.appendChild(resolveBtn);

    li.appendChild(controlsDiv);
    proposalListElem.appendChild(li);
}

function addSystemMessage(content) {
    const li = document.createElement("li");
    li.classList.add("system-message"); // 専用のCSSクラスを割り当て
    li.textContent = content;
    messagesElem.appendChild(li);
    messagesElem.scrollTop = messagesElem.scrollHeight;
}

function addMessage(message, isHistory = false) {
    const { message_id, username: fromUser, content, stance, file_url, original_filename, reactions, reply_to, is_resolved } = message;

    // --- 1. 吹き出し本体（li要素）を作成 ---
    const li = document.createElement("li");
    li.classList.add("message");
    
    // (吹き出しの内部構造を作成するコード ... ここは変更ありません)
    if (reply_to) {
        const quoteContainer = document.createElement('div');
        quoteContainer.className = 'reply-quote-container';
        quoteContainer.innerHTML = `
            <div class="reply-quote-user">↪ ${reply_to.username}への返信</div>
            <div class="reply-quote-content">${reply_to.content.substring(0, 50)}${reply_to.content.length > 50 ? '...' : ''}</div>
        `;
        li.appendChild(quoteContainer);
    }
    const messageBody = document.createElement('div');
    messageBody.className = 'message-body';
    const stanceSpan = document.createElement("span");
    stanceSpan.classList.add("stance-label");
    const stanceMap = { "意見": "opinion", "質問": "question", "ファシリテーション": "facilitation", "情報提供": "info-provide", "Geminiへの質問": "gemini-question", "Geminiからの回答": "gemini-answer", "提案": "proposal" };
    if (stanceMap[stance]) stanceSpan.classList.add(`stance-${stanceMap[stance]}`);
    stanceSpan.textContent = stance;
    messageBody.appendChild(stanceSpan);
    const contentDiv = document.createElement("div");
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    messageBody.appendChild(contentDiv);
    if (file_url) {
        const fileLink = document.createElement("a");
        fileLink.href = file_url;
        fileLink.target = "_blank";
        fileLink.className = 'file-link';
       fileLink.textContent = `📎 ファイル: ${original_filename || '開く'}`;
        messageBody.appendChild(document.createElement("br"));
        messageBody.appendChild(fileLink);
    }
    li.appendChild(messageBody);
    const messageFooter = document.createElement('div');
    messageFooter.className = 'message-footer';
    const reactionContainer = document.createElement('div');
    reactionContainer.className = 'reaction-buttons-container';
    
    // リアクションの種類定義
    const reactionTypes = {'agree': '👍', 'partial': '🤔', 'disagree': '👎'};
    
    for (const [type, emoji] of Object.entries(reactionTypes)) {
        const btn = document.createElement('button');
        btn.className = 'reaction-btn';
        btn.dataset.reactionType = type;
        
        // アイコンの設定
        btn.textContent = emoji;
        
        // カウント数の表示
        const countSpan = document.createElement('span');
        countSpan.className = 'reaction-count';
        // reactionsデータがない場合やカウントが0の場合のハンドリング
        countSpan.textContent = (reactions && reactions[type]) ? reactions[type].length : 0;
        
        btn.appendChild(countSpan);
        
        // クリックイベントの設定
        btn.onclick = () => { 
            ws.send(JSON.stringify({ type: 'reaction', message_id, reaction: type })); 
        };
        
        reactionContainer.appendChild(btn);
    }
    messageFooter.appendChild(reactionContainer);
    const userDiv = document.createElement("div");
    userDiv.className = 'message-meta';
    if (fromUser === 'Gemini') {
      userDiv.innerHTML = `<span>🤖 Gemini</span>`;
    } else {
      userDiv.innerHTML = `<span>${fromUser === username ? "あなた" : fromUser}</span>`;
    }
    const replyBtn = document.createElement('button');
    replyBtn.className = 'reply-btn';
    replyBtn.textContent = '返信';
    replyBtn.onclick = () => setReplyMode(message);
    userDiv.appendChild(replyBtn);
    messageFooter.appendChild(userDiv);
    li.appendChild(messageFooter);
    
    // --- 2. 最終的な表示要素を決定（ここが重要な変更点） ---
    let finalElementToAppend;

    if (fromUser === 'Gemini' || fromUser !== username) {
        // 自分以外のメッセージは、従来通りli要素をそのまま使う
        if (fromUser === 'Gemini') li.classList.add("gemini");
        else li.classList.add("other");
        li.dataset.messageId = message_id;
        finalElementToAppend = li;
    } else {
        // ★自分のメッセージは、ボタンと吹き出しをdivで囲んだものを最終的な要素とする
        li.classList.add("self");
        
        const wrapper = document.createElement('div');
        wrapper.className = 'message-wrapper self';
        wrapper.dataset.messageId = message_id;

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-msg-btn';
        deleteBtn.textContent = '🗑️';
        deleteBtn.onclick = () => {
            if (confirm('このメッセージを削除しますか？')) {
                ws.send(JSON.stringify({ type: 'delete_message', message_id: message_id }));
            }
        };
        
        wrapper.appendChild(deleteBtn);
        wrapper.appendChild(li);
        finalElementToAppend = wrapper;
    }

    // --- 3. 最終的な要素を画面に追加 ---
    if (isHistory) {
      const divider = document.getElementById("history-divider");
      if (divider) divider.insertAdjacentElement("beforebegin", finalElementToAppend);
      else messagesElem.appendChild(finalElementToAppend);
    } else {
      messagesElem.appendChild(finalElementToAppend);
    }

    messagesElem.scrollTop = messagesElem.scrollHeight;

    if (stance === "提案" && !is_resolved) {
        addProposalToList(message);
    }
}

  function setReplyMode(message) {
      replyTarget = message;
      replyingText.textContent = `↪ ${message.username}に返信中...`;
      replyingBanner.style.display = 'flex';
      inputElem.focus();
  }

  function cancelReplyMode() {
      replyTarget = null;
      replyingBanner.style.display = 'none';
  }

  cancelReplyBtn.addEventListener('click', cancelReplyMode);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch(data.type) {
        case "message":
        case "gemini_response":
            addMessage(data);
            // Geminiからの応答が来たらボタンを再度有効化
            if (sendBtn.disabled) {
                sendBtn.disabled = false;
                sendBtn.textContent = "送信";
            }
            break;
        case "history":
            const divider = document.getElementById("history-divider");
            if (divider && divider.style.display === "none") {
              divider.style.display = "block";
            }
            addMessage(data, true);
            break;
        case "reaction_update":
            const msgElement = messagesElem.querySelector(`[data-message-id="${data.message_id}"]`);
            if (msgElement) {
                for (const [type, count] of Object.entries(data.reactions)) {
                    const countSpan = msgElement.querySelector(`.reaction-btn[data-reaction-type="${type}"] .reaction-count`);
                    if (countSpan) countSpan.textContent = count;
                }
            }
            break;

        case "message_deleted":
            const elementToDelete = messagesElem.querySelector(`[data-message-id="${data.message_id}"]`);
            if (elementToDelete) {
                elementToDelete.remove();
            }
            break;

        case "proposal_resolved":
            const proposalIdToRemove = data.message_id;
            const proposalElementToRemove = proposalListElem.querySelector(`[data-proposal-message-id="${proposalIdToRemove}"]`);
            if (proposalElementToRemove) {
                proposalElementToRemove.remove();
            }
            break;

        case "system_message":
            addSystemMessage(data.content);
            break;

        case "note_initial_state":
            noteTextarea.value = data.content;
            break;
        case "note_update":
            // 自分からの更新は無視することで、カーソルが飛ぶ問題を防ぐ
            if (data.sender === username) {
                // 何もしない
            } else if (noteTextarea.value !== data.content) {
                // 他のユーザーからの更新のみテキストエリアに反映する
                noteTextarea.value = data.content;
            }
            break;
        
        case "proposal_form_initial_state":
            allProposals = data.proposals || [];
            currentProposalIndex = 0;
            // フォームの表示を更新
            renderProposalForm(); 
            break;

        case "proposal_form_update":
            // 自分からの更新は無視する（カーソル飛び防止）
            if (data.sender === username) {
                // 何もしない
                break;
            }
            // 他のユーザーからの更新を反映
            allProposals = data.proposals || [];
            
            // 現在のインデックスがリストの範囲外になった場合は調整
            if (currentProposalIndex >= allProposals.length) {
                currentProposalIndex = allProposals.length - 1;
            }
            
            // フォームの表示を更新
            renderProposalForm();
            break;

        case "summary":
            const summaryLi = document.createElement("li");
            summaryLi.classList.add("summary");
            summaryLi.innerHTML = `<h3>=== 議論終了 ===</h3><div class="summary-content">${marked.parse(data.content)}</div>`;

            if (data.excel_url) {
                const excelLink = document.createElement("a");
                excelLink.href = data.excel_url;
                excelLink.target = "_blank";
                excelLink.textContent = "📊 議事録をExcelでダウンロード";
                excelLink.className = 'summary-pdf-link'; 
                excelLink.style.backgroundColor = "#217346"; // Excel色の緑
                summaryLi.appendChild(excelLink);
            }

            messagesElem.appendChild(summaryLi);
            messagesElem.scrollTop = messagesElem.scrollHeight;
            break;

        case "participant_update":
            participantsList.innerHTML = ''; // リストを一旦空にする
            data.users.sort().forEach(user => {
                const li = document.createElement('li');
                li.textContent = user;
                if (user === username) {
                    li.textContent += ' (あなた)';
                    li.style.fontWeight = 'bold';
                }
                participantsList.appendChild(li);
            });
            break;
    }
  };

  ws.onclose = () => {
    console.log("WebSocket切断");
    sendBtn.disabled = true;
    finishBtn.disabled = true;
    inputElem.disabled = true;
    stanceButtons.forEach(btn => btn.disabled = true);
  };

  sendBtn.addEventListener("click", async () => {
    const message = inputElem.value.trim();
    const stance = currentStance;
    const file = fileUpload.files.length > 0 ? fileUpload.files[0] : null;

    if (!currentStance || (!message && !file)) return;
    
    sendBtn.disabled = true;
    if (stance === "Geminiへの質問") {
        sendBtn.textContent = "回答待…";
    } else {
        sendBtn.textContent = "送信中…";
    }

    let uploadedFileInfo = {};

    if (file) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      // fetchを使ってサーバーのアップロード用エンドポイントを呼び出す
      const response = await fetch("/upload_file/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        // アップロードに失敗した場合
        const errorData = await response.json();
        throw new Error(errorData.message || "サーバーでエラーが発生しました。");
      }
      
      // サーバーからの応答（ファイルURLなど）を変数に格納
      uploadedFileInfo = await response.json();

    } catch (error) {
      console.error("File upload error:", error);
      alert(`ファイルのアップロードに失敗しました: ${error.message}`);
      sendBtn.disabled = false; // ボタンを元に戻す
      sendBtn.textContent = "送信";
      return; // 処理を中断
    }
  }

  const payload = {
    type: "message",
    content: message,
    stance: stance,
    reply_to_id: replyTarget ? replyTarget.message_id : null,
    file_url: uploadedFileInfo.file_url || null,
    original_filename: uploadedFileInfo.original_filename || null,
    gemini_file_ref: uploadedFileInfo.gemini_file_ref || null,
  };

    ws.send(JSON.stringify(payload));

    inputElem.value = "";
    fileUpload.value = "";
    inputElem.style.height = 'auto';
    fileNameDisplay.textContent = "";
    cancelReplyMode();

    stanceButtons.forEach(btn => {
        btn.classList.remove("active", "btn-primary");
        btn.classList.add("btn-outline-secondary");
    });
    
    currentStance = null;
    checkSendButtonState();

  });

  finishBtn.addEventListener("click", () => {
    if (!confirm("議論を終了しますか？ 全員が終了すると議事録が表示されます。")) return;
    ws.send(JSON.stringify({ type: "finish" }));
  });

  const backBtn = document.getElementById("back-to-roomlist-btn");

  backBtn.addEventListener("click", () => {
    if (confirm("ルームを退出しますか？")) {
      ws.close();
      window.location.href = "/";
    }
  });

 function openModal() {
    progressModal.style.display = "block";
  }

  function closeModal() {
    progressModal.style.display = "none";
  }

  progressCloseBtn.addEventListener('click', closeModal);

  window.addEventListener('click', (event) => {
    if (event.target === progressModal) {
      closeModal();
    }
  });

  participantsBtn.addEventListener('click', () => {
    participantsModal.style.display = 'block';
  });

  participantsCloseBtn.addEventListener('click', () => {
    participantsModal.style.display = 'none';
  });

  window.addEventListener('click', (event) => {
    if (event.target === participantsModal) {
      participantsModal.style.display = 'none';
    }
  });

  progressCheckBtn.addEventListener("click", async () => {
    progressContent.innerHTML = "<p>分析中...</p>";
    openModal();

    try {
      const response = await fetch(`/check_progress/${roomId}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username })
      });

      if (!response.ok) {
        throw new Error(`サーバーエラー: ${response.status}`);
      }
      const data = await response.json();
      
      progressContent.innerHTML = marked.parse(data.progress);

    } catch (error) {
      console.error("進行状況の取得に失敗:", error);
      progressContent.textContent = "エラー: 進行状況の取得に失敗しました。";
    }
  });

// --- 共有ノート関連のイベントリスナー ---
  sharedNoteBtn.addEventListener('click', () => {
    noteModal.style.display = "block";
  });
  noteCloseBtn.addEventListener('click', () => {
    noteModal.style.display = "none";
  });
  window.addEventListener('click', (event) => {
    // 他のモーダルと区別
    if (event.target === noteModal) {
        noteModal.style.display = "none";
    }
  });

  noteTextarea.addEventListener('input', () => {
      clearTimeout(noteTypingTimer);
      noteTypingTimer = setTimeout(() => {
          ws.send(JSON.stringify({
              type: 'note_update',
              content: noteTextarea.value
          }));
      }, 500); // ユーザーの入力が500ms止まったら送信
  });

  proposalFormBtn.addEventListener('click', () => {
    proposalFormModal.style.display = "block";
  });

  // モーダルを閉じる（閉じるボタン）
  proposalFormCloseBtn.addEventListener('click', () => {
    proposalFormModal.style.display = "none";
  });

  // モーダルを閉じる（外側クリック）
  window.addEventListener('click', (event) => {
    if (event.target === proposalFormModal) {
        proposalFormModal.style.display = "none";
    }
  });

  // 「前の提案」ボタン
  proposalPrevBtn.addEventListener('click', () => {
    if (currentProposalIndex > 0) {
        currentProposalIndex--;
        renderProposalForm();
    }
  });

  // 「次の提案」ボタン
  proposalNextBtn.addEventListener('click', () => {
    if (currentProposalIndex < allProposals.length - 1) {
        currentProposalIndex++;
        renderProposalForm();
    }
  });

  // 「新しい提案を追加」ボタン
  proposalAddBtn.addEventListener('click', () => {
    // 新しい空の提案オブジェクトを追加
    allProposals.push({ ...defaultProposal });
    // 新しく追加した提案（＝リストの末尾）に移動
    currentProposalIndex = allProposals.length - 1;
    // フォームを再描画
    renderProposalForm();
    // サーバーにも（空の提案が追加されたことを）即時送信
    sendProposalFormUpdate();
  });

  // フォーム内のいずれかの入力が変更されたら、サーバーに送信（500msのデバウンス付き）
  proposalFormInputs.forEach(input => {
    input.addEventListener('input', () => {
        clearTimeout(proposalTypingTimer);
        proposalTypingTimer = setTimeout(sendProposalFormUpdate, 500);
    });
  });

  /**
   * [新規] 現在のフォームの入力値を読み取り、allProposalsを更新し、WebSocketで送信する
   */
  function sendProposalFormUpdate() {
      if (allProposals.length === 0) return; // 送信対象がなければ何もしない
      
      const currentProposal = allProposals[currentProposalIndex];
      
      proposalFormInputs.forEach(input => {
          const key = input.dataset.key;
          if (input.type === 'radio') {
              if (input.checked) {
                  currentProposal[key] = input.value;
              }
          } else {
              currentProposal[key] = input.value;
          }
      });
      
      // 更新された提案リスト全体をサーバーに送信
      ws.send(JSON.stringify({
          type: 'proposal_form_update',
          proposals: allProposals
      }));
  }

  function renderProposalForm() {
      // 提案が1つもない場合は、デフォルトを作成
      if (allProposals.length === 0) {
          allProposals.push({ ...defaultProposal });
          currentProposalIndex = 0;
      }

      const proposal = allProposals[currentProposalIndex] || defaultProposal;

      // --- 1. 通常の入力フィールド（テキスト・ラジオ）の復元 ---
      proposalFormInputs.forEach(input => {
          const key = input.dataset.key;
          const value = proposal[key] || "";

          if (input.type === 'radio') {
              input.checked = (input.value === value);
          } else if (input.type !== 'checkbox') { 
              // チェックボックスは別途処理、現在フォーカス中の要素は更新しない
              if (document.activeElement !== input) {
                  input.value = value;
              }
          }
      });

      // --- 2. Q3 (手法/q6) チェックボックスの復元 ---
      const q6Value = proposal['q6'] || "";
      // 一旦リセット
      q6Checkboxes.forEach(cb => cb.checked = false);
      q6OtherText.value = "";
      
      if (q6Value) {
          const selectedValues = q6Value.split('、');
          q6Checkboxes.forEach(cb => {
              if (cb.value === "その他") {
                  if (q6Value.includes("その他：")) {
                      cb.checked = true;
                      const match = q6Value.match(/その他：(.*?)($|、)/);
                      if (match && match[1]) q6OtherText.value = match[1];
                  }
              } else {
                  if (selectedValues.includes(cb.value)) {
                      cb.checked = true;
                  }
              }
          });
      }

      // --- 3. Q6 (Who/q5) 実施者・対象・ステークホルダーの復元 ---
      const q5Value = proposal['q5'] || "";
      // 一旦リセット
      q5Implementer.value = "";
      q5Target.value = "";
      q5Stakeholder.value = "";

      if (q5Value) {
          const impMatch = q5Value.match(/【実施者】(.*?)(?=\n【|$)/);
          const tgtMatch = q5Value.match(/【対象】(.*?)(?=\n【|$)/);
          const stkMatch = q5Value.match(/【ステークホルダー】([\s\S]*)/);

          if (impMatch) q5Implementer.value = impMatch[1];
          if (tgtMatch) q5Target.value = tgtMatch[1];
          if (stkMatch) q5Stakeholder.value = stkMatch[1];

          // 旧データ形式への対応
          if (!impMatch && !tgtMatch && !stkMatch && q5Value.trim() !== "") {
              q5Implementer.value = q5Value;
          }
      }

      // ページネーションUIの更新
      proposalPageIndicator.textContent = `提案 ${currentProposalIndex + 1} / ${allProposals.length}`;
      proposalPrevBtn.disabled = (currentProposalIndex === 0);
      proposalNextBtn.disabled = (currentProposalIndex === allProposals.length - 1);
  }

  // --- AIファシリテーションボタンのイベントリスナー ---
  facilitateBtn.addEventListener("click", async () => {
    facilitateBtn.disabled = true;
    facilitateBtn.textContent = "🤖 考え中…";

    try {
      const response = await fetch(`/facilitate/${roomId}`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "AIファシリテーションの実行に失敗しました。");
      }
    } catch (error) {
      console.error("Facilitation error:", error);
      alert(error.message);
    } finally {
      // AIからの発言はWebSocket経由で届くので、ここではボタンを元に戻すだけ
      facilitateBtn.disabled = false;
      facilitateBtn.textContent = "🤖 AIファシリテーション";
    }
  });

    let lastEnterPress = 0;
    inputElem.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.shiftKey) {
      return; // 何もせず、<textarea>のデフォルトの改行に任せる
    }

    // Enterのみの場合
    if (event.key === "Enter" && !event.shiftKey) {
      const now = Date.now();
      
      // 最後のEnterから300ms以内（一般的なダブルクリック判定時間）かチェック
      if (now - lastEnterPress < 300) {
        
        // --- ダブルEnter -> 送信 ---
        event.preventDefault(); // 2回目のEnterによる改行を防ぐ
        
        // 1回目のEnterで入力されてしまった可能性のある「末尾の改行」を削除
        if (inputElem.value.endsWith('\n')) {
          inputElem.value = inputElem.value.substring(0, inputElem.value.length - 1);
        }
        
        // 送信ボタンのクリックイベントを発火
        sendBtn.click();
        
        lastEnterPress = 0; // 連続押下時刻をリセット

      } else {
        // --- シングルEnter -> 改行 (デフォルトの動作) ---
        // event.preventDefault() を "しない" ことで、
        // <textarea>のデフォルトの動作（改行）が実行される
        
        // 今回のEnter時刻を「最後の押下時刻」として記録
        lastEnterPress = now;
       }
    }
  });


function updateQ6HiddenInput() {
      let selectedValues = [];
      q6Checkboxes.forEach(cb => {
          if (cb.checked) {
              if (cb.value === "その他") {
                  const otherStr = q6OtherText.value.trim();
                  selectedValues.push(`その他：${otherStr}`);
              } else {
                  selectedValues.push(cb.value);
              }
          }
      });
      
      // カンマ（、）区切りの文字列にして hidden input にセット
      const finalString = selectedValues.join('、');
      q6HiddenInput.value = finalString;

      // データモデルを更新してサーバーに送信
      const currentProposal = allProposals[currentProposalIndex];
      if (currentProposal) {
          currentProposal['q6'] = finalString;
          
          // デバウンス（連打防止）付きで送信
          clearTimeout(proposalTypingTimer);
          proposalTypingTimer = setTimeout(sendProposalFormUpdate, 500);
      }
  }

  // チェックボックスの変更監視
  q6Checkboxes.forEach(cb => {
      cb.addEventListener('change', updateQ6HiddenInput);
  });

  // 「その他」テキスト入力の監視
  q6OtherText.addEventListener('input', () => {
      // テキスト入力したら自動で「その他」にチェックを入れる
      const otherCheckbox = document.getElementById('q6-opt10');
      if (q6OtherText.value.trim() !== "" && !otherCheckbox.checked) {
          otherCheckbox.checked = true;
      }
      updateQ6HiddenInput();
  });

  function updateQ5HiddenInput() {
      const imp = document.getElementById('q5-implementer').value;
      const tgt = document.getElementById('q5-target').value;
      const stk = document.getElementById('q5-stakeholder').value;
      
      // Wordやチャットで見やすいように、【】で区切って改行して保存します
      const finalString = `【実施者】${imp}\n【対象】${tgt}\n【ステークホルダー】${stk}`;
      
      q5HiddenInput.value = finalString;

      // サーバー送信
      const currentProposal = allProposals[currentProposalIndex];
      if (currentProposal) {
          currentProposal['q5'] = finalString;
          clearTimeout(proposalTypingTimer);
          proposalTypingTimer = setTimeout(sendProposalFormUpdate, 500);
      }
  }

  q5Parts.forEach(part => {
      part.addEventListener('input', updateQ5HiddenInput);
  });

  postProposalToChatBtn.addEventListener('click', () => {
    if (!confirm('現在のフォームの内容を、チャット欄に「提案」として投稿しますか？\n（投稿後もフォームでの編集は続けられます）')) {
      return;
    }

    // 1. 現在のフォームデータを取得
    const currentProposal = allProposals[currentProposalIndex];
    if (!currentProposal) {
      alert('提案データが見つかりません。');
      return;
    }
    
    // 2. フォームの入力値を最新化（デバウンスを待たずに強制読み取り）
    //    これをしないと、入力直後にボタンを押した場合に反映されない
    proposalFormInputs.forEach(input => {
      const key = input.dataset.key;
      if (input.type === 'radio') {
        if (input.checked) {
          currentProposal[key] = input.value;
        }
      } else {
        currentProposal[key] = input.value;
      }
    });

    // 3. Q1 (What) が空の場合はエラー
    if (!currentProposal.q1 || currentProposal.q1.trim() === "") {
      alert('Q1 (提案内容) が空のため、投稿できません。');
      return;
    }

    // 4. チャットに送信するメッセージ本文を整形
    //    (HTMLのQ番号とdata-keyのズレに注意して組み立てる)
    let formattedContent = `【5W1Hフォームからの提案】\n`;
    formattedContent += `Q1 (What): ${currentProposal.q1}\n`;
    formattedContent += `Q2 (Why): ${currentProposal.q2 || '未記入'}\n`;
    formattedContent += `Q3 (How): ${currentProposal.q6 || '未記入'}\n`;     // HTMLのQ3はq6
    formattedContent += `Q4 (When): ${currentProposal.q3 || '未記入'}\n`;    // HTMLのQ4はq3
    formattedContent += `Q5 (Where): ${currentProposal.q4 || '未記入'}\n`;   // HTMLのQ5はq4
    formattedContent += `Q6 (Who): ${currentProposal.q5 || '未記入'}\n`;     // HTMLのQ6はq5
    
    const q7Value = currentProposal.q7;
    let q7Text = '未選択';
    if (q7Value === 'forecast') q7Text = 'フォアキャスティング';
    if (q7Value === 'backcast') q7Text = 'バックキャスティング';
    formattedContent += `Q7 (思考法): ${q7Text}`;

    // 5. WebSocketで「メッセージ」として送信
    const payload = {
      type: "message",
      content: formattedContent,
      stance: "提案", // スタンスを「提案」にする
      reply_to_id: null,
      file_url: null,
      original_filename: null,
      gemini_file_ref: null,
    };

    ws.send(JSON.stringify(payload));

    // 6. 送信後はモーダルを閉じる
    proposalFormModal.style.display = "none";
    alert('提案をチャットに投稿しました。');
  });



// --- Wordダウンロード機能 ---
  const downloadWordBtn = document.getElementById("download-word-btn");

  downloadWordBtn.addEventListener("click", async () => {
      if (allProposals.length === 0) {
          alert("提案がまだありません。");
          return;
      }

      // 現在のフォーム入力値を最新の提案データに反映させておく
      // (ユーザーが入力を終えてすぐボタンを押した場合の対策)
      const currentProposal = allProposals[currentProposalIndex];
      proposalFormInputs.forEach(input => {
          const key = input.dataset.key;
          if (input.type === 'radio') {
              if (input.checked) currentProposal[key] = input.value;
          } else {
              currentProposal[key] = input.value;
          }
      });

      downloadWordBtn.disabled = true;
      downloadWordBtn.textContent = "📄 作成中...";

      try {
          // 議題（Topic）を取得（HTML上の要素から）
          // ※ chat.html のテンプレート変数 {{ topic }} はJS変数にはなっていない場合があるので
          //    HTML要素から取得するか、metaタグ等があればそこから取ります。
          //    ここでは汎用的に .topic-label から取得を試みます。
          let topicText = "未設定";
          const topicEl = document.querySelector('.topic-label');
          if (topicEl) {
              // "議題: " の部分を取り除く
              topicText = topicEl.textContent.replace('議題:', '').trim();
          }

          const payload = {
              topic: topicText,
              proposals: allProposals
          };

          const response = await fetch("/download_proposals_word", {
              method: "POST",
              headers: {
                  "Content-Type": "application/json"
              },
              body: JSON.stringify(payload)
          });

          if (!response.ok) {
              throw new Error("ファイルの作成に失敗しました。");
          }

          // Blobとして受け取り、ダウンロードリンクを作成してクリック
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `提言案_${new Date().toISOString().slice(0,10)}.docx`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          
      } catch (error) {
          console.error("Download error:", error);
          alert("ダウンロードに失敗しました: " + error.message);
      } finally {
          downloadWordBtn.disabled = false;
          downloadWordBtn.textContent = "📄 すべての提案をWordでダウンロード";
      }
  });

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

// [追加] Service Workerの登録と通知設定
const notificationBtn = document.getElementById("notification-btn");

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
// スタンドアロンモード（ホーム画面から起動しているか）の判定
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

if ('serviceWorker' in navigator && 'PushManager' in window) {
    // Service Workerを登録
    navigator.serviceWorker.register('/sw.js')
    .then(function(registration) {
        console.log('Service Worker registered:', registration);
        initializeUI(registration);
    })
    .catch(function(error) {
        console.error('Service Worker registration failed:', error);
    });
} else {
    console.warn('Push messaging is not supported');
    if (isIOS && !isStandalone) {
        // iPhoneで、かつブラウザのタブで見ている場合
        notificationBtn.textContent = "⚠️ ホーム画面に追加してください";
        notificationBtn.style.backgroundColor = "#ffc107"; // 黄色で注意喚起
        notificationBtn.style.color = "#000";
        notificationBtn.style.width = "auto";
        notificationBtn.disabled = false;
        notificationBtn.onclick = () => {
            alert("iPhoneで通知を受け取るには、画面下の共有ボタンから「ホーム画面に追加」を行い、そのアイコンからアプリを起動し直してください。");
        };
    } else {
        notificationBtn.style.display = 'none';
    }
}

function initializeUI(registration) {
    // 既に購読済みかチェック
    registration.pushManager.getSubscription()
    .then(function(subscription) {
        const isSubscribed = !(subscription === null);
        updateBtn(isSubscribed);

        if (isSubscribed) {
            console.log('User is already subscribed.');
            sendSubscriptionToBackEnd(subscription);
        } else {
            console.log('User is NOT subscribed.');
        }
    });

    notificationBtn.addEventListener('click', function() {
        notificationBtn.disabled = true;
        if (isSubscribed) {
            // 購読解除のロジック（今回は省略、ONにする機能のみ実装）
            alert("通知設定はブラウザの設定から変更してください。");
            notificationBtn.disabled = false;
            return;
        }
        subscribeUser(registration);
    });
}

let isSubscribed = false;

function updateBtn(subscribed) {
    isSubscribed = subscribed;
    if (subscribed) {
        notificationBtn.textContent = "🔔 通知ON";
        notificationBtn.style.backgroundColor = "#17a2b8";
    } else {
        notificationBtn.textContent = "🔕 通知OFF";
        notificationBtn.style.backgroundColor = "#6c757d";
    }
    notificationBtn.disabled = false;
}

function subscribeUser(registration) {
    if (!vapidPublicKey) {
        alert("サーバー設定エラー: VAPIDキーが設定されていません。");
        return;
    }
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    
    registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
    })
    .then(function(subscription) {
        console.log('User is subscribed:', subscription);
        updateBtn(true);
        return sendSubscriptionToBackEnd(subscription);
    })
    .catch(function(err) {
        console.log('Failed to subscribe the user: ', err);
        updateBtn(false);
        alert("通知の許可が拒否されました。設定アプリから通知を許可してください。");
    });
}

function sendSubscriptionToBackEnd(subscription) {
    return fetch('/subscribe', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: subscription.toJSON().keys,
            username: username,
            room_id: roomId
        })
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Bad status code from server.');
        }
        return response.json();
    })
    .then(function(responseData) {
        console.log('Subscription sent to server:', responseData);
    });
}

})();