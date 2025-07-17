import { createServer } from 'http';
import { Server } from 'socket.io';
import { URL } from 'url';

interface Message {
  id: string;
  message: string;
  type: 'reaction' | 'question' | 'comment';
  timestamp: string;
  replies: Reply[];
}

interface Reply {
  id: string;
  reply: string;
  timestamp: string;
}

const server = createServer((req, res) => {
  // ヘルスチェック機能を追加
  if (req.url === '/health' || req.url === '/socket.io/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      connections: io ? io.sockets.sockets.size : 0
    }));
    return;
  }
  
  // その他のリクエストは404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

// 接続中のユーザーを管理
const connectedUsers = new Map();
const roomMessages = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  console.log('Current connections:', io.sockets.sockets.size);

  // ルームに参加
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // 既存のメッセージを送信
    const messages = roomMessages.get(roomId) || [];
    socket.emit('room-messages', messages);
  });

  // 反応を送信
  socket.on('send-reaction', (data: { roomId: string, message: string, type: 'reaction' | 'question' | 'comment' }) => {
    const messageData = {
      id: Date.now().toString(),
      message: data.message,
      type: data.type,
      timestamp: new Date().toISOString(),
      replies: []
    };

    // メッセージを保存
    if (!roomMessages.has(data.roomId)) {
      roomMessages.set(data.roomId, []);
    }
    roomMessages.get(data.roomId).push(messageData);

    // ルーム内の全員に送信
    io.to(data.roomId).emit('new-reaction', messageData);
    console.log(`Reaction sent to room ${data.roomId}:`, messageData);
  });

  // 回答を送信
  socket.on('send-reply', (data: { roomId: string, messageId: string, reply: string }) => {
    const messages = roomMessages.get(data.roomId) || [];
    const messageIndex = messages.findIndex((msg: Message) => msg.id === data.messageId);
    
    if (messageIndex !== -1) {
      const replyData = {
        id: Date.now().toString(),
        reply: data.reply,
        timestamp: new Date().toISOString()
      };
      
      messages[messageIndex].replies.push(replyData);
      
      // ルーム内の全員に更新を送信
      io.to(data.roomId).emit('message-updated', messages[messageIndex]);
      console.log(`Reply sent to message ${data.messageId} in room ${data.roomId}`);
    }
  });

  // 会話ログをエクスポート
  socket.on('export-chat', (data: { roomId: string }) => {
    const messages = roomMessages.get(data.roomId) || [];
    // リアクション（reaction）タイプのメッセージを除外し、質問とコメントのみをエクスポート
    const filteredMessages = messages.filter((msg: Message) => msg.type !== 'reaction');
    const exportData = {
      roomId: data.roomId,
      exportTime: new Date().toISOString(),
      messages: filteredMessages.map((msg: Message) => ({
        timestamp: msg.timestamp,
        type: msg.type,
        message: msg.message,
        replies: msg.replies
      }))
    };
    
    socket.emit('chat-exported', exportData);
    console.log(`Chat exported for room ${data.roomId} (${filteredMessages.length} messages, reactions excluded)`);
  });

  // 切断処理
  socket.on('disconnect', (reason) => {
    console.log('User disconnected:', socket.id, 'Reason:', reason);
    console.log('Remaining connections:', io.sockets.sockets.size);
    connectedUsers.delete(socket.id);
  });
});

// Renderでは$PORT+1を使用、ローカルでは3001
const SOCKET_PORT = process.env.NODE_ENV === 'production' 
  ? (process.env.PORT ? Number(process.env.PORT) + 1 : 10001)
  : (process.env.SOCKET_PORT || 3001);

server.listen(Number(SOCKET_PORT), '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${SOCKET_PORT}`);
  console.log(`Access from local network: http://[YOUR-IP]:${SOCKET_PORT}`);
  console.log(`Health check available at: http://localhost:${SOCKET_PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});