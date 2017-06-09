/*Filename: dbinteractions.js
Authors: Isaac Neibaur, Johannes Pikel, Berry Semexan, Akshay Subramanian, Ivan Xa
Date: 2017.06.09
Description: .js file to run a server that will access a mysql server
Class: CS361-400
Assignment: Project B
*/

//express so we may access an easy framework of functions to interact with clients
var express = require('express');
//exports the usage of the mysql database, specifics the DB, username and password
var mysql = require('./dbcon.js');
//handlerbars will be used for html page templates
//But not in this case since we are serving a static .html and .js file to render our page.
//The server only acts as a proxy.
var app = express();
var handlebars = require('express-handlebars').create({defaultLayout:'main', layoutsDir: __dirname + "/views/layouts"});
//bodyParser allows parsing of POST to this server
//both JSON and x-www-form-urlencoded
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');


app.use(cookieParser());

//session storage
var session = require('express-session');
app.use(session({
	secret:'SuperSecretPassword',
	resave:true,
	saveUninitialized:true
}));

//email service
var nodemailer = require("nodemailer");
let transporter = nodemailer.createTransport({
	host: 'smtp-pulse.com',
	port: 2525,
	secure: false,
	tls: {
		rejectUnauthorized: false
	},
	auth: {
		user: 'pikelj@oregonstate.edu',
		pass: 'gG2PHXjb6CJqeW'
	},
});

//serve images
const fileUpload = require('express-fileupload');
app.use(fileUpload());


app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');
app.set('port', 8081);	//8080 is for phpmyadmin

app.use(express.static(__dirname + '/public'));
app.set('views',__dirname + '/views/');

//This get to the base directory simply serves the index.html file located in the 
//public folder
app.get('/',function(req,res,next){
	if(!(checkLogOn(req))){
		req.session.name = "noLogon";
		req.session.uid = -1;
		req.session.shoppingAllowed = -1;
		req.session.pendingItems = -1;
	}
	res.sendfile('index.html');
});

//app to get all of the logged on user's item display them and give them a count
// of those items that have been successfully donated and received.

app.get('/items', function(req,res,next){
	console.log("logging onto profile pending num is: " + req.session.pendingItems);
	var context = {};
	context.donatedItems = [];
	context.pendingItems = [];
	context.receivedItems = [];
	context.shipItems = [];
	
	if(checkLogOn(req)){
		context.welcomeMessage = "Welcome to your User Profile, " + req.session.name;
		//grab the donated items here
		mysql.pool.query("SELECT headline, keyword_1,keyword_2,keyword_3,description,image_name,date_format(upload_ts, '%M %d, %Y') AS upload_ts FROM `donated_item` INNER JOIN `people` ON donated_item.donor_pid = people.person_id WHERE people.username = ?", req.session.name,
		function(err, result) {
    		if(err){
    			next(err);
       			return;
    		}

    		context.donatedItems = result;

			//grab the pending delivery items, as a customer here
    		mysql.pool.query("SELECT donated_item.item_id, order.order_id, order.dateOrdered, headline, keyword_1,keyword_2,keyword_3,description,image_name,date_format(upload_ts, '%M %d, %Y') AS upload_ts FROM `order` INNER JOIN `items_ordered` ON order.order_id = items_ordered.order_id INNER JOIN `donated_item` ON items_ordered.item_id = donated_item.item_id WHERE order.customer_pid = ? AND order.successful = ? AND items_ordered.successful = ?", [req.session.uid, 0, 0] , function(err, itemsReturned){
    			if(err){
    				next(err);
    				return;
    			}
    			if (itemsReturned != []){
    				context.pendingItems = itemsReturned;
    			}
    			//now grab the completed items that have been received as a customer
    			mysql.pool.query("SELECT headline, donated_item.item_id, dateOrdered, order.order_id, keyword_1,keyword_2,keyword_3,description,image_name,date_format(items_ordered.dateReceived, '%M %d, %Y') AS dateReceived FROM `order` INNER JOIN `items_ordered` ON order.order_id = items_ordered.order_id INNER JOIN `donated_item` ON items_ordered.item_id = donated_item.item_id WHERE order.customer_pid=? AND items_ordered.successful=?", [req.session.uid, 1], function(err, receivedItems){
    				if(err){ 
    					next(err);
    					return;
    				}
					context.receivedItems = receivedItems;
					//get the items this user needs to ship out here
    				mysql.pool.query("SELECT headline,donated_item.item_id,date_format(dateOrdered, '%M %d, %Y') AS dateOrdered ,username,street_num,street_name,city,state,zipcode FROM `donated_item` INNER JOIN `items_ordered` ON donated_item.item_id = items_ordered.item_id INNER JOIN `order` ON items_ordered.order_id = order.order_id INNER JOIN `people` ON people.person_id = order.customer_pid WHERE donated_item.donor_pid = ?", [req.session.uid], function(err, shipItems){
    					if(err){
    						next(err);
    						return;
    					}
    					//console.log(shipItems);
						context.shipItems = shipItems;
	    				res.render('items', context);
    					
    				});

    			});
    		});
		});

	} else {
		context.welcomeMessage = "You are not logged on please log on";
		res.render('items', context);
	}
	return;
	
});

