--https://github.com/Burkino/syn-multiinstance-exec
repeat task.wait() until game:IsLoaded()

local gname = game:GetService("MarketplaceService"):GetProductInfo(game.PlaceId).Name -- Where the fuck you are
local pname = game:GetService("Players").LocalPlayer.Name -- Who the fuck you are
local http = game:GetService("HttpService") -- Only useful for jsonencode

-- Connect

local WebSocket = syn.websocket.connect("ws://localhost:1350")
-- Execute any shit sent to you
local blank = ""
WebSocket.OnMessage:Connect(function(msg)
    if msg == "BEGIN SCRIPT" then   -- Websockets can send a max of 64kB
        blank = "";
    elseif msg == "END SCRIPT" then -- So split that shit up
        setclipboard(blank)
        loadstring(blank)()         -- And then run that shit
    else
        blank ..= msg          -- Add the shit together
    end
end)

-- Tell server who and where you are
WebSocket:Send(http:JSONEncode({
    type = "init",
    sender = pname,
    game = gname
}))

-- This is probably the wrong code but fuck you
game:GetService("LogService").MessageOut:Connect(function(msg)
    WebSocket:Send(http:JSONEncode({
        type = "log",
        message = msg
    }))
end)
