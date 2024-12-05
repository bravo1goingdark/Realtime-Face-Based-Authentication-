import express from "express";
import { PrismaClient } from "@prisma/client";
import bodyParser from "body-parser";
import { Server } from "socket.io";
import http from "http";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"],
  },
});
const prisma = new PrismaClient();

app.use(bodyParser.json());

app.get("/detail/:name", async (req, res) => {
  const name = req.params.name;

  const embedding = await prisma.user.findMany({
    where: {
      name: name,
    },
    select: {
      faceEmbedding: true,
    },
  });

  if (!embedding) {
    return res.json({
      msg: "no user exist with this name",
    });
  }
  return res.status(200).send(embedding);
});

app.post("/register", async (req, res) => {
  const { name, email, faceEmbedding, gender, age } = req.body;
  try {
    const newUser = await prisma.user.create({
      data: { name, email, faceEmbedding, gender, age },
    });
    res.json(newUser);
  } catch (error) {
    res.status(400).json({ error: "User registration failed." });
  }
});

io.on("connection", (socket) => {
  socket.on("authenticate", async ({ faceEmbedding }) => {
    const users = await prisma.user.findMany({
      select: {
        name: true,
        faceEmbedding: true,
      },
    });
    const match = users.find((user) =>
      isMatch(user.faceEmbedding, faceEmbedding)
    );

    if (match) {
      socket.emit("authResult", { success: true, user: match.name });
    } else {
      socket.emit("authResult", { success: false });
    }
  });
});

function isMatch(embedding1, embedding2) {
  const distance = Math.sqrt(
    embedding1.reduce(
      (sum, emb, i) => sum + Math.pow(emb - embedding2[i], 2),
      0
    )
  );
  return distance < 0.6;
}

server.listen(3000, () =>
  console.log("Server running on http://localhost:3000")
);
