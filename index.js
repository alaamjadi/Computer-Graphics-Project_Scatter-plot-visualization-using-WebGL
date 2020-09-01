/* Modules  */
var fs = require("fs")
var http = require('http')
var serveStatic = require('serve-static')
var finalhandler = require('finalhandler')

// Serve port
var serverPort = process.env.PORT || 3000;

// Serve up public folder
var serve = serveStatic(__dirname + "/public", { 'index': ['index.html', 'index.htm'] })

// Create server
var server = http.createServer(function onRequest (req, res) {
  serve(req, res, finalhandler(req, res))
})

// Start the server
server.listen(serverPort)
console.log(
    "Your server is running on port %d (http://localhost:%d)",
    serverPort,
    serverPort
  );