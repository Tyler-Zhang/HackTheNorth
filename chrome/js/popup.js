var port = chrome.extension.connect({name: "pop-up"});
port.postMessage({command: "data"});
port.onMessage.addListener(function(msg) {
    processData(msg.clothing, msg.auth);
});


function processData(clothing, auth)
{
    var url = "http://104.155.132.7/img/" + auth + "/";
    var container = document.getElementById("isotope-gallery-container");
    for(var x = 0; x < clothing.length; x ++)
    {
        var format = '<div class="col-xs-6 gallery-item-wrapper tops bottoms"><div class="gallery-item">  <div class="gallery-thumb"><img src="' + url + clothing[x].p  + '" class="img-responsive" alt="1st gallery Thumb"><div class="image-overlay"></div><a href="#" class="gallery-link"></a></div><div class="gallery-details"><div class="editContent"><h5>' + clothing[x].tags.toString() + '</h5></div></div></div></div>';

        container.innerHTML += format;
    }
}