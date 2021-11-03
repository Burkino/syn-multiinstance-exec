const express = require("express");
const app = express();
const server = require('http').Server(app);

const WebSocket = require('ws');

const wss = new WebSocket.Server({ server });
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));

server.listen(1350, () => {
  console.log("Open the panel at http://localhost:1350");
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

function chunk(s, maxBytes) {
  let buf = Buffer.from(s);
  const result = [];
  while (buf.length) {
    result.push(buf.slice(0, maxBytes).toString());
    buf = buf.slice(maxBytes);
  }
  return result;
}

app.post("/", (req, res) => {
  var message = req.body;
  var script = chunk(message.script, 60000); // max size for a websocket message is 64 kb so break that shit up
  if (message.receiver == "all") {
    wss.clients.forEach((client) => {
      if (client.name != undefined && client.readyState == WebSocket.OPEN) {
        client.send("BEGIN SCRIPT");
        script.forEach((script) => {
          client.send(script);
        });
        client.send("END SCRIPT");
      }
    });
  } else {
    wss.clients.forEach((client) => {
      if (client.name == message.receiver && client.readyState == WebSocket.OPEN) {
        client.send("BEGIN SCRIPT");
        script.forEach((script) => {
          client.send(script);
        });
        client.send("END SCRIPT");
      }
    });
  }
  res.sendStatus(200);
});

var master = undefined;
wss.on('connection', (ws) => {

  ws.on('close', () => {
    if (ws != master) {
      if (master == undefined) { // if no master then just stop
        return;
      }
      console.log(`${ws.name} DISCONNECTED`);
      master.send(JSON.stringify({
        sender: ws.name,
        type: "removeclient",
      }));
      master.send(JSON.stringify({
        sender: ws.name,
        type: "updatelog",
        message: `Client issued disconnect.`
      }));
    }
  });

  ws.on('message', (message) => {
    message = JSON.parse(message);
    switch (message.type) {
      case "init":
        // Get client information
        if (message.sender == "MASTER") {
          master = ws;
          console.log("MASTER CONNECTED");
          wss.clients.forEach((client) => {
            if (client.name != undefined && client.readyState == WebSocket.OPEN) {
              master.send(JSON.stringify({
                sender: client.name,
                game: client.game,
                type: "addclient",
              }));
            }
          })
        } else {
          console.log(message.sender + " CONNECTED");
          ws.name = message.sender;
          ws.game = message.game;

          if (master == undefined) {  // if no master then just stop
            return;
          }

          wss.clients.forEach((client) => {
            if (client.name == ws.name) {
              master.send(JSON.stringify({
                sender: ws.name,
                type: "removeclient",
              }));
            }
          })
          master.send(JSON.stringify({
            sender: ws.name,
            game: ws.game,
            type: "addclient",
          }));

          master.send(JSON.stringify({
            sender: ws.name,
            type: "updatelog",
            message: "Connected to server."
          }));
        }
        break;
      case "log":
        // Send message to master, add new log
        if (master == undefined) {  // if no master then just stop
          return;
        }
        master.send(JSON.stringify({
          sender: ws.name,
          type: "updatelog",
          message: message.message
        }));
        break;
      default:
        console.error("Unknown message type: " + message.type);
    }
  });
});
