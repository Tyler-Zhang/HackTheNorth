var firstLoad = true;
var auth, clothes;

var port = chrome.extension.connect({name: "pop-up"});
port.postMessage({command: "data"});
port.onMessage.addListener(function(msg) {
    auth = msg.auth;
    clothes = msg.clothing;
    processData();
});

function processData(overloadedSet)
{
    var clothing = overloadedSet || clothes;
    console.log(clothes);
    console.log(overloadedSet);
    console.log(clothing);

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
            var curr = clothing[x].tags[y].toUpperCase();
            console.log(curr);
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
    firstLoad = false;
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
                wordCounterAmt[x+1] = temp;

                var temp = wordCounter[x];
                wordCounter[x] = wordCounter[x+1];
                wordCounter[x+1] = temp;                    
            }
        }
    }
    var container = document.getElementById("top_buttons");
    
    for(var x = 0; x < Math.min(6, wordCounter.length); x++)
    {
        var format = '<li><a id="filter-' +  wordCounter[x] + '" data-filter="' + wordCounter[x] + '" class = "btn btn-primary filterClass" role="button" href="#" data-filter=".' + wordCounter[x] + '")">' + wordCounter[x] + '</a></li>';
        container.innerHTML += format;
        $(".filterClass").click(function(evt){
            filter($(this).data("filter"));
        });
        
    }
}

function filter(f)
{
    if(f.toUpperCase() == "ALL") {
        processData();
        return;
    }

    var filteredData = [];

    for(var x = 0; x < clothes.length; x ++)
    {
        if(clothes[x].tags.map(function(a){
            return a.toUpperCase()
        }).indexOf(f) >= 0) {
            filteredData.push(clothes[x]);
        }
    }

    processData(filteredData);
}