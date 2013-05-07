var cacheCtrl = {
    _cacheList: null,
    _cacheTree: null,
    _cacheTreeBox: null,
    _cacheTreeView: null,
    _prefBranch: null,
    _updateTimer: null,
    _isActive: false,
    _downloadDirectory: null,
    _tempDirectory: null,

    onLoad: function() {
        this._cacheList = [];
        this._cacheTreeView = new CacheTreeView( this._cacheList );
        this._cacheTree = document.getElementById( "cachelist-tree" );
        this._cacheTree.view = this._cacheTreeView;
        this._cacheTreeBox = this._cacheTreeView._treeBoxObject;

        this._prefBranch = this._prefService.getBranch( "extensions.cachelist." );

        try {
            this._downloadDirectory = this._prefBranch.getComplexValue( "downloadDir", Ci.nsILocalFile );
        } catch ( ex ) {
            this._downloadDirectory = Cc["@mozilla.org/download-manager;1"].getService( Ci.nsIDownloadManager).userDownloadsDirectory;
        }

        try {
            this._tempDirectory = this._prefBranch.getComplexValue( "tempDir", Ci.nsILocalFile );
        } catch ( ex ) {
            this._tempDirectory = Cc["@mozilla.org/file/directory_service;1"].getService( Ci.nsIProperties ).get( "TmpD", Ci.nsIFile );
        }

        document.getElementById( "cachelist-url-filter" ).value = this._prefBranch.getCharPref( "urlFilter" );
        document.getElementById( "cachelist-content-type-filter" ).value = this._prefBranch.getCharPref( "contentTypeFilter" );

        this._prefBranch.QueryInterface( Ci.nsIPrefBranch2 );
        this._prefBranch.addObserver( "", this, false );

        this._updateTimer = Cc["@mozilla.org/timer;1"].createInstance( Ci.nsITimer );
    },

    onUnload: function() {
        // TODO: remove exception
        for ( var i = 0; i < this._cacheList.length; i ++ ) {
            this._cacheList[i].remove( true );
        }

        this._cacheList.length = 0;

        this._prefBranch.removeObserver( "", this );

        this.stop();
    },

    start: function() {
        if ( ! this._isActive ) {
            this._observerService.addObserver( this, "http-on-examine-response", false );
            this._observerService.addObserver( this, "http-on-examine-cached-response", false );
            this._updateTimer.init( this, 1000, Ci.nsITimer.TYPE_REPEATING_SLACK );
            this._isActive = true;
        }
    },

    stop: function() {
        if ( this._isActive ) {
            this._observerService.removeObserver( this, "http-on-examine-response" );
            this._observerService.removeObserver( this, "http-on-examine-cached-response" );
            this._updateTimer.cancel();
            this._isActive = false;
        }
    },

    observe: function( aSubject, aTopic, aData ) {
        switch ( aTopic ) {
        case "http-on-examine-response":
        case "http-on-examine-cached-response":
            if ( ! this._isActive )
                return;

            var channel = aSubject.QueryInterface( Ci.nsIChannel );

            var url = channel.URI.prePath + channel.URI.path;
            var urlFilter = document.getElementById( "cachelist-url-filter" ).value;

            if ( url.indexOf( urlFilter, 0 ) == -1 )
                return;

            var contentType = channel.contentType;
            var contentTypeFilter = document.getElementById( "cachelist-content-type-filter" ).value;

            if ( contentType.indexOf( contentTypeFilter, 0 ) == -1 )
                return;

            var cacheData = new CacheData();

            cacheData.init( aSubject, this._tempDirectory );

            this._cacheList.unshift( cacheData );
            this._cacheTreeBox.rowCountChanged( 0, 1 );

            break;
        case "nsPref:changed":
            var prefBranch = aSubject.QueryInterface( Ci.nsIPrefBranch );

            switch ( aData ) {
                case "downloadDir":
                    this._downloadDirectory = prefBranch.getComplexValue( "downloadDir", Ci.nsILocalFile );
                    break;
                case "tempDir":
                    this._tempDirectory = prefBranch.getComplexValue( "tempDir", Ci.nsILocalFile );
                    break;
            }

            break;
        case "timer-callback":
            if ( this._cacheList.length != 0 && this._isActive )
                this._cacheTreeBox.invalidate();

            break;
        }
    },

    QueryInterface: function( aIID ) {
        if ( aIID.equals( Ci.nsISupports ) ||
             aIID.equals( Ci.nsIObserver ) ) return this;

        throw Cr.NS_NOINTERFACE;
    },

    getCurrentCacheData: function () {
        var index = this._cacheTree.currentIndex;

        if ( index == -1 )
            return null;

        return this._cacheList[index];
    },

    onSelect: function() {
        /*
        debug.log( "onSelect" );

        if ( this._cacheList.length == 0 )
            document.getElementById( "cachelist-clear-command" ).setAttribute( "disabled", true );
        else
            document.getElementById( "cachelist-clear-command" ).removeAttribute( "disabled" );

        var index = this._cacheTree.currentIndex;

        if ( index == -1 ) {
            document.getElementById( "cachelist-save-command" ).setAttribute( "disabled", true );
            document.getElementById( "cachelist-remove-command" ).setAttribute( "disabled", true );

            return;
        }

        var cacheData = this._cacheList[index];

        if ( cacheData._progress != 100 ) {
            document.getElementById( "cachelist-save-command" ).setAttribute( "disabled", true );
            document.getElementById( "cachelist-remove-command" ).setAttribute( "disabled", true );
        } else {
            document.getElementById( "cachelist-save-command" ).removeAttribute( "disabled" );
            document.getElementById( "cachelist-remove-command" ).removeAttribute( "disabled" );
        }
        */
    },

    onSaveCommand: function() {
        var cacheData = this.getCurrentCacheData();

        if ( ! cacheData )
            return;

        var url = this._ioService.newURI( cacheData._url, null, null ).QueryInterface( Ci.nsIURL );
        var mimeInfo = this._mimeService.getFromTypeAndExtension( cacheData._contentType, "" );
        var fileExtension;
        var fileName;

        // URL‚ÌŠg’£Žq‚È‚µ MIME‚ÌŠg’£Žq‚ ‚è ¨ MIME‚ÌŠg’£Žq
        // URL‚ÌŠg’£Žq‚ ‚è MIME‚ÌŠg’£Žq‚ ‚è ¨ URL‚ÆMIME‚ÌŠg’£Žq‚ªˆê’v‚µ‚½‚à‚Ì or ˆê’v‚µ‚È‚¯‚ê‚ÎMIME‚ÌŠg’£Žq
        // URL‚ÌŠg’£Žq‚È‚µ MIME‚ÌŠg’£Žq‚È‚µ ¨ 
        // URL‚ÌŠg’£Žq‚ ‚è MIME‚ÌŠg’£Žq‚È‚µ ¨ URL‚ÌŠg’£Žq

        if ( mimeInfo.extensionExists( url.fileExtension ) )
            fileExtension = url.fileExtension;
        else {
            // –¢“o˜^‚ÌMIME-Type‚Ìê‡‚Í—áŠO‚ª”­¶‚·‚éB—áŠO‚ðƒLƒƒƒbƒ`‚µ‚ÄURL‚ÌŠg’£Žq‚ðÝ’è‚·‚éB
            try {
                fileExtension = mimeInfo.primaryExtension;
            } catch ( ex ) {
                fileExtension = url.fileExtension;
            }
        }

        if ( fileExtension == "" )
            fileName = url.fileBaseName;
        else
            fileName = url.fileBaseName + "." + fileExtension;

        var file = Cc["@mozilla.org/file/local;1"].createInstance( Ci.nsILocalFile );
        file.initWithFile( this._downloadDirectory );
        file.append( fileName );
        file.createUnique( Ci.nsIFile.NORMAL_FILE_TYPE, 0664 );

        try {
            cacheData.save( file, true );
        } catch ( ex ) {
            alert( ex.message ); // TODO
        }
    },

    onSaveAsCommand: function() {
        var cacheData = this.getCurrentCacheData();

        if ( ! cacheData )
            return;

        var fp = Cc["@mozilla.org/filepicker;1"].createInstance( Ci.nsIFilePicker );

        // TODO: properties‚©‚çƒ^ƒCƒgƒ‹‚ðÝ’è
        fp.init( window, "Select a File", Ci.nsIFilePicker.modeSave );

        // ƒtƒ@ƒCƒ‹–¼‚ðÝ’è
        var url = this._ioService.newURI( cacheData._url, null, null ).QueryInterface( Ci.nsIURL );
        var mimeInfo = this._mimeService.getFromTypeAndExtension( cacheData._contentType, "" );
        var fileExtension;
        var fileName;

        if ( mimeInfo.extensionExists( url.fileExtension ) )
            fileExtension = url.fileExtension;
        else {
            try {
                fileExtension = mimeInfo.primaryExtension;
            } catch ( ex ) {
                fileExtension = url.fileExtension;
            }
        }

        if ( fileExtension == "" )
            fileName = url.fileBaseName;
        else
            fileName = url.fileBaseName + "." + fileExtension;

        fp.defaultString = fileName;

        // Šg’£ŽqƒtƒBƒ‹ƒ^‚ðÝ’è
        var extensions = mimeInfo.getFileExtensions();
        var extensionFilters = "";

        while ( extensions.hasMore() ) {
            if ( extensionFilters == "" )
                extensionFilters = "*." + extensions.getNext();
            else
                extensionFilters = extensionFilters + "; *." + extensions.getNext();
        }

        if ( extensionFilters != "" )
            fp.appendFilter( extensionFilters, extensionFilters );

        if ( fileExtension != "" && ! mimeInfo.extensionExists( fileExtension ) ) {
            extensionFilters = "*." + fileExtension;
            fp.appendFilter( extensionFilters, extensionFilters );
        }

        fp.appendFilters( Ci.nsIFilePicker.filterAll );

        if ( fp.show() == Ci.nsIFilePicker.returnCancel )
            return;

        try {
            cacheData.save( fp.file, true );
        } catch ( ex ) {
            alert( ex.message );
        }
    },

    onClearCommand: function() {
        if ( this._cacheList.length == 0 )
            return;

        var errorOccurred = false;

        this._cacheTreeBox.beginUpdateBatch();

        for ( var i = 0; i < this._cacheList.length; i ++ ) {
            var cacheData = this._cacheList[i];

            if ( cacheData._isDone ) {
                try {
                    cacheData.remove( true );
                } catch ( ex ) {
                    errorOccurred = true;
                }

                this._cacheList.splice( i, 1 );
                this._cacheTreeBox.rowCountChanged( i, -1 );

                i --;
            }
        }

        this._cacheTreeBox.endUpdateBatch();

        if ( errorOccurred )
            alert( "Error" ); // TODO
    },

    onClearAllCommand: function() {
        if ( this._cacheList.length == 0 )
            return;

        var errorOccurred = false;

        this._cacheTreeBox.beginUpdateBatch();

        for ( var i = 0; i < this._cacheList.length; i ++ ) {
            try {
                this._cacheList[i].remove( true );
            } catch ( ex ) {
                errorOccurred = true;
            }
        }

        this._cacheTreeBox.rowCountChanged( 0, this._cacheList.length * -1 );
        this._cacheList.length = 0;

        this._cacheTreeBox.endUpdateBatch();

        if ( errorOccurred )
            alert( "Error" ); // TODO
    },

    onRemoveCommand: function() {
        var index = this._cacheTree.currentIndex;

        if ( index == -1 )
            return;

        var cacheData = this._cacheList[index];

        try {
            cacheData.remove( true );
        } catch ( ex ) {
            alert( ex.message ); // TODO
        }

        this._cacheList.splice( index, 1 );
        this._cacheTreeBox.rowCountChanged( index, -1 ); // Use negative values for removed rows.

        // Reselect item
        if ( index >= this._cacheList.length )
            this._cacheTreeView.selection.select( index - 1 );
        else
            this._cacheTreeView.selection.select( index );
    },

    onCopyUrlCommand: function () {
        var rangeCount = this._cacheTreeView.selection.getRangeCount();

        if ( rangeCount <= 0 )
            return;

        var startIndex = new Object();
        var endIndex = new Object();
        var url = "";

        for ( var rangeIndex = 0; rangeIndex < rangeCount; rangeIndex ++ ) {
            this._cacheTreeView.selection.getRangeAt( rangeIndex, startIndex, endIndex );

            for ( var i = startIndex.value; i <= endIndex.value; i ++ ) {
                url = url + this._cacheList[i]._url + "\n";
            }
        }

        this._clipboardHelper.copyString( url );
        // var cacheData = this.getCurrentCacheData();
        //  
        // if ( cacheData )
        //     this._clipboardHelper.copyString( cacheData._url );
    },

    onOpenFolderCommand: function () {
        var cacheData = this.getCurrentCacheData();

        if ( ! cacheData )
            return;

        try {
            cacheData._file.QueryInterface( Ci.nsILocalFile ).reveal();
        } catch ( ex ) {
            var parent = cacheData._file.parent.QueryInterface( Ci.nsILocalFile );

            if ( ! parent )
                return;

            try {
                parent.launch();
            } catch ( ex ) {
                this._externalProtocolService.loadUrl( this._ioService.newFileURI( parent ) );
            }
        }
    },

    onToggleCommand: function() {
        if ( this._isActive )
            this.onCloseCommand();
        else
            this.onOpenCommand();
    },

    onOpenCommand: function() {
        if ( ! this._isActive ) {
            document.getElementById( "cachelist-checked-state" ).setAttribute( "checked", true );
            document.getElementById( "cachelist-display-state" ).removeAttribute( "collapsed" );
            this.start();
        }
    },

    onCloseCommand: function() {
        if ( this._isActive ) {
            document.getElementById( "cachelist-checked-state" ).removeAttribute( "checked" );
            document.getElementById( "cachelist-display-state" ).setAttribute( "collapsed", true );
            this.stop();
        }
    },

    // popupshowing‚Å—LŒø/–³ŒøØ‚è‘Ö‚¦
    // onOpenCommand: function( event ) {
        // TODO: Open containing folder
    // },

    onMenuItemCommand: function( event ) {
        var strings = document.getElementById("cachelist-strings");
        alert( strings.getString( "helloMessage" ) );
    },

    onToolbarButtonCommand: function( event ) {
        this.onMenuItemCommand( event );
    }
};

