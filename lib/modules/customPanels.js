function CustomPanels() {
    var simpleStorage = require("sdk/simple-storage");
    var text_entry, userid_entry;

  this.initPanels = function(pluginName){
    var data = require('sdk/self').data;
    var panel = require('sdk/panel');
    var correctInputId, correctInputText;

    this.pluginName = pluginName;
    that = this;
    
    text_entry = panel.Panel({
      contentURL: data.url("panel/text-entry.html"),
      contentScriptFile: data.url("panel/get-text.js")
    });

    text_entry.on("show", function() {
      correctInputText = false;
      text_entry.port.emit("show");
    });

    // Listen for messages called "text-entered" coming from
    // the content script. The message payload is the text the user
    // entered.
    text_entry.port.on("text-entered", function (options) {
      correctInputText = true;
      sendRequest(options);
      text_entry.hide('result');
    });

    text_entry.on("hide", function() {
      if(!correctInputText){
        text_entry.show();
      }
    });

    userid_entry = panel.Panel({
      contentURL: data.url("panel/userid.html"),
      contentScriptFile: data.url("panel/userid.js")
    });

    userid_entry.on("show", function() {
      correctInputId = false;
      userid_entry.port.emit("show");
    });

    userid_entry.port.on("userid-entered", function (options) {
      simpleStorage.storage.userid = options.id;
      correctInputId = true;
      userid_entry.hide('result');
    });

    userid_entry.on("hide", function() {
      if(!correctInputId){
        that.getUserId()
      }
    });
  }

  this.getUserId = function(){
    if(!simpleStorage.storage.userid){
      userid_entry.show();
      return false;
    }else{
      return true;
    }
  }

  this.setPanelInterval = function(){
  that = this;
    var { setInterval } = require("sdk/timers");
    setInterval(function(){
      if(that.getUserId()){
        text_entry.show(); 
      }
    }, 10000);
  }

  this.setParameter = function(options){
    this.sslStatus = options.sslStatus;
    this.baseDomain = options.baseDomain;
    this.theme = options.theme;
  }

  var sendRequest = function (options){
    var Request = require("sdk/request").Request;
    var req = Request({
      url: "http://localhost:3000/log",
      content: {
        pluginName: that.pluginName,
        userid: simpleStorage.storage.userid,
        baseDomain: that.baseDomain,
        sslStatus: that.sslStatus,
        theme: that.theme,
        trust: options.answer,
        text: options.text
      },
      onComplete: function (response) {
        console.log(response.status);
      }
    }).post();
  }
}

exports.CustomPanels = new CustomPanels();