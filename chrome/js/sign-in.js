$("#submitBtn").click(login);
console.log("test");
function login()
{
    var username = getVal("username");
    var password = getVal("password");
    var newaccount = $("#newaccount").prop('checked');
    postRequest("http://localhost/" + ((newaccount)? "createacc": "auth"), {username: username, password:password}, (obj) => {
        if(obj.type == "ERROR")
            alert(obj.body.message);
        else{
            console.log(obj);
            var port = chrome.extension.connect({name: "sign-in"});
            port.postMessage(obj.body);
            port.onMessage.addListener(function(msg) {
                console.log(msg);
                window.location.assign(msg);
            });
        }
    });
}