app.post('/itemReceived', function(req,res,next){
	//console.log(req.body.itemId);
	console.log("before removal pending num is: " + req.session.pendingItems);
    req.session.pendingItems = req.session.pendingItems - 1;
    console.log("after receiving 1 item pending #:" + req.session.pendingItems);
	mysql.pool.query('UPDATE items_ordered SET successful = ?, dateReceived = current_date() WHERE item_id = ?', [1, req.body.itemId], function(err, rows, result)
	{
      if (err)
      {
        next(err);
        return;
      }
      mysql.pool.query("SELECT date_format(dateReceived, '%M %d, %Y') AS dateReceived FROM `items_ordered` WHERE item_id=?", [req.body.itemId], function(err, dateReturned){
      	if(err){
      		next(err);
      		return;
      	}
    	res.send(JSON.stringify(dateReturned));      	
      });
    });
});


//This post app handles the different Action items, Action is a variable set in the body of the POST
app.post('/',function(req,res,next){
  //return all items contained in the donated_items that are available meaning object_wanted == 0 
  if(req.body['action'] === 'all'){
		getAllItemsData(req,res,next);
	}
	if(req.body['action'] === 'headlines'){
		getHeadlines(req,res,next);
	}
	return;
});

//return only the headlines of the 10 last items added to the database
//
//
function getHeadlines(req,res,next){
		//ORDER BY upload_ts DESC so we retrieve elements by most recent first
		mysql.pool.query('SELECT headline, item_id FROM donated_item WHERE object_wanted = 0 ORDER BY upload_ts DESC LIMIT 10', function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
			res.send(JSON.stringify(rows));
			return;
		});
}

//return all the information about the items most recently added to the database
//
//
function getAllItemsData(req,res,next){
		//ORDER BY upload_ts DESC so we retrieve elements by most recent first
		mysql.pool.query('SELECT * FROM donated_item WHERE object_wanted = 0 ORDER BY upload_ts DESC', function(err, rows, fields){
		if(err){
			next(err);
			return;
		}
			res.send(JSON.stringify(rows));
			return;
		});
}

//This post app handles a client attempting to secure an item they want.  If it is not available the message sends 
// an appropriate response and the clientside removes the checkbox.

app.post('/secureItem', function(req,res,next){

	mysql.pool.query("SELECT item_id, object_wanted FROM donated_item WHERE item_id=?", [req.body.id], function(err,result){
		if(err){
			next(err);
			return;
		}
		if(req.body.do_this === "secure"){
				//if object_wanted == 0 item is available
				if(result[0].object_wanted === 0){
					mysql.pool.query("UPDATE donated_item SET object_wanted=? WHERE item_id=?", ["1", req.body.id], function(err, result){
							if(err){
								next(err);
								return;
							}
							res.send(JSON.stringify({message:"secured"}));
							return;
					});
				}
				else {
					res.send(JSON.stringify({message:"failed"}));
				}
			}
			else if(req.body.do_this === "release") {
				mysql.pool.query("UPDATE donated_item SET object_wanted=? WHERE item_id=?", ["0", req.body.id], function(err, result){
						if(err){
							next(err);
							return;
						}
						res.send(JSON.stringify({message:"released"}));
				});
			}
		});
});

