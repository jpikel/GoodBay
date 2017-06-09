/*Filename: addItem.js
    Description: checks the file size and extension of the file in the input file
    when a user is uploading an item
    Authors: Isaac Neibaur, Johannes Pikel, Berry Semexan, Akshay Subramanian, Ivan Xa
	Class: CS361-400
	Date: 2017.09.06
	Assignment: Project B
*/



function checkSize(contents) {
    if (document.getElementById('warning')) {
        document.getElementById('warning').parentNode.removeChild(document.getElementById('warning'));
    }
    var fileSize = contents.files[0].size;
    fileSize = fileSize / 1000000;
    fileSize = Math.round(fileSize * 100) / 100;
    if (contents.files[0] && contents.files[0].size > 1000000) {
        document.getElementById('fileInputField').value = null;
        createWarningDiv("Your file is " + fileSize + " MB. The limit is 1 MB.");
        return;
    }
    checkExtension(contents);
}


function checkExtension(contents) {
    var fileName = contents.files[0].name.split('.').pop();
    switch (fileName.toLowerCase()) {
        case 'jpg':
        case 'png':
        case 'jpeg':
            return;
    }
    document.getElementById('fileInputField').value = null;
    createWarningDiv('Invalid file extension');
}


function createWarningDiv(message) {
    var newElement = document.createElement('div');
    newElement.className = "alert alert-danger alert-dismissable smaller";
    newElement.textContent = message;
    newElement.id = "warning";
    document.getElementById('addFloatHere').appendChild(newElement);
    newElement = document.createElement('a');
    newElement.className = "close";
    newElement.setAttribute("data-dismiss", "alert");
    newElement.setAttribute("aria-label", "close");
    newElement.href = "#";
    newElement.innerHTML = '&times;';
    document.getElementById('warning').appendChild(newElement);
}

document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('fileInputField')) {
        document.getElementById('fileInputField').addEventListener('change', function() {
            checkSize(this);

        });
    }

});
