/* Filename: script.js
    Authors: Isaac Neibaur, Johannes Pikel, Berry Semexan, Akshay Subramanian, Ivan Xa
	Class: CS361-400
	Date: 2017.09.06
	Assignment: Project B
	Description: This is the javascript file that will primarily 
	interact with the index.html 
	*/
	
/*Function: getInfo
Description: initial query to the mySQL server that requests all the records contained
in the table workouts. sends the parsed responseText to addRecentlyAdded()
addFullDetails, to be appended to the recentlyAddedTable and the outputTable
Parameters: none
Preconditions: none
Postconditions: rows from db sent to function
*/	
function getInfo(){
	//console.log("Getting info");
	var req = new XMLHttpRequest();
	req.open("POST", '/', true);
	req.setRequestHeader('Content-Type', 'application/json');
	req.send(JSON.stringify({action:"all"}));
	req.addEventListener('load', function(){
		if(req.status >= 200 && req.status < 400){
			var response = JSON.parse(req.responseText);
			addFullDetails(response);
		}
		else{
			removeStatements();
			addGeneralErrorStatement();
			console.log("Something went horribly wrong. Check to see if mySQL server is running.")
		}
	});	
}	

/*Function: getHeadlines
Description: makes a new POST request to self using action:headlines
to retrieve the headlines of items
Parameters: none
Preconditions: none
Postconditions: rows returns from database
*/
function getHeadlines(){
	var req = new XMLHttpRequest();
	req.open("POST", '/', true);
	req.setRequestHeader('Content-Type', 'application/json');
	req.send(JSON.stringify({action:"headlines"}));
	req.addEventListener('load', function(){
		if(req.status >= 200 && req.status < 400){
			var response = JSON.parse(req.responseText);
			addRecentlyAdded(response);
		}
		else{
			removeStatements();
			addGeneralErrorStatement();
			console.log("Something went horribly wrong. Check to see if mySQL server is running.")
		}
	});	
}	

/*Function: addRecentlyAdded()
Description: expects an array of js objects that have keys
headline and item_id.  Creates new html tags and adds each item
to the Most Recently Donated Items table.
Parameters: js object
Precondtions: passed JSON.stringify js object
Postconditions: rows added to table
*/

function addRecentlyAdded(response){
	//console.log(response);	//for testing and figuring our where our info is
	
	//only print the last 10 items to the most recently added items
	response.forEach(function(element){
		var newRow = document.createElement('tr');
		//commented out so internal links work
		//we are using item_id as the #link
		newRow.id = "headline" + element["item_id"];
	
		var newHeadline = document.createElement('td');
		
		var a = document.createElement('a');
		a.title = element['headline'];
		a.href = "#row" + element['item_id'];
		
		var linkText = document.createTextNode(element['headline']);
		a.appendChild(linkText);
		
		newHeadline.appendChild(a);
		
		newRow.appendChild(newHeadline);
		document.getElementById('recentlyAddedTable').appendChild(newRow);
		
	});
}

/* Function: addFullDetails()
Description: For each item passed, creates a new row with the item columns:
Headline, keyword_1 + keyword_2 + keyword_3, description, image, data uploaded
to the Donated items table.
Parameters: js object
Precondtions: passed JSON.stringify js object
Postconditions: rows added to table
*/

