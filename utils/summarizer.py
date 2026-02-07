from google import genai
import os
from .client import get_gemini_client
import json

def format_proposals_for_prompt(proposals_list):
    """提案リストをAIが読めるテキスト形式に整形するヘルパー関数"""
    if not proposals_list:
        return "（提案フォームへの記入なし）"
    
    formatted_text = ""
    for idx, prop in enumerate(proposals_list, 1):
        formatted_text += f"\n[提案フォーム内容 {idx}]\n"
        formatted_text += f"What (内容): {prop.get('q1', '未記入')}\n"
        formatted_text += f"Why (理由): {prop.get('q2', '未記入')}\n"
        formatted_text += f"How (手法): {prop.get('q6', '未記入')}\n"
        formatted_text += f"When (時期): {prop.get('q3', '未記入')}\n"
        formatted_text += f"Where (場所): {prop.get('q4', '未記入')}\n"
        formatted_text += f"Who (主体): {prop.get('q5', '未記入')}\n"
        formatted_text += f"思考法: {prop.get('q7', '未記入')}\n"
    return formatted_text

def ask_gemini_simple(question: str, files: list = None) -> str:
    """Geminiに文脈なしで簡単な質問を投げ、回答を得る"""
    try:
        # 新しい作法でクライアントを取得
        client = get_gemini_client()
        
        # 簡潔な回答を促すプロンプト
        prompt = f"以下の質問に対して、チャットで回答する形式で、簡潔に分かりやすく答えてください。あなたの思考過程や自己分析は一切出力しないでください。\n添付ファイルがある場合は、その内容も踏めて回答してください。\n\n質問：{question}"
        
        content_to_send = [prompt]
        if files:
            try:
                # APIが認識できるファイルオブジェクトのリストに変換
                file_objects = [client.files.get(name=file_name) for file_name in files]
                content_to_send.extend(file_objects)
            except Exception as e:
                print(f"File retrieval error for ask_gemini_simple: {e}")
                return "エラー: 添付ファイルの取得に失敗しました。"

        response = client.models.generate_content(
            model='models/gemini-flash-latest', # モデル名を文字列で指定
            contents=content_to_send
        )
        return response.text.strip()
    except Exception as e:
        print(f"Geminiへの質問でエラーが発生: {e}")
        return f"申し訳ありません、質問への回答中にエラーが発生しました: {e}"

