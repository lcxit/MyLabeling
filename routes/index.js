var express = require('express');
var app = express();
var router = express.Router();
var crypto = require('crypto');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var User = require('../models/user.js');
var Post = require("../models/post.js");
var Classification = require("../models/classification.js");
var Category = require("../models/category.js");
var Shape = require("../models/shape.js");
var Annotation = require("../models/annotation.js");
var fs = require("fs");  
/* GET home page. */




router.get('/', function(req, res) {
  Post.get(null, function(err, posts) {
	if (err) {
		posts = [];
	}
	res.render('index', {
		title: 'Annotation System',
		posts: posts,
		user : req.session.user,
            success : req.flash('success').toString(),
            error : req.flash('error').toString()
	});
  });
});

router.get('/blog', function(req, res) {
  //throw new Error('An Error for test purpose.');
  Post.get(null, function(err, posts) {
	if (err) {
		posts = [];
	}
	res.render('index', {
		title: 'Index',
		posts: posts,
		user : req.session.user,
            success : req.flash('success').toString(),
            error : req.flash('error').toString()
	});
  });

});

router.get("/reg", checkNotLogin);
router.get("/reg",function(req,res) {
  res.render("reg",{
    title : "Resigster"
  });
});

router.get("/login", checkNotLogin);
router.get("/login",function(req,res) {
  res.render("login",{
    title:"Login",
  });
});

router.get("/logout", checkLogin);
router.get("/logout",function(req,res) {
	req.session.user = null;
	req.flash('success', '退出成功');
	res.redirect('/');
});

//router.get("/user", function(req,res){
  //res.render("user",{
    //title: "用户页面",
  //});
//});

router.post("/login", checkNotLogin);
router.post("/login",function(req,res) {
  //var md5 = crypto.createHash('md5');
  //var password = md5.update(req.body.password).digest('base64');
	var password = req.body.password;
	User.get(req.body.username, function(err, user) {
    if (!user) {
	    req.flash('error', '用户不存在');
		  return res.redirect('/login');
    }
           
    if (user.password != password) {
	    req.flash('error', '用户名或密码错误');
	    return res.redirect('/login');
    }
    req.session.user = user;
    req.flash('success', req.session.user.name + '登录成功');
    res.redirect('/');
  });
});

router.post("/reg", checkNotLogin);
router.post("/reg", function(req, res) {
  if(req.body['password-repeat'] != req.body['password']){
    req.flash('error', '两次输入的密码不一致');
    return res.redirect('/reg');
  }  
  //var md5 = crypto.createHash('md5');
  //var password = md5.update(req.body.password).digest('base64');
	var password = req.body.password;
  var newUser = new User({
    username: req.body.username,
    password: password,
  });
  //检查用户名是否已经存在
  User.get(newUser.username, function(err, user) {
    if (user) {
      err = 'Username already exists.';

    }
    if (err) {
	req.flash('error', err);
	return res.redirect('/reg');
    }

    newUser.save(function(err) {
	if (err) {
	  req.flash('error', err);
	  return res.redirect('/reg');
	}
	req.session.user = newUser;
	req.flash('success', req.session.user.name+'注册成功');
	res.redirect('/');
    });
  });  
});

function checkNotLogin(req, res, next) {
  if (req.session.user) {
    req.flash('error', '用户已经登录');
    return res.redirect('/');
  }
  next();
}
function checkLogin(req, res, next) {
  if (!req.session.user) {
    req.flash('error', '用户尚未登录');
    return res.redirect('/login');
  }
  next();
}

router.post("/post",checkLogin);
router.post("/post",function(req,res) {
	var currentUser = req.session.user;
	var post = new Post(currentUser.name, req.body.post);
	post.save(function(err) {
		if (err) {
			req.flash('error', err);
			return res.redirect('/blog');
		}
		req.flash('success', '发表成功');
		res.redirect('/u/' + currentUser.name);
	});
});

router.get("/u/:user",function(req,res) {
	User.get(req.params.user, function(err, user) {
		if (!user) {
			req.flash('error', '用户不存在');
			return res.redirect('/blog');
		}
		Post.get(user.name, function(err, posts) {
			if (err) {
				req.flash('error', err);
				return res.redirect('/blog');
			}
			res.render('user', {
				title: user.name,
				posts: posts
			});
		});
	});
});


router.post("/renamecategory", function (req, res) {
        if (req.session.user) {
			
			if(writefile) {
				var classificationFile = JSON.parse(fs.readFileSync(req.session.user.username+'.txt',"utf-8"));  
				var i;
				for(i in classificationFile.classifications) {
					if(classificationFile.classifications[i].classificationName == req.body['classificationName'])
						break;
				}
				var j;
				for(j in classificationFile.classifications[i].categories) {
					if(classificationFile.classifications[i].categories[j].categoryName == req.body['categoryName']) {
						classificationFile.classifications[i].categories[j].categoryName = req.body['newName'];
						break;
					}	
				}
				fs.writeFileSync(req.session.user.username+'.txt', JSON.stringify(classificationFile));
			}
			
			Category.updateNameByCategoryId(req.body['categoryId'], req.body['newName'],function(err, classificationList) {
				res.send("1");
			});	
			
			
        } else {
            res.redirect('/');
        }
	});

	

router.post("/getclassificationlist", function (req, res) {
	if (req.session.user) {
		var classificationList = Classification.findByUserId(req.session.user._id, function(err, classificationList) {
			res.send(classificationList);
		});	
	} 
	else {
		res.redirect('/');
	}
});
var allAnnotation = true;


