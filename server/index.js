/*
The keyword require allows us to load modules into the program
The various modules allow us to use:
*/

var http    = require("http");
var express = require("express");
var app     = express();     // Create an Express application
var path    = require("path");
var mongo   = require("mongodb") //Create a new mmongoDB instance. We need to use a database to store data.
              .MongoClient;
var uuid    = require("uuid");
var busboy  = require('connect-busboy');
var fs      = require("fs");
var phantom = require("phantom");

/*
The bunyan module allows us to do fast and fairly easy JSON 
logging.
Create a log to use for recording important data
*/
var log     = require("bunyan")
                .createLogger({
                    name: "Dressr",
                    streams: [                                               
                    {level: "debug", stream: process.stdout},                 
                    {level: "warn", path: "logs.log"}                         
                    ]
                });

var usersdb;


/*
We connect to the mongo database. The function takes three arguments.

    Parameters: 
    
    -url (String): url connection for MongoDB
    -callback (function): Is called after the completion of the connect method. The function contains two parameters itself.
                          The callback function checks if an error has occcured or not. If error has occured, then log the error.
                          otherise 
        -Paramters: -err (object): err contains the error if it has occurred, otherwise it is null
                    -d (object): contains the initialized database object, otherwise it is null if error has occurrd.
*/
mongo.connect("mongodb://localhost:27017/Dressr", (err, d) => {
    if(err)                                         
    {
        log.fatal(err);             
        throw err;
    } else {
        log.info("Connected to the mongo database on port 27017")
        usersdb  = d.collection("users");    //create a collection (aka table) in the database, call the collection table name users
    }
});

/*
This method routes an HTTP request. Instead of matching a single HTTP verb (i.e GET,PUT,POST,etc), it matches all of the HTTP verbs.

Parameters: 
    path (string): the parh specified for the function that is invoked.
    
    callback (function): This middleware fucntion (just a funciton that has acces to objects request, response and next function in the app's req-response cyle)

*/
app.all('*', function(req, res, next) {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});


app.use(busboy());                                                              //the app uses busboy which is a streaming parser for HTML form data
/*
    Builtin method that allows to serve static files (i.e images, JS files, etc)
    takes a string parameter which is the path of the static file
*/
app.use(express.static(path.join(__dirname, "Public")));       

/*
    A call to the addPostListener function. The function is for responding to post requests. For this call, we pass the string "creatacc" as the path for the callback function.
    Parameters: 
        path(string): the path for the function
        callback (function): the function to be used with the get request.
*/
addPostListener("createacc", (res, data) => {
    console.log("Create account recieved");
     /*
        we check if "username" and "password" are not valid (meaning if it does not have its own property) 
        in the data object, then we simply return
     */
    if(!checkData(res, data, ["username", "password"]))
        return;
    
    usersdb.findOne({usr: data.username})               //if the query given in the argument in findone is satisfied , then return the respective document (i.e. data record)
    .then(d => {
        if(d != null)                                    //if the value of object d is NOT null, that means the user was alreay created
            throw new Error("User already exists");
    })
    .then(d => {
        var auth = uuid.v4();                               //if the users doesnt exist, then we use the users information to create an entry in the database with the parameters supplied
               
        return usersdb.insertOne({usr: data.username, pass:data.password, auth: auth, clothing: [], bookmarks: []})
               .then(() => auth);
    })
    .then(d => {
        resp(res, SUC, {auth:d});               //respond to the log with and report it as a success
    })
    .catch(e => {                                //respond to the log with appropriate error messages
        resp(res, ERR, {message: e.message});
    });
});