var debug = {
    // https://developer.mozilla.org/en/NsIConsoleService
    _consoleservice: Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService),
    _Cc_scripterror: Components.classes["@mozilla.org/scripterror;1"],
    _Ci_scripterror: Components.interfaces.nsIScriptError,
    enabled: false, // set true to output
    noFirebug: false, // don't show object in Firebug
    prefix: "",  // prefix string
    createScripterror: function() this._Cc_scripterror.createInstance(this._Ci_scripterror),
    // log for Firebug with existence check
    logFirebug: function(x) this.enabled && !this.noFirebug && Firebug && Firebug.Console && Firebug.Console.log(x),
    logFirebugOnlyObject: function(x) typeof x == "object" && x != null && this.logFirebug(x),
    // log/warn/error in console
    log: function(message) {
        if (this.enabled) {
            this._consoleservice.logStringMessage(this.prefix+message);
            this.logFirebugOnlyObject(message);
        }
    },
    warn: function(message) {
        if (this.enabled) {
            var stack = Components.stack.caller;
            var error = this._Cc_scripterror.createInstance(this._Ci_scripterror);
            error.init(this.prefix+message, stack.filename, null, stack.lineNumber, null, this._Ci_scripterror.warningFlag, null);
            this._consoleservice.logMessage(error);
            this.logFirebugOnlyObject(message);
        }
    },
    error: function(message) {
        if (this.enabled) {
            var stack = Components.stack.caller;
            var error = this._Cc_scripterror.createInstance(this._Ci_scripterror);
            error.init(this.prefix+message, stack.filename, null, stack.lineNumber, null, this._Ci_scripterror.errorFlag, null);
            this._consoleservice.logMessage(error);
            this.logFirebugOnlyObject(message);
        }
    },
    // debug with exception (error objects)
    exception: function(error) {
        if (this.enabled) {
            Components.utils.reportError(error);
            this.logFirebugOnlyObject(error);
        }
    },
    stack: function(error) {
        if (this.enabled) {
            if (error instanceof Error) {
                this._consoleservice.logStringMessage(this.prefix+error.stack);
            }
            else {
                error = new Error();
                var callerstack = error.stack.replace(/^.*\n.*\n/, "");
                this._consoleservice.logStringMessage(this.prefix+callerstack);
            }
            this.logFirebugOnlyObject(error);
        }
    },
    // alert and assert
    alert: function(message) {
        if (this.enabled) {
            window.alert(this.prefix + message);
            this.logFirebugOnlyObject(message);
        }
    },
    assert: function(cond, message) {
        var failed = this.enabled && !cond;
        if (failed) {
            var message = this.prefix+message;
            var stack = Components.stack.caller;
            var error = this._Cc_scripterror.createInstance(this._Ci_scripterror);
            error.init(message, stack.filename, null, stack.lineNumber, null, this._Ci_scripterror.errorFlag, null);
            this._consoleservice.logMessage(error);
            window.alert(message);
            this.logFirebugOnlyObject(message);
        }
        return !failed;
    }
};

