var http    = require("http");
var express = require("express");
var app     = express();
var path    = require("path");
var mongo   = require("mongodb")
              .MongoClient;
var uuid    = require("uuid");
var busboy  = require('connect-busboy');
var fs      = require("fs");
var phantom = require("phantom");
var log     = require("bunyan")
                .createLogger({
                    name: "Dressr",
                    streams: [
                    {level: "debug", stream: process.stdout},
                    {level: "warn", path: "logs.log"}
                    ]
                });

var usersdb;

mongo.connect("mongodb://localhost:27017/Dressr", (err, d) => {
    if(err)
    {
        log.fatal(err);
        throw err;
    } else {
        log.info("Connected to the mongo database on port 27017")
        usersdb  = d.collection("users");
    }
});

app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.use(busboy());
app.use(express.static(path.join(__dirname, "Public")));

addPostListener("createacc", (res, data) => {
    if(!checkData(res, data, ["username", "password"]))
        return;
    
    usersdb.findOne({usr: data.username})
    .then(d => {
        if(d != null)
            throw new Error("User already exists");
    })
    .then(d => {
        var auth = uuid.v4();
        return usersdb.insertOne({usr: data.username, pass:data.password, auth: auth, clothing: [], bookmarks: []})
               .then(() => auth);
    })
    .then(d => {
        resp(res, SUC, {auth:d});
    })
    .catch(e => {
        resp(res, ERR, {message: e.message});
    });
});

addPostListener("auth", (res, data) => {
    if(!checkData(res, data, ["username", "password"]))
        return;
    
    usersdb.findOne({usr: data.username})
    .then(d => {
        if(d == null)
            throw new Error("User not found");
        if(d.pass != data.password)
            throw new Error("Password mismatch");
        resp(res, SUC, {auth: d.auth});
    })
    .catch( e => {
        resp(res, ERR, {message: e.message});
    });
});

app.post('/update', (req, res) => {
    log.info("Request Recieved");
    var fstream, imageId;
    req.pipe(req.busboy);
    req.busboy.on('file', function (fieldname, file, filename) {
        //Path where image will be uploaded
        imageId = uuid.v4() + ((filename.split(".")[1] == undefined)? "" : "." +filename.split(".")[1]);
        fstream = fs.createWriteStream(__dirname + '/img/' + imageId);
        file.pipe(fstream);
        fstream.on('close', function () {});
    });
    var obj = {};
    try {
        req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            obj[fieldname] = val;
        });

        req.busboy.on("finish", function(){
            if(!checkData(res, obj, ["auth"]))
                return fs.unlink(path.join(__dirname, "img", imageId), e => {
                            if(e) 
                                return log(err);
                            console.log('File deleted successfully');
                        }); 

            if(obj.tags)
                obj.tags = obj.tags.trim().split(" ");
            else obj.tags = [];

            usersdb.findOne({auth: obj.auth})
            .then(d => {
                if(d == null)
                    throw new Error("Account not found");
                return d._id;
            })
            .then(d => {
                return usersdb.updateOne({_id: d},  {$push: {clothing: {p: imageId, tags: obj.tags}}});
            })
            .then(d => {
                resp(res, SUC, "Updated");
            })
            .catch(e => {
                resp(res, ERR, e.message);
                log(e);
                fs.unlink(path.join(__dirname, "img", imageId), e => {
                    if(e) 
                        return console.log(err);
                    console.log('File deleted successfully.');
                });  
            })
        });
    } catch(e)
    {
        log(e);
        resp(res, ERR, "An error occured.");
    }
});

addPostListener("bookmark", (res, data) => {
    if(!checkData(res, data, ["auth", "url"]))
        return;
    usersdb.findOne({auth: data.auth})
    .then(d => {
        if(d == null)
            throw new Error("Account not found!")
        return usersdb.updateOne({auth: data.auth}, {$push : {bookmarks: {url: data.url, title: data.title, price: data.price}}})
    })
    .then( d => {resp(res, SUC, "Bookmark Saved")},
           e => {resp(res, ERR, e.message)});
})

addPostListener("getdata", (res, data) => {
    usersdb.findOne({auth: data.auth}, {_id: 0, pass: 0, auth: 0})
    .then(d => {resp(res, SUC, d)},
          e => {resp(res, ERR, e.message)});
});

addPostListener("analyze", (res, data) => {
    if(!checkData(res, data, ["auth", "url"]))
        return;
    console.log(data);
    usersdb.findOne({auth: data.auth}, {_id: 0,clothing:1})
    .then(d => {
        if(d == null)
            throw new Error("Account not found");
        return d.clothing;
    })
    .then(d => {
        return phantom.create().then(ph => {
            return ph.createPage().then(cp => {
                return {content:d, page:cp}
            });
        })
    })
    .then(d => {
        return d.page.open(data.url).then(cp => {
            return {content: d.content, page: d.page}
        });
    })
    .then(d => {
        return d.page.property('plainText').then(cp => {
            return {content: d.content, page: cp.toUpperCase()}
        });
    })
    .then(d => {
        total = 0;
        for (var x = 0; x < d.content.length; x++) {
            var score = 0;
            for (var y = 0; y < d.content[0].tags.length; y++) {
                if(d.page.indexOf(d.content[x].tags[y].toUpperCase()) >= 0)
                    score++;
            }
            total += score >=2;
            
        if(total > 0)
            resp(res, SUC, {own: true, total});
        else
            resp(res, SUC, {own: false});
        }
    })
    .catch(e =>{
        resp(res, ERR, e.message);
    })

});

app.get("/getdata/:auth", (req,res) => {
    usersdb.findOne({auth: req.params.auth}, {_id: 0, pass: 0, auth: 0})
    .then(d => {
        if(d != null)
            return resp(res, SUC, d);
        throw new Error("Account not found.");
    })
    .catch( e => {resp(res, ERR, e.message)});
})

app.get("/img/:auth/:imageid", (req, res) => {
    var auth = req.params.auth;
    var imageid = req.params.imageid;
    console.log(auth);
    console.log(imageid);
    usersdb.aggregate([
        {$match: {auth: auth}},
        {$unwind: "$clothing"},
        {$match: {"clothing.p": imageid}}
    ], (e,r) => {
        if(e)
            return resp(res, ERR, e.message);
        if(r.length == 0)
            return resp(res, ERR, "You do not have access to this image.");

        res.sendFile(path.join(__dirname, 'img', imageid));
    })
});


function addPostListener(URL, callBack)
{
    app.post("/" + URL, (req, res) => {
        try{
            var body="";
            req.on("data",function(data){
                body+=data;
            });

            req.on("end", () => {
                var data = JSON.parse(body);
                callBack(res, data);
            });
        } catch(err) {
            log.error(err);
        }
    });
}

function checkData(res, data, args)
{
    for(var x = 0; x < args.length; x++)
        if(!data.hasOwnProperty(args[x]))
        {
            resp(res, ERR, "ARGUMENT [" + args[x] + "] MISSING");
            return false;
        }
    return true;
}

var ERR = "ERROR";
var SUC = "SUCCESS";
function resp(res, type, body)
{
    log.trace(body);
    var rtnObj = {
        type: type,
        body: body
    };
    res.json(rtnObj);
    log.trace({type: type, body: body});
}


// Create web server
http.createServer(app).listen(80, function(){
    log.info("The server has been opened on port 80.");
});