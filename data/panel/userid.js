// When the user hits return, send the "text-entered"
// message to main.js.
// The message payload is the contents of the edit box.
var input = document.getElementById("userid");
var button = document.getElementById("submit");
var error = document.getElementById("error");

input.addEventListener('keyup', function onkeyup(event) {
  if (event.keyCode == 13) {
    getText();
  }
}, false);

button.addEventListener('click', function(){
	getText();
});

var getText = function(){
	var id = input.value;
	if(id == ""){
		error.style.display = 'block';
	}else{
		self.port.emit("userid-entered", {id: id});
	}
}

// Listen for the "show" event being sent from the
// main add-on code. It means that the panel's about
// to be shown.
//
// Set the focus to the text area so the user can
// just start typing.
self.port.on("show", function onShow() {
  input.focus();
});