// When the user hits return, send the "text-entered"
// message to main.js.
// The message payload is the contents of the edit box.
var textArea = document.getElementById("edit-box");
var secondInput = document.getElementById("reason");
var button = document.getElementById("submit");
var trust = document.getElementById("trust");
var close = document.getElementById("close");
var firstClick;

button.addEventListener('click', function(){
  getText();
});

trust.onchange = function() {
  if(!firstClick){
    firstClick = true;
    secondInput.style.display = "block";
  }
};

close.addEventListener('click', function(){
  cleanPanel();
  self.port.emit("text-closed");
});

var cleanPanel = function(){
  textArea.value = '';
  trust.value = 50;
}

var getText = function(){
  var range = trust.value;
  var text = textArea.value;
  cleanPanel();
  self.port.emit("text-entered", {answer: range, text: text});
}

// Listen for the "show" event being sent from the
// main add-on code. It means that the panel's about
// to be shown.
//
// Set the focus to the text area so the user can
// just start typing.
self.port.on("show", function onShow() {
  firstClick = false;
  secondInput.style.display = "none";
});