/*
    A call to the addPostListener function. The function is for responding to post requests. For this call, we pass the string "auth" as the path for the callback function.
    Parameters: 
        path(string): the path for the function
        callback (function): the function to be used with the get request.
*/
addPostListener("auth", (res, data) => {
    /*
        we check if "username" and "password" are not valid (meaning if it does not have its own property) 
        in the data object, then we simply return
    */
    if(!checkData(res, data, ["username", "password"]))     
        return;
    
    usersdb.findOne({usr: data.username})         //if the query given in the argument in findone is satisfied , then return the respective document (i.e. data record)

    .then(d => {
        if(d == null)                               //if the user is not found, this means that the autorization failed
            throw new Error("User not found");         
        if(d.pass != data.password)                 //the passwords entered are not equal,so throw an appropriare 
            throw new Error("Password mismatch");   
        resp(res, SUC, {auth: d.auth});             //log the reponse as a succuss.
    })
    .catch( e => {
        resp(res, ERR, {message: e.message});
    });
});

/*
    Invokes the post method. The post method routes an HTTP post request to the path of the callback function that was specified. 
    Parameters: 
        path(string): the path for the function
        callback (function): the function to be used with the get request.

*/
app.post('/update', (req, res) => {
    log.info("Request Recieved");
    var fstream, imageId;
    req.pipe(req.busboy);           //allows us to connect this read stream to the argument provided. SImiliar to that of a unix pipe  
    
    /*
       The on method allows to bind to an event. If data is sent then we invoke the 
       callback function supplied as the second parameter
    */
    req.busboy.on('file', function (fieldname, file, filename) {
        //Parse the imageId and stream so they can later be used, in other funciton calls. This is the path will the image will be uploaded.
        imageId = uuid.v4() + ((filename.split(".")[1] == undefined)? "" : "." +filename.split(".")[1]);
        fstream = fs.createWriteStream(__dirname + '/img/' + imageId);           //creates a stream that is writable. Supplied with the fstream argument
        file.pipe(fstream);                                                     //allows us to connect (or pipe) the file with the argument, fstream
        fstream.on('close', function () {});                                    //close the file stream
    });
    var obj = {};
    
    /*
        The on method allows to bind to an event. If data is sent then we invoke the 
        callback function supplied as the second parameter.
    */
    try {
        req.busboy.on('field', function(fieldname, val, fieldnameTruncated, valTruncated, encoding, mimetype) {
            obj[fieldname] = val;
        });
        
        req.busboy.on("finish", function(){
            if(!checkData(res, obj, ["auth"]))                                   //we check if "auth" is not valid (meaning if it does not have its own property)
                return fs.unlink(path.join(__dirname, "img", imageId), e => {   //if its not valid then delete the value at the path specified
                            if(e)                                               //if an error occures somewhere, return the error in the log
                                return log(err);
                            console.log('File deleted successfully');         
                        }); 

            if(obj.tags)                                            //if obj.taks is true
                obj.tags = obj.tags.trim().split(" ");              //then remove all whitespaces and turnarray intro string by splitting on spaces.
            else obj.tags = [];                                     //otherwuse just set it to an empty array.

            usersdb.findOne({auth: obj.auth})                       //if the query given in the argument in findone is satisfied , then return the respective document (i.e. data record)

            .then(d => {
                if(d == null)                                       //if an account is not found
                    throw new Error("Account not found");              //that must mean that the value of the object d is null
                return d._id;                                           //otherwise we just want to return the value of _id
            })
            .then(d => {
                /*
                    if the account was found then we update the data record in the database with the 
                    respectives values supplied as arguments
                */
                return usersdb.updateOne({_id: d},  {$push: {clothing: {p: imageId, tags: obj.tags}}});         
            })
            .then(d => {
                resp(res, SUC, "Updated");                                  //this method allows to record a successfull response to the log
            })
                           
            .catch(e => {                                                   //if any error has occurred, then catch it and aldo report it to the log 
                resp(res, ERR, e.message);                              
                log(e);
                fs.unlink(path.join(__dirname, "img", imageId), e => {          //if its not valid then delete the value at the path specified
                    if(e)                                                       //if an error has occurred, report it to the console, otherwise 
                        return console.log(err);                                //report the file has been deleted 
                    console.log('File deleted successfully.');
                });  
            })
        });
    } catch(e)
    {           
        log(e);                                 //log the error as well has to respond with an error message
        resp(res, ERR, "An error occured.");
    }
});