//POST app to handle the review of an order from the customer
//validates that the customer is not also the donor
//FUTURE use validates that the customer is allowed to order more items
app.post('/reviewOrder', function(req, res, next) {
    if(checkLogOn(req)){
    	//if user is logged on and not allowed to shop stop here
    	//var sess = req.session
    	//console.log(sess);
    	if(req.session.shoppingAllowed === 0){
    		res.send(JSON.stringify({message:"notAllowed"}));
    		return;
    	}
    	//console.log("during review before adding items pending is: " + req.session.pendingItems);
    	//console.log("before review pending items =" + req.session.pendingItems);
    	//validate that the cart does not have more than 3 items when added to outstanding pending items to be received.
    	if((req.session.pendingItems + req.body.items.length) > 3){
    		res.send(JSON.stringify({message:"tooManyPending", pendingItems:req.session.pendingItems}));
    		return;
    	}
    	// check if the user is adding too many items
		/*
		mysql.pool.query("SELECT COUNT(items_ordered.item_id) as pendingItems FROM `items_ordered` INNER JOIN `order` ON items_ordered.order_id = order.order_id WHERE customer_pid = ?", req.session.uid, function(err, result)
		{
			if(err){
    	    	next(err);
    	    	return;
    	    }
			console.log(result[0].pendingItems);
			console.log(req.body.items.length);
			if ((result[0].pendingItems + req.body.items.length) > 3)
			{
				res.send(JSON.stringify({message:"TooManyPending"}));
    			return;
			}
	
		});
		*/
    	var items = [];
    	items = req.body.items;
    	mysql.pool.query("SELECT item_id FROM `donated_item` WHERE `donor_pid` = ? AND `item_id` IN (?)", [req.session.uid, items], function(err, result) {
    	    if(err){
    	    	next(err);
    	    	return;
    	    }
    	    res.send(JSON.stringify(result));
    	    return;
    	});
    } else {
    	res.send(JSON.stringify({message:"noLogon"}));
    	return;
    }
});

//POST app to handle the checkout from customer
//Parameters: receive customer uid and items in req.body
app.post('/checkout', function(req,res,next){

	if(checkLogOn(req)){
		var orderID;
		var uid = req.session.uid;
		var items = [];
		items = req.body.items;
		mysql.pool.query("INSERT INTO `order` (customer_pid) VALUE (?)", uid, function(err,result) {
			if(err){
				next(err);
				return;
			}
			orderID = result.insertId;
			for(var i = 0; i < items.length; i++){
				mysql.pool.query("INSERT INTO items_ordered (`item_id`, `order_id`) VALUES (?,?)", [items[i], orderID], function(err,result){
					if(err){
						next(err);
						return;
					}
					
				});
			}
		});
		
		for(var i = 0; i < items.length; i++)
		{
			req.session.pendingItems = req.session.pendingItems + 1; 
			console.log("added one pending item. count now: " + req.session.pendingItems);
		}

		sendCustomerEmail(uid, items);
		sendDonorEmail(uid, items);
		res.send(JSON.stringify({message:"Success"}));
	} else {
		res.send(JSON.stringify({message:"noLogon"}));
	}
	return;
});

/*Function: sendCustomerEmail()
Parameters: customer id, items []
*/
function sendCustomerEmail(customer_pid, items){
	var customer_email;
	var customer_user;

	//send the email to the customer that items are on the way
	mysql.pool.query("SELECT username, email FROM `people` WHERE person_id=?", [customer_pid], function(err,result){
		if(err){
			console.log(err);
			return;
		}
		
		customer_email = result[0].email;
		customer_user = result[0].username;
		
		mysql.pool.query("SELECT DISTINCT headline FROM `donated_item` WHERE item_id IN (?)", [items], function(err, item_headlines) {
			if(err){
			    console.log(err);
				return;
			}
			sendCustomerEmailComplete(customer_user, customer_email, item_headlines);
		});
	});
}

/*Function: sendCustomerEmailComplete()
*/

