'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import Link from 'next/link';

interface Message {
  id: string;
  message: string;
  type: 'reaction' | 'question';
  timestamp: string;
}

export default function Room() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [socket, setSocket] = useState<Socket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);
  const [floatingMessages, setFloatingMessages] = useState<(Message & { id: string })[]>([]);

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
      
      // フローティングメッセージを追加
      const floatingMessage = { ...message, id: Date.now().toString() };
      setFloatingMessages(prev => [...prev, floatingMessage]);
      
      // 3秒後にフローティングメッセージを削除
      setTimeout(() => {
        setFloatingMessages(prev => prev.filter(m => m.id !== floatingMessage.id));
      }, 3000);
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

  const reactionButtons = [
    { emoji: '👍', label: 'いいね' },
    { emoji: '👏', label: '拍手' },
    { emoji: '😂', label: '笑' },
    { emoji: '😮', label: '驚き' },
    { emoji: '🤔', label: '考え中' },
    { emoji: '❤️', label: 'ハート' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
      {/* フローティングメッセージ */}
      {floatingMessages.map((msg) => (
        <div
          key={msg.id}
          className={`absolute animate-pulse text-2xl font-bold pointer-events-none ${
            msg.type === 'reaction' 
              ? 'text-blue-600' 
              : 'text-orange-600'
          }`}
          style={{
            left: `${Math.random() * 80 + 10}%`,
            top: `${Math.random() * 60 + 20}%`,
            animation: 'float 3s ease-in-out forwards',
          }}
        >
          {msg.message}
        </div>
      ))}

      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">セミナールーム</h1>
              <p className="text-gray-600">ルームID: <span className="font-mono font-bold text-blue-600">{roomId}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connected ? '接続中' : '切断中'}
              </span>
              <Link
                href="/"
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
              >
                ホームに戻る
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 反応ボタン */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">反応を送る</h2>
              
              <div className="mb-6">
                <h3 className="text-md font-medium text-gray-700 mb-3">絵文字で反応</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {reactionButtons.map((reaction) => (
                    <button
                      key={reaction.emoji}
                      onClick={() => sendReaction(reaction.emoji, 'reaction')}
                      className="bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg p-4 text-center transition-colors"
                      disabled={!connected}
                    >
                      <div className="text-2xl mb-1">{reaction.emoji}</div>
                      <div className="text-xs text-gray-600">{reaction.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t pt-6">
                <h3 className="text-md font-medium text-gray-700 mb-3">質問・コメント</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="質問やコメントを入力..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
                    className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                    disabled={!connected}
                  >
                    送信
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* メッセージ履歴 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">履歴</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500 text-sm">まだメッセージがありません</p>
                ) : (
                  messages.slice(-20).map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-lg ${
                        msg.type === 'reaction' 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'bg-orange-50 border border-orange-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {msg.type === 'reaction' ? '反応' : '質問'}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm mt-1">{msg.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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