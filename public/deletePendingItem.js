/*Filename: deletePendingItems.js
    Description: javacsript file for the my donated items and my pending order page
    Authors: Isaac Neibaur, Johannes Pikel, Berry Semexan, Akshay Subramanian, Ivan Xa
	Class: CS361-400
	Date: 2017.09.06
	Assignment: Project B
*/


/* Function:activateReceived()
adds functionality to each button in the pending orders table
clicking on the button signals that the item has been received
*/

function activateReceived(){
	var buttons = document.getElementsByClassName("received");
	for (var i = 0; i < buttons.length; i++)
	{
		buttons[i].addEventListener('click', function(){
	    	received(this);
		});
	}
}


/* send this item to the server to mark as received
remove this item from the pending items table and add it to the received items table
remove the extraneously headers that are no longer needed for the received button
*/

function received(button){
	//send call to db 
	var payload = {};
	payload.itemId = button.id;
	//console.log(payload);
	var req = new XMLHttpRequest();
	req.open("POST", '/itemReceived', true);
	//not sure why this is sending undefined to the server -- will come back to this unless someone fixes it while im gone
	req.setRequestHeader('Content-Type', 'application/json');
	req.send(JSON.stringify(payload));
	req.addEventListener('load', function()	{
		var res = JSON.parse(req.responseText);
			removeStatements();
			addGeneralStatement("Item marked received and moved to Items Received");
	        var rowToRemove = document.getElementById("row"+button.id);
	        rowToRemove.parentNode.removeChild(rowToRemove);
	        var orderHeaderToRemove = document.getElementById("orderHeader"+button.id);
	        orderHeaderToRemove.parentNode.removeChild(orderHeaderToRemove);
	        var itemHeaderToRemove = document.getElementById("itemHeader"+button.id);
	        itemHeaderToRemove.parentNode.removeChild(itemHeaderToRemove);
	        var receivedItemsTable = document.getElementById('receivedItemsTable');
	        receivedItemsTable.appendChild(orderHeaderToRemove);
	        receivedItemsTable.appendChild(itemHeaderToRemove);
	        receivedItemsTable.appendChild(rowToRemove);
	        document.getElementById('orderDateHeader'+button.id).colspan = "4";
	        itemHeaderToRemove = document.getElementById('pendingItemReceivedHeader'+button.id);
	        itemHeaderToRemove.parentNode.removeChild(itemHeaderToRemove);
	        var cellToRemove = document.getElementById('buttonCell'+button.id);
	        cellToRemove.parentNode.removeChild(cellToRemove);
	        document.getElementById('dateToChangeOnReceived'+button.id).textContent = res[0].dateReceived;
		document.getElementById('dateHeaderToChange'+button.id).textContent = "Date Received";
	});
}


/*Function: addGeneralErrorStatemet()
Description: writes a general error statement to the div pageNotifications
Parameters: none
Precondtions: div with id pageNotifications exists
Postconditions: span added with text
*/

function addGeneralStatement(writeThis){
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


/* removes the element passed in from DOM */

function removeElement(removeMe){
	removeMe.parentNode.removeChild(removeMe);
}

document.addEventListener('DOMContentLoaded', function() {
	activateReceived();
});