function sendCustomerEmailComplete(username, email, items){

	var htmlString = '<p>Your items are on their way.  You ordered:</p>';
	for(var i = 0; i < items.length; i++){
		htmlString += '<p>' + items[i].headline + '</p>';
	}

	var mailOptions = {
		from: '"Goodbay Admin" <pikelj@oregonstate.edu>',
		to: email,
		subject: 'Thank you  ' + username + ', for your order from Goodbay.com',
		html: htmlString
	};
	//console.log(mailOptions);
	transporter.sendMail(mailOptions, function(error, info){
		if(error){
			console.log(error);
		}else {
			console.log("customer message sent" + info.response);
		}
	});
	
	transporter.close();
}

/*Function: sendDonorEmail()
*/
function sendDonorEmail(cust_uid, items){
	mysql.pool.query("SELECT username, street_num, street_name, city, state, zipcode FROM `people` WHERE person_id=?", [cust_uid], function(err,address){
		if(err){
			console.log(err);
			return;
		}

		for(var i = 0; i < items.length; i++){
			mysql.pool.query("SELECT username, email, headline FROM `people` INNER JOIN `donated_item` ON person_id = donor_pid WHERE item_id=?", items[i], function(err, result){
				if(err){
					console.log(err);
					return;
				}
				
				var htmlString = '<p>Please ship ' + result[0].headline + ' to ' + address[0].username + '</p>';
				htmlString += '<p> at ' + address[0].street_num + ' ' + address[0].street_name + ', ' + address[0].city + ', ' + address[0].state + ' ' + address[0].zipcode;
				
				var mailOptions = {
					from: '"Goodbay Admin" <pikelj@oregonstate.edu>',
					to: result[0].email,
					subject: 'Goodbay.com Ship your donated items',
					html: htmlString
				}
				transporter.sendMail(mailOptions, function(error, info){
					if(error){
						console.log(error);
					}else {
						console.log("donor message sent" + info.response);
					}
				});
			});
		}

		
	});
}


//validate that a user is not already logged on before adding another user
app.get('/signUpPage', function(req, res, next) {
   var context = {};
   if(checkLogOn(req)) {
		context.message = "Please log out to register a new user";
		res.render('userAdded', context);
		return;
   } else {
   		res.render('signUp');
   		return;
   }
});


//called from the Sign Up Page, to add a new user to the system
app.post('/adduser', function(req,res,next)
{
	var context = {};
	mysql.pool.query("INSERT INTO people (`username`, `email`, `dateofbirth`, `street_num`, `street_name`, `city`, `state`, `zipcode`, `password`) VALUES (?,?,?,?,?,?,?,?,md5(?))", 
	[req.body.username, req.body.email, req.body.dob || null, req.body.streetNum, req.body.streetName, req.body.city, req.body.state, req.body.zipCode, req.body.password], function(err,result)
	{
		if(err){
			if(err.code == "ER_DUP_ENTRY"){
				context.message = "Not able to add user, username already exists in db, please try again.";
    			res.render('userAdded', context);
    			return;
    		} else {
    			next(err);
    			return;
    		}
    	} 
    	context.result = result.insertId;
    	context.message = "Welcome to Goodbay, " + req.body.username + "!";
    	context.message2 = "You will need to logon before you can checkout.";
    	res.render('userAdded', context);
	});
	
})

//this app deletes a user's profile
//need to handle items the user still has in the DB
//this app actually on deactivates a user
//set the user's deactivate field to 1
//removes all of this user's items from available
app.post('/deleteThisUser', function(req, res, next) {
	var context={};
	if(checkLogOn(req)){
	    mysql.pool.query("UPDATE `people` SET `deactivated`=? WHERE `username`=? AND `password`=MD5(?)", [1, req.body.username, req.body.password], function(err, result) {
	        if(err){
	        	console.log(err);
	        	context.text = "There was an error deactivating the user.  Code:";
	        	context.error = err.code;
		        res.render('userDeleted', context);
	        } else if(result.affectedRows == 0){
	        	context.text = "This user was not deactivated because user not found or invalid username/password.";
	        	context.error = result.message;
		        res.render('userDeleted', context);
	        } else{
	        	mysql.pool.query("UPDATE `donated_item` SET `object_wanted` =? WHERE donor_pid=?", [1, req.session.uid], function(err, result){
	        		if(err){
	        			context.text = "There was an error with removing items.  Code:";
	        			context.error = err.code;	
				        res.render('userDeleted', context);
				        return;
	        		}
	        		//log the user off the system
	        		req.session.uid = -1;
	        		req.session.name = "noLogon";
	        		req.session.shoppingAllowed = -1;
	    			context.text = "User " + req.body.username + " was deactivated, and all items removed from available.";
	        		context.error = "";
			        res.render('userDeleted', context);
	        	});
	        }
	        return;
	    });
	} else {
		context.text = "Please logon first to deactivate the account";
		res.render('userDeleted', context);
		return;
	}
});