function addFullDetails(response){
	//console.log(response);
	
	var newTbody = document.createElement('tbody');
	newTbody.id = "fullDetailTableBody";
	document.getElementById('outputTable').appendChild(newTbody);
	
	response.forEach(function(element){
		
		// adding the headline
		var newRow = document.createElement('tr');
		newRow.id = "row" + element["item_id"];
		var newHeadline = document.createElement('td');
		
		var a = document.createElement('a');
		a.name = element['item_id'];
		a.class = "anchor";
		var linkText = document.createTextNode(element['headline']);
		a.appendChild(linkText);
		
		newHeadline.appendChild(a);
		newRow.appendChild(newHeadline);
		
		//adding the keywords
		var newKeywords = document.createElement('td');
		newKeywords.textContent = element['keyword_1'] + ", " + element['keyword_2'] + ", " + element['keyword_3'];
		
		newRow.appendChild(newKeywords);
		
		//adding the description
		var newDescription = document.createElement('td');
		newDescription.textContent = element['description'];
		newRow.appendChild(newDescription);
		
		//get image name and create a new image 
		var newImageCell = document.createElement('td');
		//that worked!! ty need to do some css on those images though and constrain them a bit
		//they are huge
		//yeah good point ha
		if(element["image_name"] != null){
			var newImage = document.createElement('img');
			newImage.src = "/images/" + element['image_name'];
			newImageCell.appendChild(newImage);
			newImage.className = "img-rounded";
		} 
		else {
			newImageCell.textContent = "No Picture Found";
			
		}
			newRow.appendChild(newImageCell);
		
		//get date timestap
		var newUploadTS = document.createElement('td');
		newUploadTS.className = "td-expand";
		var s = element['upload_ts'];
		//strip off the time bit of the date
		//date from mysql shows as yyyy-mm-ddThh:mm:ss
		s = s.substring(0,s.indexOf('T'));
		newUploadTS.textContent = s;
		newRow.appendChild(newUploadTS);
		
		var newCell = document.createElement('td');
		var newChkBox = document.createElement('input');
		newChkBox.type = 'checkbox';

		newChkBox.id = element['item_id'];
		newChkBox.className = "item_checkboxes";
		newChkBox.value = "secure";			//secure means we want to try to secure the item
		
		newChkBox.addEventListener('click', function(){
			secureSelectedItem(this);
		});
		
		newCell.appendChild(newChkBox);
		
		newRow.appendChild(newCell);
		
		document.getElementById('fullDetailTableBody').appendChild(newRow);
	});	
	
}


/*Function: secureSelectedItem
Description: when a checkbox is clicked it sends the checkbox's id === item_id
checkbox's value === action to do to the server.  Trying to secure the item
Depending on the server's response, changes the checkbox.value 
Parameters: the checkbox that was clicked passed in to function
Postconditions: item secured if available and checkbox value changed accordingly
*/
function secureSelectedItem(checkbox){
	var req = new XMLHttpRequest();
	req.open("POST", '/secureItem', true);
	
	req.setRequestHeader('Content-Type', 'application/json');
	req.send(JSON.stringify({id:checkbox.id, do_this:checkbox.value}));
	removeCheckOutStatement();
	req.addEventListener('load', function(){
		if(req.status >= 200 && req.status < 400){
			var response = JSON.parse(req.responseText);
			//console.log(response);
			if(response['message'] === "secured"){
				//console.log("changing value to release");
				checkbox.value = "release";
				addCheckoutStatement("Item reserved. Please review your order to checkout.");
			}
			else if(response['message'] === "released"){
				checkbox.value = "secure";
				//addCheckoutStatement("Item released.");
			}
			else if(response['message'] === "failed"){
				checkbox.value = "secure";
				checkbox.checked = false;
				window.alert("This item is not available anymore");
			}
		}
		else{
			removeStatements();
			addGeneralErrorStatement();
			console.log("Something went horribly wrong. Check to see if mySQL server is running.")
		}
	});
	
	//any time there is a change in selected items, revert back to requiring Review Order
	document.getElementById('checkoutbutton').disabled = true;
	
}

/*Function: getCheckedItems()
returns a list of all the items that have been checked on the page
*/

function getCheckedItems(){
	var elements = document.getElementsByClassName('item_checkboxes');
	var len = elements.length;
	var items = [];
	for(var i = 0; i < len; i++){
		if(elements[i].checked === true){
			items.push(elements[i].id);
		}
	}
	
	return items;
}

/*Function : reviewOrder()
Description: gets all the checkboxes that are checked
for each checked item, checks to see if the user logged in is the donor
FUTURE use: check that the user is allowed to order more items
*/

