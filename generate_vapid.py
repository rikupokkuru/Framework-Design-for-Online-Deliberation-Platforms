# generate_vapid.py
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
import base64

def generate_keys():
    # 1. 秘密鍵の生成 (P-256曲線)
    private_key = ec.generate_private_key(ec.SECP256R1())
    
    # 2. 秘密鍵をPEM形式（文字列）に変換
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption()
    )
    
    # 3. 公開鍵の生成
    public_key = private_key.public_key()
    
    # 4. 公開鍵を「非圧縮ポイント形式」のバイト列に変換（ブラウザが要求する形式）
    public_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )
    
    # 5. 公開鍵をURLセーフBase64文字列に変換（.envに保存する形式）
    public_b64 = base64.urlsafe_b64encode(public_bytes).decode('utf-8').strip('=')

    print("-" * 30)
    print("【 .env に貼り付ける値 】")
    print("-" * 30)
    
    # 秘密鍵の表示（改行文字 \n を含んだ1行の文字列として表示します）
    # これにより .env への貼り付けミスを防ぎます
    private_key_str = private_pem.decode('utf-8').replace('\n', '\\n')
    print(f'VAPID_PRIVATE_KEY="{private_key_str}"')
    
    print("")
    
    # 公開鍵の表示
    print(f'VAPID_PUBLIC_KEY="{public_b64}"')
    print("-" * 30)

if __name__ == "__main__":
    generate_keys()