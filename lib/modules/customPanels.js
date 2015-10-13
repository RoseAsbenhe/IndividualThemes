function CustomPanels() {
  var simpleStorage = require("sdk/simple-storage");
  var text_entry, userid_entry, error_message, http_error_message, success_message;
  var tabs = require("sdk/tabs");
  var currentTab;
  var pluginName, sslStatus, url, theme;
  var { setInterval, setTimeout } = require("sdk/timers");

  this.initPanels = function(plugin){
    var data = require('sdk/self').data;
    var panel = require('sdk/panel');
    var correctInputId, correctInputText;
    pluginName = plugin;

    error_message = panel.Panel({
      contentURL: data.url("panel/error.html"),
      width: 500,
      height: 200
    });

    http_error_message = panel.Panel({
      contentURL: data.url("panel/http_error.html"),
      width: 500,
      height: 200
    });

    success_message = panel.Panel({
      contentURL: data.url("panel/success.html"),
      width: 500,
      height: 200
    });
    
    text_entry = panel.Panel({
      contentURL: data.url("panel/text-entry.html"),
      contentScriptFile: data.url("panel/get-text.js"),
      height: 500,
      width: 500
    });

    text_entry.on("show", function() {
      correctInputText = false;
      var contentDocument = require("sdk/window/utils").getMostRecentBrowserWindow();
      if(contentDocument != null && contentDocument != undefined){
        text_entry.port.emit("show");
      }
    });

    // Listen for messages called "text-entered" coming from
    // the content script. The message payload is the text the user
    // entered.
    text_entry.port.on("text-entered", function (options) {
      correctInputText = true;
      sendRequest(options);
      text_entry.hide();
    });

    text_entry.port.on("text-closed", function (options) {
      correctInputText = false;
      text_entry.hide();
    });

    text_entry.on("hide", function() {
      if(!correctInputText){
        getErrorMessage();
      }
    });

    userid_entry = panel.Panel({
      contentURL: data.url("panel/userid.html"),
      contentScriptFile: data.url("panel/userid.js"),
      height: 300,
      width: 600
    });

    userid_entry.on("show", function() {
      correctInputId = false;
      userid_entry.port.emit("show");
    });

    userid_entry.port.on("userid-entered", function (options) {
      simpleStorage.storage.userid = options.id;
      correctInputId = true;
      userid_entry.hide();
    });

    userid_entry.port.on("userid-closed", function (options) {
      correctInputId = false;
      userid_entry.hide();
    });

    userid_entry.on("hide", function() {
      if(!correctInputId){
        getErrorMessage();
      }
    });
  }

  this.getUserId = function(){
    var that = this;
    if(!simpleStorage.storage.userid){
      userid_entry.show();

      setTimeout(function(){
        that.intervalCallback();
      }, 300000);
      return false;
    }else{
      return true;
    }
  }

  this.getFeedback = function(){
    if(!text_entry.isShowing){
      if(this.getUserId()){
        text_entry.show();  
      }
    }
  }

  this.intervalCallback = function(){
    if(this.getUserId()){
      text_entry.show();
    }
  }
 
  var getErrorMessage = function(){
    error_message.show();
  }

  var getHTTPErrorMessage = function(){
    http_error_message.show();
  }

  var getSuccessMessage = function(){
    success_message.show();
  }

  this.setPanelInterval = function(){
    var that = this;
    setInterval(function(){
      that.intervalCallback();
    }, 3600000);
  }

  this.setParameter = function(options){
    sslStatus = options.sslStatus;
    url = options.url;
    theme = options.theme;
  }

  this.closePanels = function(){
    text_entry.hide();
    userid_entry.hide();
  }

  var sendRequest = function (options){
    var Request = require("sdk/request").Request;
    var req = Request({
      url: "http://trustedthemes.vannsl.io/log",
      content: {
        pluginName: pluginName,
        userid: simpleStorage.storage.userid,
        url: url,
        sslStatus: sslStatus,
        theme: theme,
        trust: options.answer,
        text: options.text
      },
      onComplete: function (response) {
        if(response.status == 200){
          getSuccessMessage();
        }else{
          getHTTPErrorMessage();
        }
      }
    }).post();
  }
}

exports.CustomPanels = new CustomPanels();