//this app activates a user's deactivated profile
//need to handle items the user still has in the DB
//set the user's deactivate field to 0
/*app.post('/deleteThisUser', function(req, res, next) {
	var context={};
	if(checkLogOn(req)){
	    mysql.pool.query("UPDATE `people` SET `deactivated`=? WHERE `username`=? AND `password`=MD5(?)", [0, req.body.username, req.body.password], function(err, result) {
	        if(err){
	        	console.log(err);
	        	context.text = "There was an error activating the user.  Code:";
	        	context.error = err.code;
		        res.render('userDeleted', context);
	        } else if(result.affectedRows == 0){
	        	context.text = "This user was not activated because user not found or invalid username/password.";
	        	context.error = result.message;
		        res.render('userDeleted', context);
	        } else{
	        	
	        		//log the user on the system
	        		req.session.uid = -1;
	        		req.session.name = "noLogon";
	        		req.session.shoppingAllowed = -1;
	    			context.text = "Welcome Back " + req.body.username + " ! ";
	        		context.error = "";
			        res.render('userDeleted', context);
	        }
	        return;
	    });
	}
});*/


/* look up the person_pid of the username passed in
	then validate password
	store the username and userid in a session variable
	return successful logon
*/
app.post('/userLogon', function(req, res, next) {
   mysql.pool.query("SELECT person_id, shoppingAllowed FROM `people` WHERE username=? AND password=md5(?) AND deactivated=?",[req.body.username, req.body.password, 0], function(err, result) {
      if(err){
      	next(err);
      	return;
      } 
    	if(result.length > 0){
    		req.session.name = req.body.username;
    		req.session.uid = result[0].person_id;
    		//this stores if a user is allowed to shop used in the reviewOrder app
    		//0 shopping is not allowed, 1 shopping allowed.
    		req.session.shoppingAllowed = result[0].shoppingAllowed;
    		mysql.pool.query("SELECT COUNT(items_ordered.item_id) as pendingItems FROM `items_ordered` INNER JOIN `order` ON items_ordered.order_id = order.order_id WHERE customer_pid = ? AND items_ordered.successful = ?", [req.session.uid,0], function(err, result) {
				if(err){
	    	    	next(err);
	    	    	return;
	    	    }
	    	    if (result[0].pendingItems > 0) {
	    	    	req.session.pendingItems = result[0].pendingItems;
	    	    	console.log("logon pending items:" + req.session.pendingItems);
	    	    }
	    	    else {
	    	    	req.session.pendingItems = 0;
	    	    }
	    	    result[0].person_id = req.session.uid;
	      		res.send(JSON.stringify(result));
  				return;
			});
    		//trace statements for sessions variables
    		//console.log(req.session.name);
    		//console.log(req.session.uid);
    	} else {
    		res.send(JSON.stringify(result));
    		return;
    	}
    	


   });
});

/* log the user off the system
	deletes the session variables
	*/
	
app.post('/userLogoff', function(req, res, next) {
    req.session.name = "noLogon";
    req.session.uid = -1;
    res.send(JSON.stringify({message:"Success"}));
    return;
});


/* returns 'yes' if user if logged in*/
app.post('/isLoggedIn', function(req, res, next) {
   if(checkLogOn(req)){
		res.send(JSON.stringify({message:"yes", username:req.session.name}));
		return;
   } else {
   		res.send(JSON.stringify({message:"no"}));
  		return;
   }
});

/* add item page is displayed here*/
app.get('/addItemPage', function(req, res, next) {
	var context = {};

    if(checkLogOn(req)){
    	context.welcomeMessage = "Welcome " + req.session.name + ", please upload your item.";
    	context.displayForm = 1;
    } else {
    	context.welcomeMessage = "Please go back to the main page and logon first to upload an item.";
    }
    res.render('addItem', context);
    return;
});


