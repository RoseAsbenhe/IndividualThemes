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
    var customPanels = require('./modules/customPanels').CustomPanels;
    var sslHandler = require('./modules/sslHandler').SSLHandler;
    var oldTheme = { id: undefined };
    var data = require('sdk/self').data;


    
    var getBaseDomain = function(window){
        const {Cc, Ci} = require('chrome');
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
        
    };


    /**
     * Is triggered whenever the user interacts with tabs.
     * @callback for a lot of tab-change related stuff.
     */
    function chromeInteractionCallback(window) {
        var sslStatus  = sslHandler.getSSLStatus(window);
        var uri = getBaseDomain();
        var newTheme = themeSwitcher.theme.defaultTheme;
        if(sslStatus == 'extendedValidation'){
            var pageName = uri.baseDomain.split(".")[0];
            if(themeSwitcher.theme[pageName]){
                newTheme = themeSwitcher.theme[pageName];
            }
        }
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

    addActionButton();
    initTabListeners();
    initWindowListeners();
    registerUnloadCallbacks();
    customPanels.initPanels('trustedThemes');
    customPanels.getUserId();
    customPanels.setPanelInterval();



})(); // End (anonymous) namespace. Call the function.