function reviewOrder(){
	var payload = {};
	payload.items = [];
	payload.items = getCheckedItems();
	removeCheckOutStatement();
	
	if(payload.items.length > 0 && payload.items.length < 4){
		var req = new XMLHttpRequest();
		req.open("POST", '/reviewOrder', true);
		req.setRequestHeader('Content-Type', 'application/json');
		req.send(JSON.stringify(payload));
		req.addEventListener('load', function(){
			if(req.status >= 200 && req.status < 400){
				removeCheckOutStatement();
				var response = JSON.parse(req.responseText);
				if(response.message == "noLogon"){
					addCheckoutStatement("Please logon first!");
				} else if(response.message == "notAllowed" || response.message == "TooManyPending"){
					addCheckoutStatement("You are not authorized to order any more items.");
					uncheckItems(payload.items);
				} else if(response.message =="tooManyPending") {
					addCheckoutStatement("Your cart put you over the limit of 3 allowed outstanding items.  You have " + response.pendingItems + " outstanding items ordered.");
				}else if (response.length > 0) {
					for(var i = 0; i < response.length; i++){
						document.getElementById(response[i].item_id).click();
					}

					addCheckoutStatement("We removed items from cart that you donated, please review your cart again.");
				//	document.getElementById('checkoutbutton').disabled = false;
				} else {
					addCheckoutStatement("You may now checkout.");
					document.getElementById('checkoutbutton').disabled = false;
				}
			}	
		});
	} else if (payload.items.length > 3){
		addCheckoutStatement("Too many items, no more than 3 per order");
	} else if (payload.items.length === 0){
		addCheckoutStatement("Nothing to review.  Please select an item.");
	}
}


/*Function: uncheckItems()
Parameters: array of items and their id
Description: for each item passed in get that check box from the dom and
uncheck it.  Item should be an array of ints that matches the checkboxes id*/
function uncheckItems(items){
	for(var i = 0; i < items.length; i++){
		document.getElementById(items[i]).checked = false;
	}
}


/*Function: checkOut()
Description: gets all the checkboxes that are in the class "item_checkboxes"
for each checkbox that is "checked" add that checkbox's id == item_id to the array.
Also collects the customer's id from their logon session variable.
Passes the array and customer's id to the server for processing of the order.
Parameters: none
Preconditions: checkboxes exist with class "item_checkboxes"
Postconditions: customer id and wanted items sent to server
*/

function checkOut(){
	var payload = {};
	payload.items = [];
	payload.items = getCheckedItems();
	
	if(payload.items.length > 0){
		removeCheckOutStatement();
		addCheckoutStatement("Checking out");
		var req = new XMLHttpRequest();
		req.open("POST", '/checkout', true);
		req.setRequestHeader('Content-Type', 'application/json');
		req.send(JSON.stringify(payload));
	
		req.addEventListener('load', function(){
			if(req.status >= 200 && req.status < 400){
				var response = JSON.parse(req.responseText);
				if(response.message === "Success"){
					removeCheckOutStatement();
					addCheckoutStatement("Successfully checked out");
					removeItemsFromTable(payload);
				} else if(response.message === "noLogon"){
					removeCheckOutStatement();
					addCheckoutStatement("Please logon first!");
				}
				
			}
		});
	} else {
		removeCheckOutStatement();
		addCheckoutStatement("Nothing found to checkout");
	}

}

/*Function: logon()
*/
function logon(){
	var enteredName = document.getElementById('usernameField').value;
	var enteredPass = document.getElementById('passwordField').value;
	if(enteredName == "" || enteredPass == ""){
		removeStatements();
		addGeneralErrorStatement("Please enter a username and password");
		event.preventDefault();
		return;
	} else {
		var req = new XMLHttpRequest();
		req.open("POST", '/userLogon', true);
		req.setRequestHeader('Content-Type', 'application/json');
		
		req.send(JSON.stringify({username:enteredName, password:enteredPass}));
		req.addEventListener('load', function(){
			if(req.status >= 200 && req.status < 400){
				removeStatements();
				var result = JSON.parse(req.responseText);
				if(result.length != 0){
					removeStatements();
					addGeneralErrorStatement("Logon successful. Welcome, " + enteredName + " your id is " + result[0].person_id);
					switchLogon(true);
					document.getElementById('welcomeMessage').textContent = "Welcome to Goodbay, " + enteredName;
				} else {
					addGeneralErrorStatement("User/ Password invalid.");
					switchLogon(false);
				}
			} else {
				removeStatements();
				addGeneralErrorStatement("Error returning user from db");
			}
		});
	}
	document.getElementById('checkoutbutton').disabled = true;
	removeCheckOutStatement();
	event.preventDefault();
}

