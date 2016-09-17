var http    = require("http");
var express = require("express");
var app     = express();
var path    = require("path");
var mongo   = require("mongodb")
              .MongoClient;
var uuid    = require("uuid");
var busboy  = require('connect-busboy');
var fs      = require("fs");
var log     = require("bunyan")
                .createLogger({
                    name: "Dessr",
                    streams: [
                    {level: "debug", stream: process.stdout},
                    {level: "warn", path: "logs.log"}
                    ]
                });

var usersdb;

mongo.connect("mongodb://localhost:27017/Dessr", (err, d) => {
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
        return usersdb.insertOne({usr: data.username, pass:data.password, auth: auth, clothing: []})
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
    }, e => {
        resp(res, ERR, {message: e.message});
    });
    
});

app.post('/update', (req, res) => {
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
            if(!checkData(res, obj, ["tags", "auth"]))
                return;
            obj.tags = obj.tags.trim().split(" ");
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
                fs.unlink(path.join(__dirname, "img", imageId), e => {
                    if(e) 
                        return console.log(err);
                    console.log('file deleted successfully');
                });  
            })
        });
    } catch(e)
    {
        log(e);
        resp(res, ERR, "an error occured");
    }
});

addPostListener("getdata", (res, data) => {
    usersdb.findOne({auth: data.auth}, {_id: 0, pass: 0, auth: 0})
    .then(d => {resp(res, SUC, d)},
          e => {resp(res, ERR, e.message)});
});

app.get("/getdata/:auth", (req,res) => {
    usersdb.findOne({auth: req.params.auth}, {_id: 0, pass: 0, auth: 0})
    .then(d => {resp(res, SUC, d)},
          e => {resp(res, ERR, e.message)});
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
            return resp(res, ERR, "You do not have access to this image");

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
    log.info("The server has been opened on port 80");
});