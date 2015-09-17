// When the user hits return, send the "text-entered"
// message to main.js.
// The message payload is the contents of the edit box.
var textArea = document.getElementById("edit-box");
var button = document.getElementById("submit");
var trust = document.getElementsByName("trust");
var error = document.getElementById("error");

textArea.addEventListener('keyup', function onkeyup(event) {
  getTrust();
}, false);

button.addEventListener('click', function(){
  getText();
})

var getTrust = function(){
  for (i=0; i < 2; i++) {
    if (trust[i].checked==true) {
      return trust[i].value;
    }
  }
  return '';
}

var cleanPanel = function(){
  error.style.display = 'none';
  textArea.value = '';
  for (i=0; i < 2; i++) {
    if (trust[i].checked==true) {
      trust[i].checked = false;
    }
  }
}

var getText = function(){
  var answer = getTrust();
  var text = textArea.value;
  if(text == "" || answer == ""){
    error.style.display = 'block';
  }else{
    cleanPanel();
    self.port.emit("text-entered", {answer: answer, text: text});
  }
}

// Listen for the "show" event being sent from the
// main add-on code. It means that the panel's about
// to be shown.
//
// Set the focus to the text area so the user can
// just start typing.
self.port.on("show", function onShow() {
  //textArea.focus();
});
