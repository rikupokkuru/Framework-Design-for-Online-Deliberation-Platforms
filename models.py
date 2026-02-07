from sqlalchemy import Column, String, JSON, ForeignKey, DateTime, Text, Boolean, Integer
from sqlalchemy.orm import relationship
from database import Base
import uuid
from datetime import datetime

class Room(Base):
    __tablename__ = "rooms"
    room_id = Column(String, primary_key=True)
    topic = Column(String, nullable=False)
    status = Column(String, default="進行中")
    shared_note = Column(Text, default="")
    analytics = Column(JSON, default=dict)
    
    proposals_data = Column(JSON, default=list) 
    # 'cascade="all, delete-orphan"'により、Roomが削除されると関連するMessageも全て削除されます。
    messages = relationship(
        "Message", 
        back_populates="room", 
        order_by="Message.created_at", 
        cascade="all, delete-orphan"
    )

    push_subscriptions = relationship(
        "PushSubscription",
        back_populates="room",
        cascade="all, delete-orphan"
    )

class Message(Base):
    __tablename__ = "messages"
    # 基本情報
    message_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # ルームとの関連付け (外部キー)
    room_id = Column(String, ForeignKey("rooms.room_id"), nullable=False, index=True)
    
    # メッセージ内容
    username = Column(String, nullable=False)
    content = Column(Text)
    stance = Column(String)
    
    # 添付ファイル情報
    file_url = Column(String)
    original_filename = Column(String)
    gemini_file_ref = Column(String)

    # インタラクション情報
    reactions = Column(JSON, default=lambda: {"agree": [], "partial": [], "disagree": []})
    
    # 返信情報 (リレーショナルな構造に変更)
    reply_to_id = Column(String, ForeignKey("messages.message_id", ondelete="SET NULL"), nullable=True)

    is_resolved = Column(Boolean, default=False, nullable=False)
    
    # Roomモデルとのリレーションシップを定義
    room = relationship("Room", back_populates="messages")
    
    # WebSocketでJSONとして送信する際に利用します。
    def to_dict(self, parent_message_dict=None):
        base = {
        "message_id": self.message_id,
            "username": self.username,
            "content": self.content,
            "stance": self.stance,
            "file_url": self.file_url,
            "original_filename": self.original_filename,
            "gemini_file_ref": self.gemini_file_ref,
            "reactions": self.reactions,
            "reply_to": parent_message_dict,
            "is_resolved": self.is_resolved  # [追加] 解決ステータスを辞書に含める
        }
        return base

class PushSubscription(Base):
    __tablename__ = "push_subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(String, ForeignKey("rooms.room_id"), nullable=False, index=True)
    username = Column(String, nullable=False)
    
    # Web Pushに必要な情報
    endpoint = Column(Text, nullable=False)
    p256dh = Column(String, nullable=False)
    auth = Column(String, nullable=False)
    room = relationship("Room", back_populates="push_subscriptions")