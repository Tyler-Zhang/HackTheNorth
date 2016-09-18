// Check if there's a pre-existing auth token
// chrome.storage.sync.set({dressrToken: null}, () => {});
var token, userData, lastRefresh, refreshRate = 60*1000;

chrome.storage.sync.get("dressrToken", value => {
    console.log(value.dressrToken);
    if (value.dressrToken != null) {
        chrome.browserAction.setPopup({ popup: "popup.html" });
        token = value.dressrToken;
        chrome.storage.sync.set({dressrToken: token});
    }
});

chrome.extension.onConnect.addListener(function (port) {
    if(port.name == "sign-in")
    port.onMessage.addListener(function (msg) {
        console.log(msg);
        if (msg.auth) {
            token = msg.auth;
            chrome.storage.sync.set({ dressrToken: token }, (e) => {
                console.log(e);
            });
            port.postMessage("popup.html");
        }
    });

    else if(port.name =="pop-up")
    {
        port.onMessage.addListener(function (msg) {
            if(msg.command == "data")
            {
                if(!userData || new Date().getTime() - lastRefresh.getTime() > refreshRate)
                {
                    postRequest("http://104.155.132.7/getdata", {auth: token}, (data) => {
                        if(data.type == "ERROR")
                            return console.log(data.body);
                        userData = data.body;
                        userData.auth = token;
                        port.postMessage(userData);
                    })
                }
            }
        });

    }
});

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    if(request.url)
    {
        console.log(request);
        if(!token)
            console.log("System can't run before token is set");
        sendResponse({});
        postRequest("http://104.155.132.7/analyze", {auth: token, url: request.url}, (obj) => {
            if(obj.type == "ERROR")
                return console.log("ERROR "+obj.body);
            console.log(obj);
            if(obj.body.own == true)
                chrome.notifications.create('Temsting name', {
                    type: 'basic',
                    iconUrl: 'img/logo.png',
                    title: "Don't buy this!",
                    message: "You already have " + obj.body.total + " similar ones!"
                },
                function () { }
            );
        })
    }
      
  });

function postRequest(url, data, callback) {
    var request = new XMLHttpRequest();
    request.open("POST", url, true);
    request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
    request.send(JSON.stringify(data));
    request.onreadystatechange = function () {
        if (request.readyState == 4) {
            var obj = JSON.parse(request.responseText);
            callback(obj);
        }
    }
}

var websitesList = [
    "thebay.com",
    "walmart.ca",
    "abercrombie.ca",
    "www.ae.com",
    "victoriassecret.com",

]