def analyze_discussion_progress(messages: list, topic: str, files: list = None, note_content: str = "", proposals_data: list = []) -> str:
    """Geminiに現在の議論の状況を分析・要約させる"""
    try:
        client = get_gemini_client()
        
        chat_log = []
        for msg in messages:
            username = "🤖 Gemini" if msg.get('username') == "Gemini" else msg.get('username', '不明')
            content = msg.get('content', '')
            stance = msg.get('stance', '')
            
            reply_info = ""
            if msg.get('reply_to'):
                reply_to_user = msg['reply_to'].get('username', '不明')
                reply_info = f" (返信 to {reply_to_user})"

            reaction_info = ""
            if stance == '意見' and msg.get('reactions'):
                reactions = msg['reactions']
                agree_count = len(reactions.get('agree', []))
                partial_count = len(reactions.get('partial', []))
                disagree_count = len(reactions.get('disagree', []))
                if agree_count + partial_count + disagree_count > 0:
                    reaction_info = f" [リアクション: 👍{agree_count}, 🤔{partial_count}, 👎{disagree_count}]"

            chat_log.append(f"{username} ({stance}){reply_info}: {content}{reaction_info}")
        chat_log_string = "\n".join(chat_log)
        proposals_text = format_proposals_for_prompt(proposals_data)

        prompt = f"""
あなたの役割
あなたは、オンライン形式の気候市民会議を円滑に進行させるための、高度なAIファシリテーターです。あなたの目的は、参加者が自分たちの力で建設的な対話を深め、最終的に具体的な政策提言にまとめる手助けをすることです。

実行プロセス
これから、会議のある時点までの議論のコンテキスト（チャット履歴、共有ノート、添付ファイル、5W1H提案フォームなど）が入力されます。 それらを総合的に分析し、議論が最終目標に向けて円滑に進むための客観的な状況報告を行ってください。 あなたの思考プロセスや前置きは一切不要です。以下の【出力形式】に従って、ユーザーへのフィードバックのみを生成してください。

出力形式
まず、共有ノートやチャット履歴から、以下の形式を必ず使用して、フィードバックを作成してください。

現在の議論の焦点：
現在、どの提言案について、どのような点が中心的に話し合われていますか？

各提言案の成熟度チェック（5W1H分析）：
特定された各提言案について、以下の5W1Hの要素が議論でどの程度具体化されているかを分析し、結果を記述してください。議論されていない要素については「（未定）」や「（要議論）」と明確に示してください。

（出力例）

提言1：電気自動車の普及促進
What（提案内容）: 公共施設や商業施設への急速充電ステーションの設置を増やす。

Why（何故その提案が大切か）: 充電インフラの不足がEV普及の大きな障壁となっているため。

Where（どこでその提案を実施するか）: 千葉県全域の市役所、図書館、大型スーパーマーケットなど。

When（いつまでにその提案を実施すべきか）: 2026年度から3カ年計画で実施する。

Who（誰が、誰に対して提案を実施するか）: 県と市町村が主体となり、設置費用の一部を補助する。

How（どのような手法で実施するか）: 設置補助金制度を新設し、民間事業者の参入を促す。

提言2：再生可能エネルギーの導入拡大
What（提案内容）: 住宅用太陽光パネル設置への補助金を拡充する。

Why（何故その提案が大切か）: （要議論）

Where（どこでその提案を実施するか）: （未定）

（提言が複数ある場合は、この形式を繰り返す）


---
**現在の会議情報**
* 議題: {topic}
* 共有ノート: {note_content if note_content else "（まだ記入されていません）"}
* 5W1H提案フォームの入力状況:
{proposals_text}
* 議論ログ: 
{chat_log_string}
---

上記の形式で、ユーザーへのフィードバックを作成してください。
"""
        content_to_send = [prompt]
        if files:
            try:
                file_objects = [client.files.get(name=file_name) for file_name in files]
                content_to_send.extend(file_objects)
            except Exception as e:
                print(f"File retrieval error for analyze_discussion_progress: {e}")
                return "エラー: 添付ファイルの取得に失敗しました。"
        
        response = client.models.generate_content(
            model='models/gemini-flash-latest',
            contents=content_to_send
        )
        return response.text.strip()
    except Exception as e:
        print(f"Geminiでの進行状況分析でエラーが発生: {e}")
        return f"申し訳ありません、進行状況の分析中にエラーが発生しました: {e}"

