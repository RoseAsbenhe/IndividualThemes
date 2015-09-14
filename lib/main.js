/**
 *
 * SSLPersonas
 * Originally written by Tobias Stockinger - tobi@tobitobi.de
 * Rewritten in 11/2014.
 *
 *
 * 3rd Party Code:
 * jQuery - https://code.jquery.com/jquery-2.1.1.min.js - licensed under the MIT License
 *
 * Credits:
 * Chris Beard <cbeard@mozilla.org> for Personas Plus Addon. Looking at its code was a huge help.
 * Andras Tim <andras.tim@gmail.com> for New MitM Me Addon (Bypass Concept).
 * Martin Esche for showing me how easy the switch to JetPack was.
 * Max-Emanuel Maurer and Alexander de Luca for their consultation a couple of years ago ;)
 *
 * Licensed (C) 2014 under the MIT License
 * See LICENSE for further information.
 *
 * The source is available on GitHub
 * https://github.com/TobiasStockinger/SSLPersonas
 */


(function () { // Begin (anonymous) namespace / scope
    var lastSSLStatus;
    var tabs = require('sdk/tabs');
    var { viewFor } = require("sdk/view/core");
    var themeSwitcher = require('./modules/themeSwitcher').themeSwitcher;
    var sslHandler = require('./modules/sslHandler').SSLHandler;
    var data = require('sdk/self').data;
    var ss = require("sdk/simple-storage");
    var oldTheme = { id: undefined };
    var text_entry = require("sdk/panel").Panel({
      contentURL: data.url("text-entry.html"),
      contentScriptFile: data.url("get-text.js")
    });

    text_entry.on("show", function() {
      text_entry.port.emit("show");
    });

    text_entry.on("hide", function() {
      //console.log('hide');
    });

    // Listen for messages called "text-entered" coming from
    // the content script. The message payload is the text the user
    // entered.
    // In this implementation we'll just log the text to the console.
    text_entry.port.on("text-entered", function (text) {
      console.log(text);
      ss.storage.userid = text;
      text_entry.hide();
    });


    
    var getBaseDomain = function(window){
        const {Cc, Ci} = require('chrome');
        var eTLDService = Cc["@mozilla.org/network/effective-tld-service;1"].getService(Ci.nsIEffectiveTLDService);
        var ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);
        return eTLDService.getBaseDomain(ioService.newURI(tabs.activeTab.url, null, null));
    };


    /**
     * Is triggered whenever the user interacts with tabs.
     * @callback for a lot of tab-change related stuff.
     */
    function chromeInteractionCallback(window) {
        var sslStatus  = sslHandler.getSSLStatus(window);
        var newTheme = themeSwitcher.theme.defaultTheme;
        if(sslStatus == 'extendedValidation'){
            var baseDomain = getBaseDomain();
            var pageName   = baseDomain.split(".")[0];
            if(themeSwitcher.theme[pageName]){
                newTheme = themeSwitcher.theme[pageName];
            }
        }
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

    function setPopupInterval(){
        var { setInterval } = require("sdk/timers");
        setInterval(function(){ text_entry.show(); }, 10000);
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
            tabs.open(data.url('https://vannsl.io/individualthemes.html'));
            text_entry.show();
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

    function getUserId(){
        if(!ss.storage.userid){
            text_entry.show();
        }
        ss.storage.myArray = [1, 1, 2, 3, 5, 8, 13];
    }

    addActionButton();
    initTabListeners();
    initWindowListeners();
    registerUnloadCallbacks();
    getUserId();
    setPopupInterval();



})(); // End (anonymous) namespace. Call the function.