//log the user off the system
function logoff(){
	var req = new XMLHttpRequest();
	req.open("POST", '/userLogoff', true);
	req.setRequestHeader('Content-Type', 'application/json');
	req.send(null);
	req.addEventListener('load', function(){
		if(req.status >= 200 && req.status < 400){
			removeStatements();
			addGeneralErrorStatement("User logged off");
			document.getElementById('welcomeMessage').textContent = "Welcome to Goodbay!";
			switchLogon(false);
		}
	});
	document.getElementById('checkoutbutton').disabled = true;
	removeCheckOutStatement();
	event.preventDefault();
}

function checkLogOn(){
	var req = new XMLHttpRequest();
	req.open("POST", '/isLoggedIn', true);
	req.setRequestHeader('Content-Type', 'application/json');
		
	req.send(null);
	req.addEventListener('load', function(){
		if(req.status >= 200 && req.status < 400){
			var response = JSON.parse(req.responseText);
			if(response.message === 'yes'){
				switchLogon(true);
				document.getElementById('welcomeMessage').textContent = "Welcome to Goodbay, " + response.username;
			} else {
				switchLogon(false);
			}
		}
	});
}

/*this function disables the logon fields and button so it cannot be clicked again*/
/*enables the logout button*/
function switchLogon(passedBool){
		document.getElementById('usernameField').disabled = passedBool;
		document.getElementById('usernameField').value = "";
		document.getElementById('passwordField').disabled = passedBool;
		document.getElementById('passwordField').value = "";
		document.getElementById('logonbutton').disabled = passedBool;
		document.getElementById('logoutbutton').disabled = !(passedBool);
}

/*Function: removeItemsFromTable()
*/
function removeItemsFromTable(payload){
	for(var i = 0; i < payload.items.length; i++){
		var rowName = "row" + payload.items[i];
		var removeThis = document.getElementById(rowName);
		removeThis.parentNode.removeChild(removeThis);
		var rowName = "headline" + payload.items[i];
		var removeThis = document.getElementById(rowName);
		removeThis.parentNode.removeChild(removeThis);
	}
}

/*Function: searchForItems()*/
function searchForItem(){
	var text = document.getElementById('keywordSearchBox').value;
	removeSearchStatement();
	if(text == ""){
		addSearchStatement("Please enter some text to search for.");
	} else{
		var req = new XMLHttpRequest();
		req.open("POST", '/searchForItems', true);
		req.setRequestHeader('Content-Type', 'application/json');
		req.send(JSON.stringify({keyword:text}));
		req.addEventListener('load', function(){
			if(req.status >= 200 && req.status < 400){
				var result = JSON.parse(req.responseText);
				if(result.length > 0){
					removeFullDetailsBody();
					addFullDetails(result);
					window.location.hash = "row" + result[0].item_id;
				} else {
					
					addSearchStatement("No items with keywords matching " + text);
				}
			} else{
				removeStatements();
				addGeneralErrorStatement("Something went wrong searching for an item");
			}
		});
	}
	document.getElementById('keywordSearchBox').value = '';
	event.preventDefault();
}

/*Function: resetSearchItems()
resets the table to show all the items presently avaiable
*/

function resetSearchItems(){
	removeSearchStatement();
	removeFullDetailsBody();
	getInfo();
	document.getElementById('keywordSearchBox').value = '';
	event.preventDefault();
}

/*Function: removeFullDetailsBody()
*/

function removeFullDetailsBody(){
	if(document.getElementById('fullDetailTableBody')){
		var removeThis = document.getElementById('fullDetailTableBody');
		removeThis.parentNode.removeChild(removeThis);
	}
}

/*Function: releaseReservedItems()
*/

