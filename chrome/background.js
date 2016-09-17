chrome.browserAction.onClicked.addListener(function(tab) {
  // Send a message to the active tab
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    var activeTab = tabs[0];
    chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
    console.log("hey");
  });
});

function postRequest(url, data, callback){
	var request = new XMLHttpRequest();
	//console.log("URL: %s, data: %s, cb: %s", url, data, callback);
	request.open("POST", url, true);
	request.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
	request.send(JSON.stringify(data));
	request.onreadystatechange = function(){
		if(request.readyState ==4){
			var obj = JSON.parse(request.responseText);
			console.log(obj);
		}
	}
}