def generate_summary(messages: list, topic: str, files: list = None, note_content: str = "", proposals_data: list = []) -> str:
    try:
        client = get_gemini_client()
        
        chat_log = []
        participants = set()
        for msg in messages:
            username = msg.get('username', '不明')
            if username != "Gemini":
                participants.add(username)
            
            username_display = "🤖 Gemini" if username == "Gemini" else username
            file_info = f" (ファイル: {msg.get('original_filename')})" if msg.get('original_filename') else ""
            
            reply_info = ""
            if msg.get('reply_to'):
                reply_to_user = msg['reply_to'].get('username', '不明')
                reply_info = f" (返信 to {reply_to_user})"

            reaction_info = ""
            if msg.get('stance') == '意見' and msg.get('reactions'):
                reactions = msg['reactions']
                agree_count = len(reactions.get('agree', []))
                partial_count = len(reactions.get('partial', []))
                disagree_count = len(reactions.get('disagree', []))
                if agree_count + partial_count + disagree_count > 0:
                    reaction_info = f" [リアクション: 同意 {agree_count}, 部分同意 {partial_count}, 同意できない {disagree_count}]"
            
            chat_log.append(f"{username_display} ({msg.get('stance', '')}){reply_info}: {msg.get('content', '')}{file_info}{reaction_info}")
        
        chat_log_string = "\n".join(chat_log)

        proposals_text = format_proposals_for_prompt(proposals_data)

        prompt = f"""以下の会議ログから、具体的な議事録を作成してください。
あなたの役割
あなたは、オンライン形式の気候市民会議の議論を、正確かつ構造化された公式な議事録にまとめる、高度なAI書記です。あなたの目的は、与えられた議論のコンテキストを基に、指定されたフォーマットに沿って一切の情報を省略・解釈せず、忠実に議事録を作成することです。

実行プロセス
これから、会議の全コンテキスト（議題、参加者、チャット履歴、共有ノートなど）が入力されます。

共有ノートの内容を、参加者によってまとめられた最終的な提言案として最優先で扱ってください。

チャット履歴の各発言とリアクション数を正確に抽出し、指定されたフォーマットで書き出してください。

思考プロセスや前置きは一切不要です。ただちに以下の【出力形式】に従って、議事録の生成を開始してください。

出力形式
以下の5つの項目を、この順番通りに記述してください。

1. 議題
提供された議題をそのまま記述してください。

2. 参加者
議論に参加した全ユーザー名を、コンマ区切りで記述してください。

3. 発言履歴
全てのチャット履歴を、発言順に一行ずつ記述してください。

フォーマット: （発言者名）：「発言の種類」→（発言内容）

「意見」の発言の場合は、末尾にリアクション数を追記してください。フォーマット: （賛：X名、部：Y名、反：Z名）

発言者名の後のコロン「：」の位置が、縦で綺麗に揃うようにスペースを調整してください。

4. 各提言案の成熟度チェック（5W1H分析）
共有ノートや議論の内容から特定された各提言案について、5W1Hの要素がどの程度具体化されているかを分析し、以下の形式で記述してください。議論されていない要素は「（未定）」または「（要議論）」と明確に示してください。

（出力例）

提言1：電気自動車の普及促進
What（提案内容）: 公共施設や商業施設への急速充電ステーションの設置を増やす。

Why（何故その提案が大切か）: 充電インフラの不足がEV普及の大きな障壁となっているため。

Where（どこでその提案を実施するか）: 千葉県全域の市役所、図書館、大型スーパーマーケットなど。

When（いつまでにその提案を実施すべきか）: 2026年度から3カ年計画で実施する。

Who（誰が、誰に対して提案を実施するか）: 県と市町村が主体となり、設置費用の一部を補助する。

How（どのような手法で実施するか）: 設置補助金制度を新設し、民間事業者の参入を促す。

（提言が複数ある場合は、この形式を繰り返す）

5. 政策提言の発表役割分担
もし、今後の役割分担について議論されている形跡があれば、その内容を参加者ごとに簡潔にまとめてください。役割分担に関する議論が一切ない場合は、この項目自体を省略してください。

---
**会議情報**
* 議題: {topic}
* 参加者: {', '.join(sorted(list(participants)))}
* 共有ノート: {note_content if note_content else "（記入なし）"}
* 5W1H提案フォームの入力状況:
{proposals_text}
* 発言履歴ログ:
{chat_log_string}
---
"""
        content_to_send = [prompt]
        if files:
            try:
                file_objects = [client.files.get(name=file_name) for file_name in files]
                content_to_send.extend(file_objects)
            except Exception as e:
                print(f"File retrieval error for generate_summary: {e}")
                return "エラー: 添付ファイルの取得に失敗しました。"

        response = client.models.generate_content(
            model='models/gemini-pro-latest',
            contents=content_to_send
        )
        return response.text.strip()
        
    except Exception as e:
        print(f"議事録生成エラー (Gemini): {e}")
        return f"議事録生成中にエラーが発生しました (Gemini): {e}"
    
