import { createServer } from 'http';
import { Server } from 'socket.io';

const server = createServer();
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// 接続中のユーザーを管理
const connectedUsers = new Map();
const roomMessages = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // ルームに参加
  socket.on('join-room', (roomId: string) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
    
    // 既存のメッセージを送信
    const messages = roomMessages.get(roomId) || [];
    socket.emit('room-messages', messages);
  });

  // 反応を送信
  socket.on('send-reaction', (data: { roomId: string, message: string, type: 'reaction' | 'question' }) => {
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
    const messageIndex = messages.findIndex(msg => msg.id === data.messageId);
    
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
    const exportData = {
      roomId: data.roomId,
      exportTime: new Date().toISOString(),
      messages: messages.map(msg => ({
        timestamp: msg.timestamp,
        type: msg.type,
        message: msg.message,
        replies: msg.replies
      }))
    };
    
    socket.emit('chat-exported', exportData);
    console.log(`Chat exported for room ${data.roomId}`);
  });

  // 切断処理
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    connectedUsers.delete(socket.id);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Socket.IO server running on port ${PORT}`);
  console.log(`Access from local network: http://[YOUR-IP]:${PORT}`);
});