/*
    A call to the addPostListener function. The function is for responding to post requests. For this call, we pass the string "bookmark" as the path for the callback function.
    Parameters: 
        path(string): the path for the function
        callback (function): the function to be used with the get request.
*/
addPostListener("bookmark", (res, data) => {
    //We call the checkData function to validate to check if supplied arguments are valid 
    
    if(!checkData(res, data, ["auth", "url"]))
        return;
     //if the query given in the argument in findone is satisfied , then return the respective document (i.e. data record)
    usersdb.findOne({auth: data.auth})
    .then(d => {
        if(d == null)                       //if the object d is null, this means that the account was not found during authorization
            throw new Error("Account not found!")
            
        /*
            if the account was found then we update the data record in the database with the 
            respectives values supplied as arguments
        */
        return usersdb.updateOne({auth: data.auth}, {$push : {bookmarks: {url: data.url, title: data.title, price: data.price}}})
    })
    .then( d => {resp(res, SUC, "Bookmark Saved")},         //Upon completion of the previous then method, save the info within the log.
           e => {resp(res, ERR, e.message)});               //of the respective result, i.e being successfull or an error.
})

/*
A call to the addPostListener function. The function is for responding to post requests. For this call, we pass the string "getdata" as the path for the callback function.

Parameters: 
    path(string): the path for the function
    callback (function): the function to be used with the get request.
    
*/
addPostListener("getdata", (res, data) => {
    //if the query given in the argument in findone is satisfied , then return the respective document (i.e. data record)
    usersdb.findOne({auth: data.auth}, {_id: 0, pass: 0, auth: 0})
     //call the then method which will allow to execute async function. Return approriate respnce depending on success or error.
    .then(d => {resp(res, SUC, d)},        
          e => {resp(res, ERR, e.message)});
});

/*

A call to the addPostListener function. The function is for responding to post requests. For this call, we pass the string "analyze" as the path for the callback function.

Parameters: 
    path(string): the path for the function
    callback (function): the function to be used with the get request.

the then method allows us to execute asynncronous operation. The funciton given in the argument of the then() 
method is used as the callback functions.
*/
addPostListener("analyze", (res, data) => {
    if(!checkData(res, data, ["auth", "url"]))      //check if data supplied if data is valid or not with the checkData function 
        return;
    console.log(data);                  
    /*if the query given in the argument in findone is satisfied , then return the respective document (i.e. data record)*/
    usersdb.findOne({auth: data.auth}, {_id: 0,clothing:1})     
    .then(d => {     
        if(d == null)                               //throw an error if the object is null. Throw this because account was not found.
            throw new Error("Account not found");   
        return d.clothing;                          
    })
    .then(d => {
        return phantom.create().then(ph => {        //create a phontom instance 
            return ph.createPage().then(cp => {     //from the phantom instance, create a phantom page
                return {content:d, page:cp}        
            });
        })
    })
    .then(d => {
        return d.page.open(data.url).then(cp => {      //the open method opens the url supplied and loads in to the respective page 
            return {content: d.content, page: d.page}
        });
    })
    .then(d => {
        return d.page.property('plainText').then(cp => {       //the page is saved as plain text
            return {content: d.content, page: cp.toUpperCase()}
        });
    })
    .then(d => {
        /*
            this function loops through the contents of the page to and increment score when the index of 
            of each element of content and each respective tags is greater than or equal to zero
        */
        total = 0;
        console.log(d.page);
        for (var x = 0; x < d.content.length; x++) {
            var score = 0;
            for (var y = 0; y < d.content[x].tags.length; y++) {
                if(d.page.indexOf(d.content[x].tags[y].toUpperCase()) >= 0)
                    score++;
            }
            total += score >=2;                         
        }
        if(total > 0)
            resp(res, SUC, {own: true, total});            // respond with success to log 
        else
            resp(res, SUC, {own: false});
    })
    .catch(e =>{
        resp(res, ERR, e.message);      //log the error message
    })

});

