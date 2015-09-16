function CacheData() {
}

CacheData.prototype = {
    _file: null,
    _fileOutputStream: null,
    _originalStreamListener: null,
    _url: null,
    _id: null,
    _index: null,
    _range: null,
    _contentType: null,
    _contentLength: null,
    _size: 0,
    _isCached: false,
    _isSaved: false,
    _savedFile: null,
	_isClosed: true,

    get _progress() {
        if ( this._contentLength > 0 ) {
            return 100 * this._size / this._contentLength;
        }
        else {
            if ( this._isCached )
                return 100;
            else
                return 0;
        }
    },

    init: function ( aRequest, aFile ) {
        var channel = aRequest.QueryInterface( Ci.nsIChannel );

        this._url = channel.URI.prePath + channel.URI.path;
        this._contentType = channel.contentType;
        this._contentLength = channel.contentLength;

        this._file = Cc["@mozilla.org/file/local;1"].createInstance( Ci.nsILocalFile );
        this._file.initWithFile( aFile );
        this._file.append( "cachedata.tmp" );
        this._file.createUnique( Ci.nsIFile.NORMAL_FILE_TYPE, 0664 );

        this._fileOutputStream = Cc["@mozilla.org/network/file-output-stream;1"].createInstance( Ci.nsIFileOutputStream );
        this._fileOutputStream.init( this._file, -1, -1, 0 );
        this._isClosed = false;

        // Set StreamListener and save original StreamListener
        this._originalStreamListener = aRequest.QueryInterface( Ci.nsITraceableChannel ).setNewListener( this );
    },

	close: function () {
        if ( ! this._isClosed ) {
            this._fileOutputStream.close();
            this._isClosed = true;
        }
	},

	resume: function () {
		if ( this._isClosed ) {
	        this._fileOutputStream.init( this._file, 0x12, -1, 0 ); // PR_WRONLY | PR_APPEND
	        this._isClosed = false;
	    }
	},

    save: function ( aFile, aForced ) {
        this._file.copyTo( aFile.parent, aFile.leafName );
        this._savedFile = aFile;
        this._isSaved = true;
    },

    remove: function ( aForced ) {
        if ( ! this._isClosed ) {
            this._fileOutputStream.close();
            this._isClosed = true;
        }

		this._file.remove( false );
    },

    // nsIStreamListener
    onStartRequest: function ( aRequest, aContext ) {
        if ( this._originalStreamListener.onStartRequest )
            this._originalStreamListener.onStartRequest( aRequest, aContext );
    },

    onStopRequest: function ( aRequest, aContext, aStatusCode ) {
        this._isCached = true;

        if ( this._originalStreamListener.onStopRequest )
            this._originalStreamListener.onStopRequest( aRequest, aContext, aStatusCode );
    },

    onDataAvailable: function ( aRequest, aContext, aInputStream, aOffset, aCount ) {
        if ( this._isClosed ) {
            if ( this._originalStreamListener.onDataAvailable )
                this._originalStreamListener.onDataAvailable( aRequest, aContext, aInputStream, aOffset, aCount );
        }
        else {
            var binaryInputStream = Cc["@mozilla.org/binaryinputstream;1"].createInstance( Ci.nsIBinaryInputStream );
            var binaryOutputStream = Cc["@mozilla.org/binaryoutputstream;1"].createInstance( Ci.nsIBinaryOutputStream );
            var storageStream = Cc["@mozilla.org/storagestream;1"].createInstance( Ci.nsIStorageStream );

            storageStream.init( 8192, aCount, null );
            binaryOutputStream.setOutputStream( storageStream.getOutputStream( 0 ) );

            binaryInputStream.setInputStream( aInputStream );
            var data = binaryInputStream.readBytes( aCount );

            binaryOutputStream.writeBytes( data, aCount );

            if ( this._file.isWritable() )
                this._size = this._size + this._fileOutputStream.write( data, aCount );

            if ( this._originalStreamListener.onDataAvailable )
                this._originalStreamListener.onDataAvailable( aRequest, aContext, storageStream.newInputStream( 0 ), aOffset, aCount );
        }
    },

    // nsIInterfaceRequestor
    getInterface: function ( aIID ) {
        try {
            return this.QueryInterface( aIID );
        } catch ( e ) {
            throw Cr.NS_NOINTERFACE;
        }
    },

    QueryInterface: function ( aIID ) {
        if ( aIID.equals( Ci.nsISupports           ) ||
             aIID.equals( Ci.nsIInterfaceRequestor ) ||
             aIID.equals( Ci.nsIStreamListener     ) ) return this;

        throw Cr.NS_NOINTERFACE;
    }
};
