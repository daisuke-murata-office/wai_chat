'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';

interface Reply {
  id: string;
  reply: string;
  timestamp: string;
}

interface Message {
  id: string;
  message: string;
  type: 'reaction' | 'question';
  timestamp: string;
  replies: Reply[];
}

export default function Room() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [floatingMessages, setFloatingMessages] = useState<(Message & { id: string })[]>([]);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // 自動スクロール機能
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 5;
      setIsAtBottom(atBottom);
    }
  };

  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom]);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join-room', roomId);
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('room-messages', (roomMessages: Message[]) => {
      setMessages(roomMessages);
    });

    newSocket.on('new-reaction', (message: Message) => {
      setMessages(prev => [...prev, message]);
      
      // 反応のみをフローティング表示
      if (message.type === 'reaction') {
        const floatingMessage = { ...message, id: Date.now().toString() };
        setFloatingMessages(prev => [...prev, floatingMessage]);
        
        setTimeout(() => {
          setFloatingMessages(prev => prev.filter(m => m.id !== floatingMessage.id));
        }, 3000);
      }
    });

    newSocket.on('message-updated', (updatedMessage: Message) => {
      setMessages(prev => prev.map(msg => 
        msg.id === updatedMessage.id ? updatedMessage : msg
      ));
    });

    newSocket.on('chat-exported', (exportData: any) => {
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const exportFileDefaultName = `chat_${roomId}_${new Date().toISOString().slice(0,10)}.json`;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomId]);

  const sendReaction = (message: string, type: 'reaction' | 'question') => {
    if (socket && connected) {
      socket.emit('send-reaction', { roomId, message, type });
    }
  };

  const sendReply = () => {
    if (socket && connected && selectedMessage && replyText.trim()) {
      socket.emit('send-reply', { 
        roomId, 
        messageId: selectedMessage.id, 
        reply: replyText.trim() 
      });
      setReplyText('');
      setSelectedMessage(null);
    }
  };

  const exportChat = () => {
    if (socket && connected) {
      socket.emit('export-chat', { roomId });
    }
  };

  const reactionButtons = [
    { text: 'へぇ', label: 'へぇ' },
    { text: 'いいね', label: 'いいね' },
    { text: '？？？', label: '？？？' },
    { text: 'ぱちぱち', label: 'ぱちぱち' },
  ];

  const questionMessages = messages.filter(msg => msg.type === 'question');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* フローティング反応メッセージ */}
      {floatingMessages.map((msg) => (
        <div
          key={msg.id}
          className="absolute animate-pulse text-3xl font-bold pointer-events-none text-blue-600"
          style={{
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 60 + 20}%`,
            animation: 'float 3s ease-in-out forwards',
            zIndex: 1000,
          }}
        >
          {msg.message}
        </div>
      ))}

      <div className="container mx-auto px-4 py-8 h-screen flex flex-col">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">セミナールーム</h1>
              <p className="text-gray-800">ルームID: <span className="font-mono font-bold text-blue-600">{roomId}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-800">
                {connected ? '接続中' : '切断中'}
              </span>
              <button
                onClick={exportChat}
                className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                disabled={!connected}
              >
                会話をエクスポート
              </button>
              <Link
                href="/"
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* チャットエリア */}
          <div className="flex-1 bg-white rounded-lg shadow-lg p-6 mb-6 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">質問・コメント</h2>
            
            <div 
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto space-y-4 mb-4"
              onScroll={handleScroll}
            >
              {questionMessages.length === 0 ? (
                <p className="text-gray-700 text-center py-8">まだ質問・コメントがありません</p>
              ) : (
                questionMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      msg.replies.length > 0 
                        ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedMessage(msg)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                      {msg.replies.length > 0 && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full">
                          {msg.replies.length}件の回答
                        </span>
                      )}
                    </div>
                    <p className="text-gray-900">{msg.message}</p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* メッセージ入力 */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="質問やコメントを入力..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                    sendReaction(e.currentTarget.value, 'question');
                    e.currentTarget.value = '';
                  }
                }}
                disabled={!connected}
              />
              <button
                onClick={(e) => {
                  const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                  if (input.value.trim()) {
                    sendReaction(input.value, 'question');
                    input.value = '';
                  }
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                disabled={!connected}
              >
                送信
              </button>
            </div>
          </div>

          {/* 反応ボタン */}
          <div className="bg-white rounded-lg shadow-lg p-6 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">反応を送る</h2>
            <div className="grid grid-cols-4 gap-3">
              {reactionButtons.map((reaction) => (
                <button
                  key={reaction.text}
                  onClick={() => sendReaction(reaction.text, 'reaction')}
                  className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-center transition-colors"
                  disabled={!connected}
                >
                  <div className="text-lg font-bold text-blue-600">{reaction.text}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 回答モーダル */}
      {selectedMessage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">回答を投稿</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700 mb-2">
                {new Date(selectedMessage.timestamp).toLocaleString()}
              </p>
              <p className="text-gray-900">{selectedMessage.message}</p>
            </div>

            {selectedMessage.replies.length > 0 && (
              <div className="mb-4 max-h-32 overflow-y-auto">
                <h4 className="text-sm font-medium text-gray-800 mb-2">既存の回答:</h4>
                {selectedMessage.replies.map((reply) => (
                  <div key={reply.id} className="p-2 bg-blue-50 rounded mb-2">
                    <p className="text-xs text-gray-700">
                      {new Date(reply.timestamp).toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-900">{reply.reply}</p>
                  </div>
                ))}
              </div>
            )}

            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="回答を入力..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              rows={3}
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedMessage(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                キャンセル
              </button>
              <button
                onClick={sendReply}
                className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                disabled={!replyText.trim()}
              >
                回答を投稿
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes float {
          0% {
            transform: translateY(0px) scale(1);
            opacity: 1;
          }
          50% {
            transform: translateY(-30px) scale(1.2);
            opacity: 0.8;
          }
          100% {
            transform: translateY(-60px) scale(0.8);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}