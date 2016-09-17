var urlDefinition ={
    "/createacc":{
        desc: "For creating a new account",
        attr: {
            names: ["username", "password"],
            req: [true, true]
        }    
    },
    "/auth":{
        desc: "For creating a new account",
        attr: {
            names: ["username", "password"],
            req: [true, true]
        }    
    },
    "/getdata":{
        desc: "Logging screen on time",
        attr: {
            names: ["auth"],
            req: [true]
        }    
    }
}

var attrDefinition = {
    username :{
        desc: "User's name",
        opt: "String"
    },
    password:{
        desc: "User's password",
        opt: "String"
    }
}