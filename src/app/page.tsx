'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [roomId, setRoomId] = useState('');

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createRoom = () => {
    const newRoomId = generateRoomId();
    setRoomId(newRoomId);
    // 少し待ってから自動的にルームに移動
    setTimeout(() => {
      window.location.href = `/room/${newRoomId}`;
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">ワイチャ！</h1>
          <p className="text-gray-800">ワイワイ・チャット！</p>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-3">新しいRoomを作成</h2>
            <button
              onClick={createRoom}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              ルームを作成
            </button>
            {roomId && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-800 mb-2">ルームID:</p>
                <p className="text-lg font-mono font-bold text-blue-600">{roomId}</p>
                <Link
                  href={`/room/${roomId}`}
                  className="inline-block mt-3 bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-colors text-sm"
                >
                  ルームに入る
                </Link>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">既存のルームに参加</h2>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ルームIDを入力"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Link
                href={roomId ? `/room/${roomId}` : '#'}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  roomId
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                onClick={!roomId ? (e) => e.preventDefault() : undefined}
              >
                参加
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-700">
            匿名でワンクリック反応・リアルタイム共有
          </p>
        </div>
      </div>
    </div>
  );
}