/* adds item to the donated_item table
looks up the donor's person_id based on their username.
image file is saved to the images folder in the public directory
we should only get here if the user is already logged on. but we double check regardless
*/
app.post('/addItem', function(req, res, next) {
    var context = {};
    var fileName;
    var donor_pid;
    
    if(checkLogOn(req)){
    	donor_pid = req.session.uid;
    	//add the image to the public folder
    	if (!(req.files.sampleFile === undefined)) {
    		
    		// The name of the input field (i.e. "sampleFile") is used to retrieve the uploaded file 
    		let sampleFile = req.files.sampleFile;
    		var datetime = new Date();
    		var seconds = datetime.getTime() / 1000;
			fileName = seconds + req.files.sampleFile.name;
			var filePath = __dirname + "/public/images/" + fileName;
    		// Use the mv() method to place the file somewhere on your server 
    		sampleFile.mv(filePath, function(err) {
    			if (err){
    		  		return res.status(500).send(err);
    			}
    		});
    	} else {
    		fileName = null;
    	}
		mysql.pool.query("INSERT INTO donated_item (`donor_pid`, `object_wanted`, `description`, `headline`, `keyword_1`, `keyword_2`, `keyword_3`, `image_name`, `upload_ts`) VALUES (?,?,?,?,?,?,?,?, current_date())",
			[donor_pid, "0", req.body.descript || null, req.body.headline, req.body.keyword_1, req.body.keyword_2, req.body.keyword_3, fileName || null],function(err,result){
				if(err){
					next(err);
					return;
				}
				context.message = "Item " + req.body.headline + " donated!";
				res.render('itemDonated', context);
				return;
		});
    } else {
    	context.message = "Logon validation failed not able to upload item";
    	res.render('itemDonated', context);
    	return;
    }
});

//returns all the items a donor has donated to the system

app.post('/lookUpDonorItems', function(req, res, next) {
   mysql.pool.query("SELECT * FROM `donated_item` INNER JOIN `people` ON donated_item.donor_pid = people.person_id WHERE people.username = ?", req.body.keyword,
   function(err, result) {
       if(err){
       	console.log(err);
       	return;
       }
       res.send(JSON.stringify(result));
       return;
   }) 
});

//app to search for a keyword in keywords 1, 2 and 3 and return the results

app.post('/searchForItems', function(req, res, next) {
	mysql.pool.query("SELECT * FROM `donated_item` WHERE keyword_1 LIKE ? OR keyword_2 LIKE ? OR keyword_3 LIKE ?", ['%'+req.body.keyword+'%','%'+req.body.keyword+'%','%'+req.body.keyword+'%'], function(err, result) {
	   if(err){
	   	next(err);
	   	return;
	   } 
	    res.send(JSON.stringify(result));
	    return;
	});
});


//app to reset all the items to be available... only while testing... not meant for final production release
app.post('/resetItems', function(req,res,next){

	mysql.pool.query("UPDATE donated_item SET object_wanted=?", ["0"], function(err, result){
		if(err){
			next(err);
			return;
		}
		
		mysql.pool.query("TRUNCATE `items_ordered`", function(err,result){
			if(err){
				next(err);
				return;
			}
			mysql.pool.query("DELETE FROM `order`", function(err,result){
				if(err){
					next(err);
					return;
				}
			});
		});
		
	});
	
});


// release any reserved items if checkout did not complete!
app.post('/releaseReserved', function(req, res, next) {
	//console.log(req.body.items);
    for(var i = 0; i < req.body.items.length; i ++){
		mysql.pool.query("UPDATE `donated_item` SET object_wanted=? WHERE item_id=? ", ["0", req.body.items[i]], function(err, result){
			if(err){
				console.log(err);
				return;
			}	
		});
    }
    //on window close arbitrarily log out.
    req.session.name = "noLogon";
    req.session.uid = -1;
});

//function to validate if a user is logged on returns true if logged on
//requires that the request is passed in from the calling function

function checkLogOn(req){
	if(req.session.name === "noLogon" || req.session.name === undefined || req.session.name === null ){
		return false;
	} else {
		return true;
	}
}

//404 and 500 messages
//
app.use(function(req,res){
  res.status(404);
  res.render('404');
});

app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500);
  res.render('500');
});


app.listen(app.get('port'), function(){
  console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate.');
});