def get_facilitation_from_gemini(messages: list, topic: str, note_content: str, proposals_data: list = None) -> str:
    try:
        client = get_gemini_client()

        chat_log = []
        for msg in messages:
            username = "🤖 Gemini" if msg.get('username') == "Gemini" else msg.get('username', '不明')
            content = msg.get('content', '')
            stance = msg.get('stance', '')
            file_info = f" (添付ファイルあり)" if msg.get('file_url') else ""
            reply_info = f" (返信 to {msg['reply_to']['username']})" if msg.get('reply_to') else ""
            reaction_info = ""
            if stance == '意見' and msg.get('reactions'):
                reactions = msg['reactions']
                agree = len(reactions.get('agree', []))
                partial = len(reactions.get('partial', []))
                disagree = len(reactions.get('disagree', []))
                if agree + partial + disagree > 0:
                    reaction_info = f" [反応: 👍{agree}, 🤔{partial}, 👎{disagree}]"
            chat_log.append(f"{username} ({stance}){reply_info}: {content}{file_info}{reaction_info}")

        system_prompt = f"""
あなたの役割
あなたは、オンライン形式の気候市民会議を円滑に進行させるための、高度なAIファシリテーターです。あなたの目的は、参加者が自分たちの力で建設的な対話を深め、最終的に具体的な政策提言にまとめる手助けをすることです。

出力方法
あなたの発言は、常にたった一つの明確な目的に絞られなければなりません。複数の行動（例：意見をまとめつつ、次の質問をする）を一つの発言に含めてはいけません。参加者が「今、何をすべきか」が明確にわかる、焦点を絞った発言を心がけてください。
また、あなたの思考過程や自己分析は一切出力しないでください。

実行プロセス
これから入力される議論のコンテキストを分析し、以下の優先順位リストに従って、上から順に現在の状況に合致するかどうかを判断してください。合致した最初の項目について、一度の発言で、一つの行動だけを実行してください。

【優先度1】目の前の論点に集中させる
状況判断: 特定の論点（例：5W1Hの一つである「When（いつ）」）について議論している最中か？ 誰かの質問が、まだ誰からも回答されずに残っているか？

実行行動: その一点にのみ焦点を当て、回答や意見を促してください。

発言例: 「ありがとうございます。『いつまでに行うか』という点について、皆さんの具体的なご意見はいかがでしょうか？」
発言例: 「先ほどの〇〇さんからの『△△』というご質問ですが、こちらについてはいかがでしょうか？」

【優先度2】新しい意見への反応を促す
状況判断: 【優先度1】に当てはまらず、かつ、新しい意見や提案が出た直後で、まだ他の参加者からの十分な反応（賛成、反対、質問など）がない場合。

実行行動: その新しい意見一つに対して、他の参加者からの反応を促してください。

発言例: 「〇〇さん、ご意見ありがとうございます。『△△』という新しい視点が出ましたが、これについて皆さんはどう思われますか？」

【優先度3】議論の現在地を整理する
状況判断: 【優先度1, 2】に当てはまらず、複数の意見が出揃い、議論が一段落したように見える場合。

実行行動: ここまでの議論をまとめるか、論点を整理する、どちらか一つだけを行ってください。

発言例（意見集約）: 「ありがとうございます。現時点では大きく分けて『〇〇』と『△△』という2つの方向性で意見が出ているようですね。」
発言例（論点整理）: 「皆さんのご意見から、『〇〇』という点は共通の認識のようですね。一方で、『△△』についてはまだ意見が分かれています。この対立点について少し話しませんか？」

【優先度4】議論の停滞を打破・推進する
状況判断: 【優先度1, 2, 3】に当てはまらず、議論が完全に行き詰まっている、または明確に一つのフェーズが完了した場合。

実行行動: 新しい視点を提示するか、次の議題に移ることを提案する、どちらか一つだけを行ってください。

発言例（停滞打破）: 「少し議論が止まっているようですので、視点を変えて、費用対効果の観点ではどうでしょうか？」
発言例（推進）: 「『〇〇』については、皆さんの意見がまとまったようですね。それでは次に、この提案の実現方法について具体的に考えていきませんか？」

禁止事項
複数の行動の組み合わせ: 例：「意見をまとめつつ、次の質問をする」

決めつけ: 例：「〇〇を採用し、次に△△を議論しましょう」

一度に複数の要求: 例：「Whenを決め、さらに次の提言も考えましょう」
"""

        chat_log_string = "\n".join(chat_log) if chat_log else "（まだ発言がありません）"

        proposals_text = format_proposals_for_prompt(proposals_data)

        full_prompt = f"""{system_prompt}
---
**現在の会議情報**
* 議題: {topic}
* 共有ノート: {note_content if note_content else "（まだ記入されていません）"}
* 5W1H提案フォームの入力状況:
{proposals_text}
* チャット履歴:
{chat_log_string}
---
"""
        response = client.models.generate_content(
            model='models/gemini-flash-latest',
            contents=full_prompt
        )
        return response.text.strip()
    except Exception as e:
        print(f"AI Facilitation error (Gemini): {e}")
        return f"申し訳ありません、ファシリテーションの実行中にエラーが発生しました: {e}"