const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const aimodule = require("./aimodule");
const db_con = require("./dbconfig");

// create new express server
const app = express();
const server = http.createServer(app);

// create new socket.io server
const io = new Server(server, {
  cors: {
    origin: "https://enlighten-ed-omega.vercel.app",
    methods: ["GET", "POST"],
    credentials: true,
  },
  path: "/socket.io",
});

// setup cors authentication for 'app'
app.use(cors({
  origin: "https://enlighten-ed-omega.vercel.app",
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json()); // Middleware for parsing JSON
app.use("/api", aimodule); // Mount AI module under /api

io.on("connection", (socket) => {
  // log connection success msg and emit socket.id 
  // (will be later used as peer id)
  console.log(`New client connected: ${socket.id}`);
  socket.emit("me", socket.id);

  // for video conferencing
  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
    socket.broadcast.emit("callEnded");
  });

  socket.on("callUser", ({ userToCall, signalData, from, name }) => {
    io.to(userToCall).emit("callUser", { signal: signalData, from, name });
  });

  socket.on("answerCall", (data) => {
    io.to(data.to).emit("callAccepted", data.signal);
  });

  // Handle when a user sends a message
  socket.on('sendMessage', async (messageData) => {
    try {
      // Save the message to the database
      let result;
      
      if (messageData.type === 'individual') {
        // Save individual message
        const { data, error } = await db_con
          .from('messages')
          .insert({
            msg_from: messageData.from,
            msg_to: messageData.to,
            msg_content: messageData.content,
            msg_from_name: messageData.from_name
          })
          .select();
          
        if (error) throw error;
        result = data[0];
        
        // Emit to specific recipient
        io.emit('newMessage', result);
        
      } else if (messageData.type === 'group') {
        // Save group message
        const { data, error } = await db_con
          .from('group_messages')
          .insert({
            msg_from: messageData.from,
            group_id: messageData.group_id,
            msg_content: messageData.content
          })
          .select();
          
        if (error) throw error;
        result = data[0];
        
        // Emit to everyone in the group
        io.emit('newMessage', result);
      }
      
      // Acknowledge message was saved
      socket.emit('messageSaved', { success: true, messageId: result.id });
      
    } catch (error) {
      console.error('Error saving message:', error);
      socket.emit('messageSaved', { success: false, error: error.message });
    }
  });
});

const PORT = process.env.PORT || 443;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
