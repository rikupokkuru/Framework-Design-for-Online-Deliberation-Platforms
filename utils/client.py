# [新規作成] utils/client.py

import os
from google import genai
from dotenv import load_dotenv

# .envファイルから環境変数を読み込む
load_dotenv()

# グローバル変数としてクライアントを保持
_client = None

def get_gemini_client():
    """
    Gemini APIクライアントのシングルトンインスタンスを返す関数。
    """
    global _client
    if _client is None:
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            raise ValueError("エラー: 環境変数に GEMINI_API_KEY が設定されていません。")
        
        # 新しい作法でクライアントを初期化
        _client = genai.Client(api_key=gemini_api_key)
    
    return _client