/*
This call routes the get request applies the callback function to the given path in th argument 
This call of app.get is supplied 2 paramaters
Parameters: 
    path(string): the path for the function
    callback (function): the function to be used with the get request.
*/
app.get("/getdata/:auth", (req,res) => {            //if the query given in the argument in findone is satisfied , then return the respective document (i.e. data record)
    usersdb.findOne({auth: req.params.auth}, {_id: 0, pass: 0, auth: 0})
    .then(d => {                //a promise that allows us to execute asynncronous operations. Then keyword allows us to specify which callback function to use
        if(d != null)
            return resp(res, SUC, d);       //send a response stating that res was succesful 
        throw new Error("Account not found."); //otherwuse throw a new error, because the account was not found
    })
    .catch( e => {resp(res, ERR, e.message)});  //upon catching  the error, resport to the log of that error.
})

/*
The app.get routes the get request to the url and uses the callback function that is provided

Paramters
    path (string): this is the path where the callback function is to be called from.
    
    callback (funciton): this takes two parameters on it's own. Needed for requesting and responding with the get request
*/
app.get("/img/:auth/:imageid", (req, res) => {
    //save instances of the authorization and the image id
    var auth = req.params.auth;
    var imageid = req.params.imageid;
    console.log(auth);              //log both the saved instances
    console.log(imageid);
    
    /*
     this aggregate operation allows to process data and then return the calculated results 
    */
    usersdb.aggregate([            
        {$match: {auth: auth}},         //filter out results that are not equal to match. 
        {$unwind: "$clothing"},         //the field path "clothing" is deconstructed so that the each element in the array clothing returns a resulting document.
        {$match: {"clothing.p": imageid}} //only returns results that match the imageid in clothing.p
    /*
    This second paramater of is a callback function.  If an error does occur then we call return the resp function which will help us to log the erroroneous information.
    
    If the length of r is in fact zero, this means we are unable to access the messag, and again the resp funciton called to document the information
    */
        
    ], (e,r) => {
        if(e)
            return resp(res, ERR, e.message);
        if(r.length == 0)
            return resp(res, ERR, "You do not have access to this image.");

        res.sendFile(path.join(__dirname, 'img', imageid));    //the argument which is the path, the file is transferred at the path
    })
});

/*
This method is used to respond to post requests;

Parameters: 
    URL (string): the url path to be used in the post method
    callback (function): to be used in the post method
    
This method calls the post method. The post method routes an HTTP post request to the path of the callback function that was specified. 
*/
function addPostListener(URL, callBack)
{
    app.post("/" + URL, (req, res) => {
        //this try-catch block is used to catch a error if it occurs. 
        try{
            var body=""; 
            /*The on method allows to bind to the the post listener. If data is sent then we invoke the callback function supplied as the second parameter*/
            req.on("data",function(data){ 
                body+=data;
            });

            /*Upon the end of the request, we invoke the callback function supplied as the second parameter of the on method*/
            req.on("end", () => {
                var data = JSON.parse(body);
                callBack(res, data);
            });
        } catch(err) {              //if a error has been caught, report it to the log
            log.error(err);     
        }
    });
}


/*
This is a helper function to check if data is valid or not
The function returns true if the data is valid, otherwise it returns false
*/
function checkData(res, data, args)
{
    /* We loop through the arguments and check if each one has it's "own" property. Which means if the data object does not have a property with the specicied argument (i.e args[x]) it will send an appropriate error message 
    */
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

/*
The funciton is a helper function that is used to help document the an appropriate response.
This function saves the response into the log.
*/
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


/*
Create the web server on Port 80
Log appropriate log message
*/
http.createServer(app).listen(80, function(){
    log.info("The server has been opened on port 80.");
});
