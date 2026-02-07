import os
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import declarative_base

# Renderの環境変数からデータベースURLを取得
DATABASE_URL = os.getenv("DATABASE_URL")

# URLの先頭部分を、非同期ドライバ'asyncpg'を使用する形式に確実に置換する
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    # Renderが'postgresql://'形式のURLを返す可能性も考慮
    elif DATABASE_URL.startswith("postgresql://"):
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)

# データベースエンジンを作成
engine = create_async_engine(DATABASE_URL)

# データベースセッションを作成するためのクラス
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# モデルクラスが継承するためのベースクラス
Base = declarative_base()

# FastAPIのDI（Dependency Injection）で使用するセッション取得関数
async def get_db():
    async with AsyncSessionLocal() as session:
        yield session