function releaseReservedItems(){
	var elements = document.getElementsByClassName('item_checkboxes');
	var payload = {};
	payload.items = [];

	for(var i = 0; i < elements.length; i++){
		if(elements[i].checked === true){
			payload.items.push(elements[i].id);
		}
	}
	
	if(payload.items.length > 0){
		var req = new XMLHttpRequest();
		req.open("POST", '/releaseReserved', true);
		req.setRequestHeader('Content-Type', 'application/json');
		req.send(JSON.stringify(payload));
	}
}
/*Function: addCheckoutStatement()
Description:
Parameters:
Preconditions:
Postconditions:
*/
function addSearchStatement(writeThis){
	var newSpan = document.createElement('span');
	newSpan.textContent = writeThis;
	newSpan.id = "searchNotify";
	document.getElementById('searchNotification').appendChild(newSpan);
}

/*Function: removeCheckoutStatement()
*/
function removeSearchStatement(){
	if(document.getElementById('searchNotify')){
		var removeThis = document.getElementById('searchNotify');
		removeThis.parentNode.removeChild(removeThis);
	}
}
/*Function: addCheckoutStatement()
*/
function addCheckoutStatement(writeThis){
	var newSpan = document.createElement('span');
	newSpan.textContent = writeThis;
	newSpan.id = "checkOutNotify";
	document.getElementById('checkoutNotification').appendChild(newSpan);
}

/*Function: removeCheckoutStatement()
*/
function removeCheckOutStatement(){
	if(document.getElementById('checkOutNotify')){
		var removeThis = document.getElementById('checkOutNotify');
		removeThis.parentNode.removeChild(removeThis);
	}
}

/*Function: addGeneralErrorStatemet()
Description: writes a general error statement to the div pageNotifications
Parameters: none
Precondtions: div with id pageNotifications exists
Postconditions: span added with text
*/

function addGeneralErrorStatement(writeThis){
	var newSpan = document.createElement("span");
	newSpan.id = "notify";
	newSpan.textContent=writeThis;
	document.getElementById('pageNotifications').appendChild(newSpan);
}

/*Function: removeStatements
Description: removes any existing statement with id notify
Parameters:none
Preconditions: element exists
Postconditions: element removed
*/	
function removeStatements(){
	if(document.getElementById('notify')){
		var removeThis = document.getElementById('notify');
		removeThis.parentNode.removeChild(removeThis);
	}
}


/* REMOVE THIS FUNCTION BEFORE RELEASE */
/*Function: setResetButton()
Description: adds an event listener that makes a post call to /resetItems
sets all object_wanted fields to 0 "available"
Parameters:
Preconditions: Items exist in table donated_items
Postconditions: object_wanted fields set to 0
*/

function setResetButton(){
	document.getElementById("resetItems").addEventListener('click', function(){
		var req = new XMLHttpRequest();
		req.open("POST", '/resetItems', true);
		req.setRequestHeader('Content-Type', 'application/json');
		req.send();
		window.location.reload();
	});
}


//Function myFunction
// part of the navigation drop down menu
// cite: https://www.w3schools.com/howto/howto_js_dropdown.asp
function myFunction() {
    document.getElementById("myDropdown").classList.toggle("show");
}

// Close the dropdown menu if the user clicks outside of it
// cite: https://www.w3schools.com/howto/howto_js_dropdown.asp
window.onclick = function(event) {
  if (!event.target.matches('.dropbtn')) {

    var dropdowns = document.getElementsByClassName("dropdown-content");
    var i;
    for (i = 0; i < dropdowns.length; i++) {
      var openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
}


/*Function: not an actual function
Description: don't run any of the javascript until the page has
fully loaded.
Parameters: none
Preconditions: DOM loaded
Postconditions: run javascript to build remaining page
*/	
document.addEventListener('DOMContentLoaded', function(){
	getHeadlines();
	getInfo();
	//setResetButton();
	document.getElementById('checkoutbutton').addEventListener('click', function(){ checkOut(); });
	document.getElementById('reviewbutton').addEventListener('click', function() { reviewOrder();});
	document.getElementById('logonbutton').addEventListener('click', function(){ logon();});
	document.getElementById('logoutbutton').addEventListener('click', function(){ logoff();});
	document.getElementById('searchbutton').addEventListener('click', function(){ searchForItem(); });
	document.getElementById('resetsearchbutton').addEventListener('click', function() { resetSearchItems();	});
	//window.localStorage.setItem("user_pid","-1");
	window.onbeforeunload = function(){	releaseReservedItems();	};
	checkLogOn();
});


