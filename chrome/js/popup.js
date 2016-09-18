var firstLoad = true;
var auth, clothing;

var port = chrome.extension.connect({name: "pop-up"});
port.postMessage({command: "data"});
port.onMessage.addListener(function(msg) {
    auth = msg.auth;
    clothing = msg.clothing;
    processData();
});

function processData()
{
    var wordCounter = [];
    var wordCounterAmt = [];
    var url = "http://104.155.132.7/img/" + auth + "/";
    var container = document.getElementById("isotope-gallery-container");
    container.innerHTML = "";
    for(var x = 0; x < clothing.length; x ++)
    {
        var format = '<div class="col-xs-6 gallery-item-wrapper tops bottoms"><div class="gallery-item">  <div class="gallery-thumb"><img src="' + url + clothing[x].p  + '" class="img-responsive" alt="1st gallery Thumb"><div class="image-overlay"></div><a href="#" class="gallery-link"></a></div><div class="gallery-details"><div class="editContent"><h5>' + clothing[x].tags.toString() + '</h5></div></div></div></div>';

        container.innerHTML += format;

        for(var y = 0; y < clothing[x].tags.length; y++)
        {
            var curr = clothing[x].tags[y];
            var idx = wordCounter.indexOf(curr);
            if( idx >= 0)
            {
                wordCounterAmt[idx]++;
            } else {
                idx = wordCounter.length;
                wordCounter[idx] = curr;
                wordCounterAmt[idx] = 1;
            }
        }
    }    
    if(firstLoad)
        mostPopFilter(wordCounterAmt, wordCounter);
}
function mostPopFilter(wordCounterAmt, wordCounter)
{
    var flag = true;
    while(flag)
    {
        flag = false;
        for(var x = 0; x < wordCounter.length -1; x++)
        {
            if(wordCounterAmt[x] < wordCounterAmt[x+1])
            {
                flag = true;
                var temp = wordCounterAmt[x];
                wordCounterAmt[x] = wordCounterAmt[x+1];
                wordCounterAmt[x+1] = wordCounterAmt[x];

                var temp = wordCounter[x];
                wordCounter[x] = wordCounter[x+1];
                wordCounter[x+1] = wordCounter[x];                    
            }
        }
    }
    var container = document.getElementById("top_buttons");
    
    for(var x = 0; x < Math.min(6, wordCounter.length); x++)
    {
        var format = '<li><a class = "btn btn-primary" role="button" href="#" data-filter=".' + wordCounter[x] + '"onClick="filter("' + wordCounter[x] + '")">' + wordCounter[x] + '</a></li>';
        container.innerHTML += format;
    }
}

function filter(f)
{
    if(f.toUpperCase() == "ALL")
        return processData(clothing);

    var filteredData = [];

    for(var x = 0; x < clothing.length; x ++)
    {
        if(clothing[x].tags.indexOf(f) >= 0)
            filteredData.push(clothing[x]);
    }

    processData(filteredData);
}