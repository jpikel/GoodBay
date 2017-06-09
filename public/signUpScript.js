/*Filename: signUpScript.js
    Description: performs password validation for the sign up page
    Authors: Isaac Neibaur, Johannes Pikel, Berry Semexan, Akshay Subramanian, Ivan Xa
	Class: CS361-400
	Date: 2017.09.06
	Assignment: Project B
	Description: validates the form for registering a user 
*/

document.addEventListener('DOMContentLoaded', function(){
    document.getElementById('passwordField').addEventListener('input', function(){
        validatePassword();
    });
    document.getElementById('confirmPassField').addEventListener('input', function(){
       confirmPasswordMatch();
    });
});

/*validates the password so that it only contains numbers, letters and is at least
8 characters long*/

function validatePassword(){
    removeStatement();
    var setDisabledToThis = false;
    var password = document.getElementById('passwordField').value;
    if(password.length < 7){
        addStatement("Password too short. ");
        changeSubmitButtonDisabled(true);
        setDisabledToThis = true;
    }
    if(!(/^([a-zA-Z0-9]+)$/.test(password)) && password.length > 0){
        removeStatement();
        addStatement("Letters and numbers only allowed.")
        changeSubmitButtonDisabled(true);
        setDisabledToThis = true;
    }
    
    document.getElementById('confirmPassField').disabled = setDisabledToThis;
}

function confirmPasswordMatch(){
    removeStatement();
    if(document.getElementById('passwordField').value === document.getElementById('confirmPassField').value){
        addStatement("Passwords match!");
        changeSubmitButtonDisabled(false);
    } else {
        addStatement("Password do not match!");
    }
    
}

/* changes the submit buttons availability */

function changeSubmitButtonDisabled(toThis){
    document.getElementById('submitbutton').disabled = toThis;
}


/* add a text statement to the div called notifications */
function addStatement(writeThis){
    var span = document.createElement('span');
    span.id = 'notify';
    span.textContent = writeThis;
    document.getElementById('notifications').appendChild(span);
}

/* remove a field with id called notify, added by addStatement() */
function removeStatement(){
    if(document.getElementById('notify')){
        var removeMe = document.getElementById('notify');
        removeMe.parentNode.removeChild(removeMe);
    }
}