XPCOMUtils.defineLazyServiceGetter( cacheCtrl, "_observerService"              , "@mozilla.org/observer-service;1"                    , "nsIObserverService"         );
XPCOMUtils.defineLazyServiceGetter( cacheCtrl, "_prefService"                  , "@mozilla.org/preferences-service;1"                 , "nsIPrefService"             );
XPCOMUtils.defineLazyServiceGetter( cacheCtrl, "_mimeService"                  , "@mozilla.org/mime;1"                                , "nsIMIMEService"             );
XPCOMUtils.defineLazyServiceGetter( cacheCtrl, "_ioService"                    , "@mozilla.org/network/io-service;1"                  , "nsIIOService"               );
XPCOMUtils.defineLazyServiceGetter( cacheCtrl, "_externalProtocolService"      , "@mozilla.org/uriloader/external-protocol-service;1" , "nsIExternalProtocolService" );
XPCOMUtils.defineLazyServiceGetter( cacheCtrl, "_clipboardHelper"              , "@mozilla.org/widget/clipboardhelper;1"              , "nsIClipboardHelper"         );

debug.enabled = true;
debug.prefix = "cacheCtrl:\n\n";

window.addEventListener( "load"  , function() { cacheCtrl.onLoad();   }, false );
window.addEventListener( "unload", function() { cacheCtrl.onUnload(); }, false );
