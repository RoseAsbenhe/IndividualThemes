/**
 * Created by Tobi Stockinger on 21.11.14.
 */

// A module that lets you easily switch to certain themes.
// the SSL themes are publicly offered as members.
function themeSwitcher(){
    // this makes the LightWeightThemeManager resource available.
    // we need it to change the LightWeightThemes, also known as Personas.
    var {Cu} = require('chrome');
    var sslStatus = require('./sslHandler').SSLHandler.SSL_STATUS;
    var PrefListener = require('./prefListener').PrefListener;
    var simpleStorage = require('sdk/simple-storage');
    var cleanupReasons = {
        standardActive : 'standardActive'
    };
    this.absolutePath;

    // these Ids are going to be cleaned up whenever we switch to the default theme.
    // the reason is that we don't want them to appear in the extensions list.
    var sslPersonasThemeIds = ['ev','sv','http','https','sslp_standard'];
    var self = this;

    var themeChangedListener = new PrefListener(
        "lightweightThemes.",
        function(branch, name) {
            switch (name) {
                case "lightweight-theme-changed":
                case "persisted.headerURL":
                case "isThemeSelected":
                    self.ensureCustomTheme();
                    break;
                case "lightweight-theme-change-requested":
                    break;
                case "usedThemes":
                    break;
                default:
                    break;
            }
        }
    );

    // Implitctly declared: var LightWeightThemeManger
    Cu.import('resource://gre/modules/LightweightThemeManager.jsm');


    /**
     * Constants for available themes.
     * @type {{extendedValidation: Theme, standardValidation: Theme, noSSL: Theme}}
     */
    this.theme = {};
    this.theme.defaultTheme  = simpleStorage.storage.userTheme || new Theme('default');


    /**
     * Wrapper for the LightweightThemeManager's themeChanged method.
     * Only thing we do is make sure to clean up the SSLPersonas themes
     * if we switch to the default theme.
     * @param theme object of type {id:?,name:?,headerURL:?}
     */
    this.switchToTheme = function(theme){
        if(theme && typeof theme  != 'undefined'){
            LightweightThemeManager.themeChanged(theme);
            // it doesn't happen that often, to switch to the
            // default theme.
            // let's use this opportunity to quickly clean up
            // after our add on.
            if(theme.id == this.theme.defaultTheme.id){
                this.cleanUpSSLPersonasThemes(cleanupReasons.standardActive);
            }
        }
    };



    /**
     * we do not want to leave any traces.
     * That's why we tell the theme manager
     * to forget all our themes.
     * This might be called onUninstall or even onClose.
     */
    this.cleanUpSSLPersonasThemes = function(reason){
        console.log("Cleanup "+reason);

        // on each clean up we restore the default theme
        // is restoring the default theme.
        // don't do this with this.switchToTheme, because this might
        // lead to recursion!
        if(typeof reason == 'undefined' || reason != cleanupReasons.standardActive){
            try{
                LightweightThemeManager.themeChanged(simpleStorage.storage.userTheme);
            }
            catch(e){ // pokemon!
                // gotta catch 'em all.
            }
        }



        // iterate over all themes that are stored
        // in this.theme
        // do not remove: defaultTheme, otherProtool
        for(var i=0;i<sslPersonasThemeIds.length;i++){
            (function(id){
                if(typeof id != 'undefined'){
                    LightweightThemeManager.forgetUsedTheme(id);
                }
            })(sslPersonasThemeIds[i]);
        }
    };



    this.ensureCustomTheme = function(){
        var previousTheme = LightweightThemeManager.currentTheme;

        // there was an active theme that was not the default theme
        if(previousTheme != null && typeof previousTheme != 'undefined'){

            if(previousTheme.id == self.theme.defaultTheme.id){
                // we already are using the custom theme.
                // getting here results most likely from another
                // callback to the themeChangeListener
                return;
            }

            // let's see if the theme is one of our own:
            if(sslPersonasThemeIds.indexOf(previousTheme.id) == -1){
                // if we get here, we know that the user has chosen her own theme.
                // let's try to preserve it. We're going to activate it when none
                // of our statuses are needed.
                simpleStorage.storage.userTheme = previousTheme;
                self.theme.defaultTheme = previousTheme;
                self.theme[sslStatus.otherProtocol] = previousTheme;
                console.log('Trying to use theme ' + previousTheme.name + ' by ' + previousTheme.author);
            }
            else{
                // last theme was an SSLPersonas theme. We don't persist anything.
            }
        }
        // the previous theme is Null in case the user chooses not to use
        // any custom theme, i.e. deactivates themes.
        // in that case, we want to use the standard theme again.
        else{
            delete simpleStorage.storage.userTheme;
            self.theme.defaultTheme = new Theme('default');
            self.theme[sslStatus.otherProtocol] = new Theme('default');
        }
    };

    this.createTheme = function(id){
        var path = require('sdk/fs/path');
        var separator = path.sep;
        var tmpPath = this.absolutePath;
        if(separator == "\\") {
            tmpPath = this.absolutePath.split(separator).join('/');
        }
        var themePath = path.join(this.absolutePath,id+".png");
        this.theme[id] = new Theme(id, 'Extended Validation Certificate Theme', "file://"+tmpPath+"/"+id+".png");
    }

    /**
     * An Object wrapper for a lightweight theme.
     * @param id a randomly chosen string that will not be shown to the user
     * @param name a name for the theme that will appear in the theme selection.
     * @param headerURL a path or URL to an image that's large enough to span the entire chrome.
     */
    function Theme(id,name,headerURL){
        var additionalInfo = 'TrustedThemes';
        this.id = id || 'sslp_standard';
        this.name = additionalInfo + ": " + (name || 'Standard Theme');

        // if headerURL is null, the LightWeightThemeManager
        // reverts to Firefox's default theme!
        this.headerURL = headerURL;
        this.author = additionalInfo;
    }

    //this.ensureCustomTheme();
    // we want to be notified in case the user changes the theme.
    themeChangedListener.register(true);

}

exports.themeSwitcher = new themeSwitcher();