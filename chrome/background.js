// Check if there's a pre-existing auth token
var token;
//chrome.storage.sync.set({dressrToken: null}, () => {});

chrome.storage.sync.get("dressrToken", value =>{
    console.log(value.dressrToken);
    if(value.dressrToken != null)
        chrome.browserAction.setPopup({popup: "popup.html"})
});

chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
      console.log(msg);
        if(msg.auth)
        {
            token = msg.auth;
            chrome.storage.sync.set({dressrToken: token}, (e) => {
                console.log(e);
            });
            port.postMessage("popup.html");
            chrome.browserAction.setPopup({popup: "popup.html"})
        }
  });
});

function postRequest(url, data, callback){
	var request = new XMLHttpRequest();
	request.open("POST", url, true);
	request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	request.send(JSON.stringify(data));
	request.onreadystatechange = function(){
		if(request.readyState ==4){
			var obj = JSON.parse(request.responseText);
			callback(obj);
		}
	}
}