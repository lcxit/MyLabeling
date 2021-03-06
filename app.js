 var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	RedisStore = require('connect-redis')(session),
	//mongoose = require('mongoose'),
	bodyParser = require('body-parser'),
	path = require('path'),
	fs = require('fs'),
	flash = require('connect-flash'),
	mongoose = require('./models/db'),
	Shape = require("./models/shape.js");
//var mongoose = require('mongoose');
//mongoose.connect("mongodb://localhost/MyLableing");

app.use(express.static(path.join(__dirname, 'public')));

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');



 
app.use(cookieParser('keyboard cat'));
app.use(bodyParser());
var routes = require('./routes/index');

var reg = require('./routes/reg');
app.use('/reg', reg);
app.use(flash());
// 设置 Session
app.use(session({
  store: new RedisStore({
    host: "127.0.0.1",
    port: 6379,
  }),
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false
}))

app.use('/', routes);
app.use(function(req, res, next){

  res.locals.user = req.session.user;
  res.locals.post = req.session.post;
  var error = req.flash('error');
  res.locals.error = error.length ? error : null;
 
  var success = req.flash('success');
  res.locals.success = success.length ? success : null;
  next();
});
app.get("/", function(req, res) {
    if (req.session.user) {
        res.sendFile( __dirname + '/index.html');
    } else {
		res.redirect('/login');;
    }
});

app.get("/login", function (req, res) {
    res.render("login");
});

server.listen(3000);



function authenticate(name, fn) {
    if (!module.parent) console.log('authenticating %s', name);
    UserModel.findOne({
        username: name
    },
    function (err, user) {
        if (user) {
            if (err) return fn(new Error('cannot find user'));
				return fn(null, user);
        } else {
            return fn(new Error('cannot find user'));
        }
    });
}
	

app.post("/login", function (req, res) {
    authenticate(req.body.username, function (err, user) {
        if (user) {
            req.session.regenerate(function () {
                req.session.user = user;
                req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
                res.redirect('/');
            });
        } else {
            var username = req.body.username;
			var user = new UserModel({
				username: username
			});
			user.save(function (err, newUser) {
				req.session.regenerate(function(){
					req.session.user = user;
					req.session.success = 'Authenticated as ' + user.username + ' click to <a href="/logout">logout</a>. ' + ' You may now access <a href="/restricted">/restricted</a>.';
					res.redirect('/');
				})
			});
        }
    });
});


app.post("/init", function (req, res) {
		console.log('init');
        if (req.session.user) {
		
			res.send(modelListString); 
        } else {
            res.redirect('/');
        }

});




app.post("/label", function (req, res) {
		console.log(req);
        if (req.session.user) {  
		
			res.send("success"); 
        } else {
            res.redirect('/');
        }

});


var modelListString;
var init = true;
var initShapeDatabase = function(shapeList) {
	var newShapes = new Array();
	for(var i = 0; i < shapeList.length; i++) {
		var newShape = new Shape({
			shapeName: shapeList[i]["shapeName"],
			shapePath: shapeList[i]["shapePath"],
			shapeFormat: shapeList[i]["shapeFormat"],
			shapeThumbPath: shapeList[i]["shapeThumbPath"],
			shapeSetName: shapeList[i]["shapeSetName"]
		});
		newShapes.push(newShape);
	}
	Shape.create(newShapes, function(err) {});
}

var shapeRootPath = "./public/models/";
getShapes(shapeRootPath);


function getShapes(shapeRootPath) {
	
	var modelList = new Array() ;  
	var shapeSetNames = fs.readdirSync(shapeRootPath);

	for(var i in shapeSetNames) {
		var shapeNames = fs.readdirSync(shapeRootPath + shapeSetNames[i]);
				

		for(var j in shapeNames) {
			var subfiles = fs.readdirSync(shapeRootPath + shapeSetNames[i] + "/" + shapeNames[j]);
			var tmpResult={}; 
			for(var k = 0; k < subfiles.length; k++) {
				var temp = subfiles[k].split('.'); 
				var type = temp[temp.length-1];
				if(type == "jpg" || type == 'png') {
					tmpResult["shapeThumbPath"] = "./models/" + shapeSetNames[i] + "/" + shapeNames[j] + "/" +subfiles[k]; 
					break;
				}
			}			
			tmpResult["shapeName"] = shapeNames[j];
			tmpResult["shapePath"] = "./models/" + shapeSetNames[i] + "/" + shapeNames[j] + "/" + shapeNames[j];
			tmpResult["shapeFormat"] = "obj";
			tmpResult["shapeSetName"] = shapeSetNames[i];
			
			modelList.push(tmpResult);
			
		}
	}
	if(init) {
		initShapeDatabase(modelList);
	}
	modelListString = JSON.stringify(modelList);
}


/* fs.readdir(modelRootPath, function (err, files) {//读取文件夹下文件  

	var shapeSetList = new Array();
	
	
	

    var count = files.length; 
    var modelList = new Array() ;  
    files.forEach(function (filename) {  
        fs.readFile(filename, function (data) {
			
			fs.readdir("./public/models/" + filename, function (err, subfiles) {
				//console.log(subfiles);
				var tmpResult={}; 
				for(var i = 0; i < subfiles.length; i++) {
					var temp = subfiles[i].split('.'); 
					var type = temp[temp.length-1];
					if(type == "jpg" || type == 'png') {
						tmpResult["shapeThumbPath"] = "/models/"+filename+"/"+subfiles[i]; 
						break;
					}
				}
							
				 
				tmpResult["modelName"] = filename;
				tmpResult["modelPath"] = "/models/"+filename+"/"+filename+".obj";
				//tmpResult["thumbPath"] = "/models/"+filename+"/"+filename+".png"; 
				
				tmpResult["shapeName"] = filename;
				tmpResult["shapePath"] = "/models/"+filename+"/"+filename;
				tmpResult["shapeFormat"] = "obj";
				//tmpResult["shapeThumbPath"] = "/models/"+filename+"/"+filename+".png"; 
				modelList[count-1]=tmpResult ;  
				count--;  
				if (count <= 0) {
					if(init) {
						initShapeDatabase(modelList);
					}
					modelListString = JSON.stringify(modelList)
				} 
				
			});

			
        });  
    });  
}); 
 */



