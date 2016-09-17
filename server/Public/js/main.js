function postRequest(url, data, callback){
	var request = new XMLHttpRequest();
	//console.log("URL: %s, data: %s, cb: %s", url, data, callback);
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

function displayError(msg){
	console.log("Error: " + msg);
	alert("ERROR: " + msg);
}

function genArray(i, tot, val) {
		var rtnArr = [];
		rtnArr[i] = val;
		return rtnArr
	}
	
function getVal(id)
{
	return document.getElementById(id).value;
}

function setVal(id, val)
{
	document.getElementById(id).value = val;
}
function setInner(id, val)
{
	document.getElementById(id).innerHTML = val;
}
