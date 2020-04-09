const http = require("http");

const WebSocketServer = require("websocket").server;
let connection

const httpserver = http.createServer((request, response) => {
    console.log("Server is open");
})

const websocket = new WebSocketServer({
    "httpServer": httpserver
})

websocket.on("request", request => {
    connection = request.accept(null, request.origin);
    connection.on("onopen", () => console.log("We OPEN"));
    connection.on("onclose", () => console.log("We Shut it down"));
    connection.on("onmessage", message => console.log(`The message: ${message}`));
})

httpserver.listen(8080, () => console.log("We running this!"));