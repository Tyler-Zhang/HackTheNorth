var http    = require("http");
var express = require("express");
var app     = express();
var path    = require("path");
var log     = require("bunyan")
                .createLogger({
                    name: "Dessr",
                    streams: [
                    {level: "debug", stream: process.stdout},
                    {level: "warn", path: "logs.log"}
                    ]
                })
var mongo   = require("mongodb")
              .MongoClient;
var uuid    = require("uuid");
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

app.use(express.static(__dirname));
//app.use(express.bodyParser({uploadDir:'files'}));

addPostListener("/createacc", (res, data) => {
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

addPostListener("/auth", (res, data) => {
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

addPostListener("/update", (res, data) => {
    if(!checkData(res, data, ["auth"]))
        return;
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