var writefile = true;
router.post("/createclassification", function (req, res) {
	if (req.session.user) {
		var classificationFile;
		if(writefile) {
			fs.exists(req.session.user.username+'.txt', function( exists ){
				if(exists) {
					classificationFile = JSON.parse(fs.readFileSync(req.session.user.username+'.txt',"utf-8"));  
					var newClassification = {};
					newClassification.classificationName = req.body['classificationName'];
					newClassification.classificationDescription = req.body['classificationDescription'];
					newClassification.categories = new Array();
					classificationFile.classifications.push(newClassification);
					fs.writeFileSync(req.session.user.username+'.txt', JSON.stringify(classificationFile));
				}
				else {
					classificationFile = {};
					classificationFile.username = req.session.user.username
					classificationFile.classifications = new Array();
					var newClassification = {};
					newClassification.classificationName = req.body['classificationName'];
					newClassification.classificationDescription = req.body['classificationDescription'];
					newClassification.categories = new Array();
					classificationFile.classifications.push(newClassification);
					fs.writeFileSync(req.session.user.username+'.txt', JSON.stringify(classificationFile));
				}
				
			});
			
		} 
		
		
		if(allAnnotation) {
			var shapesIdList;
			Shape.findAllId(function(err, doc) {
					shapesIdList = doc;
					classification	= new Classification({
						classificationName: req.body['classificationName'],
						classificationDescription: req.body['classificationDescription'],
						userId: req.session.user._id,
						shapesId: shapesIdList
					});
				classification.save(function(err, classification) {
				if (err) {
					  req.flash('error', err);
					  return;
					}
					res.send({_id:classification._id});
				});		
			});
		}
		else {
			classification = new Classification({
			classificationName: req.body['classificationName'], 
			classificationDescription: req.body['classificationDescription'],
			userId: req.session.user._id,
			});
		
			classification.save(function(err, classification) {
				if (err) {
				  req.flash('error', err);
				  return;
				}
				res.send({_id:classification._id});
			});
		}
	} 
	else {
		res.redirect('/reg');
	}
});


	
router.post("/createcategory", function (req, res) {
	if (req.session.user) {
		if(writefile) {
			var classificationFile = JSON.parse(fs.readFileSync(req.session.user.username+'.txt',"utf-8"));  
			var i;
			for(i in classificationFile.classifications) {
				if(classificationFile.classifications[i].classificationName == req.body['classificationName'])
					break;
			}
			console.log("AA"+classificationFile.classifications[i].classificationName +" " + req.body['classificationName']);
			var newCategory = {}; 
			newCategory.categoryName = req.body['categoryName'];
			newCategory.shapes = new Array();
			classificationFile.classifications[i].categories.push(newCategory);
			fs.writeFileSync(req.session.user.username+'.txt', JSON.stringify(classificationFile));
		} 
		
		
		
		
		
		var category = new Category({
			categoryName: req.body['categoryName'], 
			classificationId: req.body['classificationId']
		});
		category.save(function(err, category) {
			if (err) {
			  req.flash('error', err);
			  return;
			}
			res.send({_id:category._id});
		});
	} 
	else {
		res.redirect('/reg');
	}
});


router.post("/getclassificationshapes", function (req, res) {
	if (req.session.user) {
		var shapeIdList = Classification.getShapeListById(req.body['currentClassificationId'], function(err, shapeIdList) {
		

		var	shapeList = Shape.findByShapeId(shapeIdList[0]['shapesId'], function(err, shapeList){
				
				var shapeIdList = new Array();
				for(var i in shapeList) {
					shapeIdList.push(shapeList[i]._id);
				}
				Annotation.getClassificationAnnotation(req.body['currentClassificationId'],shapeIdList, function(err, annotationList){
				res.send({shapeList:shapeList,annotationList:annotationList});
				});	
				
			});
		});	
	} 
	else {
		res.redirect('/');
	}
});


router.post("/getclassificationcategories", function (req, res) {
	if (req.session.user) {
		var categoryList = Category.getAllByClassificationId(req.body['currentClassificationId'], function(err, categoryList) {
				res.send(categoryList);
		});	
	} 
	else {
		res.redirect('/');
	}
});


	
router.post("/annotation", function (req, res) {
	if (req.session.user) {
		if(writefile) {
			var classificationFile = JSON.parse(fs.readFileSync(req.session.user.username+'.txt',"utf-8"));  
			var i;
			for(i in classificationFile.classifications) {
				if(classificationFile.classifications[i].classificationName == req.body['classificationName'])
					break;
			}
			var j;
			for(j in classificationFile.classifications[i].categories) {
				if(classificationFile.classifications[i].categories[j].categoryName == req.body['categoryName'])
					break;
			}
			
			var	shapeList = Shape.findByShapeId(req.body['shapeId'], function(err, shapeList){
				var newAnnotaion = {};
				console.log(shapeList);
				newAnnotaion.shapeId = req.body['shapeId'];
				newAnnotaion.shapeName = shapeList[0].shapeName;
				newAnnotaion.shapePath = shapeList[0].shapePath;
				classificationFile.classifications[i].categories[j].shapes.push(newAnnotaion);
				fs.writeFileSync(req.session.user.username+'.txt', JSON.stringify(classificationFile));
				
			});

		}
		
		var annotation = new Annotation({
			shapeId: req.body['shapeId'], 
			categoryId: req.body['categoryId'],
			classificationId: req.body['classificationId'],
		});
		console.log(req.body);
		annotation.save(function(err, annotation) {
			if (err) {
			  req.flash('error', err);
			  return;
			}
			res.send({_id:annotation._id});
		});
	} 
	else {
		res.redirect('/reg');
	}
});
		
module.exports = router;
