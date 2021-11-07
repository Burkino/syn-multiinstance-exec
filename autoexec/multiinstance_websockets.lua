-- https://github.com/Burkino/syn-multiinstance-exec

--// Wait Until Game is Loaded

if not game:IsLoaded() then -- If game isn't already loaded
    game.Loaded:Wait() -- Wait until game is loaded
end

--// Init Variables 

local PlaceName = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name -- Name of current place
local PlayerName = game:GetService("Players").LocalPlayer.Name -- Local player username
local HttpService = game:GetService("HttpService") -- Service used for JSON encoding in the script

--// Setup Websocket

local WebSocket = syn.websocket.connect("ws://localhost:1350") -- Connect to websocket
local WebSocketScript = "" -- Create a placeholder string

WebSocket.OnMessage:Connect(function(Message) -- Create a connection to the event fired when a message is sent to the websocket
    if Message == "BEGIN SCRIPT" then
        WebSocketScript = "" -- Reset placeholder string to be empty
    elseif Message == "END SCRIPT" then
        loadstring(WebSocketScript)() -- Execute websocket script
    else
        WebSocketScript = WebSocketScript .. Message -- Concat placeholder string to add script content
    end
end)

--// Send Init Data to Server With Player Info

WebSocket:Send(HttpService:JSONEncode({
    type = "init",
    sender = PlayerName,
    game = PlaceName
}))

--// Send a Log to the Websocket When Something is Outputted to the Console

game:GetService("LogService").MessageOut:Connect(function(Message)
    WebSocket:Send(HttpService:JSONEncode({
        type = "log",
        message = Message
    }))
end)
