/**
 *
 * TrustedThemes
 * author: Vanessa Böhner - mail@vannsl.io
 *
 * Extension of SSLPersonas, originally written by Tobias Stockinger - tobi@tobitobi.de
 *
 *
 * 3rd Party Code:
 * jQuery - https://code.jquery.com/jquery-2.1.1.min.js - licensed under the MIT License
 *
 * Licensed (C) 2014 under the MIT License
 * See LICENSE for further information.
 *
 * The source is available on GitHub
 * https://github.com/RoseAsbenhe/IndividualThemes
 */


(function () { // Begin (anonymous) namespace / scope
  const {Cc,Ci,Cu,components} = require("chrome");
  Cu.import("resource://gre/modules/FileUtils.jsm");
  var tabs = require('sdk/tabs');
  var { viewFor } = require("sdk/view/core");
  var themeSwitcher = require('./modules/themeSwitcher').themeSwitcher;
  var customPanels = require('./modules/customPanels').CustomPanels;
  var sslHandler = require('./modules/sslHandler').SSLHandler;
  var oldTheme = { id: 'default' };
  var data = require('sdk/self').data;
  var absolutePath;

  
  var getBaseDomain = function(window){
    var eTLDService = Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService);
    var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
    var uri = ioService.newURI(tabs.activeTab.url, null, null);
    var host = uri.asciiHost;
    var url = uri.asciiSpec;
    if(host.contains('.')){
        return {baseDomain: eTLDService.getBaseDomain(uri), url: url};
    }else{
        return {baseDomain: host, url: url};
    } 
  }

  var createNewTheme = function(pageName, sslStatus, uri){
    themeSwitcher.createTheme(pageName);
    setTheme(themeSwitcher.theme[pageName], sslStatus, uri);
  }

  var saveImage = function(themePath, pageName, decodedResponse, sslStatus, uri){
    Cu.import("resource://gre/modules/NetUtil.jsm");
    var file = new FileUtils.File(themePath);
    var ostream = FileUtils.openSafeFileOutputStream(file);
    var foStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance(Ci.nsIFileOutputStream);

    // use 0x02 | 0x10 to open file for appending.
    foStream.init(file, -1 , 0666, 0);
    foStream.write(decodedResponse, decodedResponse.length);
    createNewTheme(pageName, sslStatus, uri);
  }


  var checkAvailbilityOfTheme = function(pageName, sslStatus, uri) {
    var path = require('sdk/fs/path');
    var themePath = path.join(absolutePath,pageName+".png");
    var file = new FileUtils.File(themePath);

    // if the theme already exists, we use it
    if(themeSwitcher.theme[pageName]){
      setTheme(themeSwitcher.theme[pageName], sslStatus, uri);

    // if the file already exists, but not the theme, we create the theme
    }else if (file.exists()) {
      createNewTheme(pageName, sslStatus, uri);

    // otherwise we send a request to the server to check whether there is a trusted theme or not
    }else {
      var Request = require("sdk/request").Request;
      var req = Request({
        url: "http://trustedthemes.vannsl.io/themes",
        content: {
          pageName: pageName
        },
        onComplete: function (response) {
          var rawResponse = response.text;

          // if there is no theme, we set the default theme
          if(rawResponse == "No Theme"){
            setTheme(themeSwitcher.theme.defaultTheme, sslStatus, uri);

          // if there is a theme, we decode the file and save the image to the tmp directory of the addon
          }else{
            var base64 = require("sdk/base64");
            var decodedResponse = base64.decode(rawResponse);
            saveImage(themePath, pageName, decodedResponse, sslStatus, uri);
          }
        }
      }).get();
    }

      // var converter = components.classes["@mozilla.org/intl/scriptableunicodeconverter"].
      //                 createInstance(components.interfaces.nsIScriptableUnicodeConverter);
      // converter.charset = "UTF-8";
      // var istream = converter.convertToInputStream(rawResponse);

      

      // var converter = components.classes["@mozilla.org/intl/converter-output-stream;1"].
      //     createInstance(components.interfaces.nsIConverterOutputStream);
      // converter.init(foStream, "UTF-8", 0, 0);
      // converter.writeString(rawResponse);
      // converter.close(); // this closes foStream

      // The last argument (the callback) is optional.
      // NetUtil.asyncCopy(istream, ostream, function(status) {
      //   if (!components.isSuccessCode(status)) {
      //     // Handle error!
      //     return;
      //   }

      //   // Data has been written to the file.
      // });

      /*
      components.utils.import("resource://gre/modules/osfile.jsm");

      var file = OS.Path.join(OS.Constants.Path.desktopDir, "paypal.png");

      var str = imageDataURI.replace(/^.*?;base64,/, "");
      // Decode to a byte string
      str = atob(str);
      // Decode to an Uint8Array, because OS.File.writeAtomic expects an ArrayBuffer(View).
      var data = new Uint8Array(str.length);
      for (var i = 0, e = str.length; i < e; ++i) {
        data[i] = str.charCodeAt(i);
      }


      // To support Firefox 24 and earlier, you'll need to provide a tmpPath. See MDN.
      // There is in my opinion no need to support these, as they are end-of-life and
      // contain known security issues. Let's not encourage users. ;)
      var promised = OS.File.writeAtomic(file, data);
      promised.then(
        function() {
          // Success!
        },
        function(ex) {
          // Failed. Error information in ex
        }
      );
      */
  }


  /**
   * Is triggered whenever the user interacts with tabs.
   * @callback for a lot of tab-change related stuff.
   */
  function chromeInteractionCallback(window) {
    var sslStatus  = sslHandler.getSSLStatus(window);
    var uri = getBaseDomain();

    if(sslStatus == 'extendedValidation'){
      var pageName = uri.baseDomain.split(".")[0];
      var selectedTheme = checkAvailbilityOfTheme(pageName, sslStatus, uri);
    } else {
     setTheme(themeSwitcher.theme.defaultTheme, sslStatus, uri);
    }
  }

  function setTheme(newTheme, sslStatus, uri){

    customPanels.setParameter({sslStatus: sslStatus, url: uri.url, theme: newTheme.id});

    if(oldTheme.id != newTheme.id){
      themeSwitcher.switchToTheme(newTheme);
      oldTheme.id = newTheme.id;
    }
  }



  /**
   * Initializes all tab listeners/callbacks.
   * Basically, we add the sslCheck to all tab-related user interactions.
   */
  function initTabListeners() {

    // we attach our callback to those events.
    // Other potential candidates: 'open','load','pageshow'
    var handledEvents = [
      'ready',
      'activate'
    ];
    var eventCount = handledEvents.length; // performance paranoia.

    // now iterate over all events and attach an according listener to the tabs.
    for(var i=0;i<eventCount;i++){
      (function(event){
        tabs.on(event,function(tab){
          var window = viewFor(tab.window);


          // uncomment the next line to log events
          // console.log('tab ' + event + ' ' + tab.title);

          chromeInteractionCallback(window);
        });
        tabs.on('close',function(tab){
          // let's see if it was the last one;
          var windows = require('sdk/windows').browserWindows;
          var reason = 'tab closed';
          if(windows.length==0){
              console.log(reason);
              //themeSwitcher.cleanUpSSLPersonasThemes(reason);
          }
        });
        tabs.on('load',function(tab){
          customPanels.closePanels();
        });
      })(handledEvents[i]);
    }
  }

  /**
   * Initializes all _window_ listeners/callbacks.
   * Basically, we add the sslCheck to all window-related user interactions.
   */
  function initWindowListeners(){
    var windows = require('sdk/windows').browserWindows;
    windows.on('activate', function(window){
      var domWindow = viewFor(window);

      // uncomment the next line to log events
      // console.log('window ' + 'activate' + ' ' + window.title);

      chromeInteractionCallback(domWindow);
    });
    // we need to check if it was the last window.
    // if it was, we need to make sure, that
    // the theme is set to standard.
    windows.on('close',function(){
      var openWindows = require('sdk/windows').browserWindows;
      var reason = 'last window closed';
      if(openWindows.length == 0){
         //themeSwitcher.cleanUpSSLPersonasThemes(reason);
      }
    });
  }


  /**
   * adds an action button in the tool bar
   * that opens the about page.
   */
  function addActionButton(){
    var {ActionButton} = require('sdk/ui/button/action');
    // a reference to the tabs module / interface
    var tabs = require('sdk/tabs');

    function clickCallback(state){
      //tabs.open(data.url('https://vannsl.io/individualthemes.html'));
      customPanels.getFeedback();
    }

    ActionButton({
      id: 'trustedthemes-button',
      label: 'TrustedThemes',
      icon: {
        16 : data.url('img/icon/trustedthemes-16.png'),
        32 : data.url('img/icon/trustedthemes-32.png'),
        64 : data.url('img/icon/trustedthemes-64.png')
      },
      onClick: clickCallback
    });
  }


  /**
   * we don't want to leave traces when the user
   * uninstalls / disables TrustedThemes.
   * Also, it's better to clean up before shutdown.
   */
  function registerUnloadCallbacks(){
    function unloadCallback(reasonString){
      var cleanupReasons = [
        'uninstall',
        'disable',
        'shutdown'
      ];
      if(cleanupReasons.indexOf(reasonString)){
        console.log('Cleaning up after SSLPersonas. Reason: '+reasonString);
        themeSwitcher.cleanUpSSLPersonasThemes('unloadCallback '+reasonString);
      }
    }

    try{
      var unload = require('sdk/system/unload');
      unload.when(unloadCallback);
    }
    catch(e){
      console.log('Unload callbacks not available.');
    }
  }

  function initAbsolutePath(){
    Cu.import("resource://gre/modules/AddonManager.jsm");
    AddonManager.getAddonByID('trustedThemes@vannsl.io', function(result){
      result.getDataDirectory(function(innerResult){
        absolutePath = innerResult;
        themeSwitcher.absolutePath = innerResult;
      });
    });
  }

  addActionButton();
  initTabListeners();
  initAbsolutePath();
  initWindowListeners();
  registerUnloadCallbacks();
  customPanels.initPanels('trustedThemes');
  customPanels.getUserId();
  customPanels.setPanelInterval();



})(); // End (anonymous) namespace. Call the function.