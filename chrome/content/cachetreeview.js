function CacheTreeView( aCacheList ) {
    this._cacheList = aCacheList;
}

CacheTreeView.prototype = {
    _treeBoxObject: null,
    selection: null,

    get rowCount() {
        return this._cacheList.length;
    },
    getRowProperties: function ( index, properties ) {},
    getCellProperties: function ( row, col, properties ) {},
    getColumnProperties: function ( col, properties ) {},
    isContainer: function ( index ) { return false; },
    isContainerOpen: function ( index ) { return false; },
    isContainerEmpty: function ( index ) { return false; },
    isSeparator: function ( index ) { return false; },
    isSorted: function () { return false; },
    canDrop: function ( targetIndex, orientation, dataTransfer ) { return false; },
    drop: function ( targetIndex, orientation, dataTransfer ) {},
    getParentIndex: function ( rowIndex ) { return -1; },
    hasNextSibling: function ( rowIndex, afterIndex ) { return false; },
    getLevel: function ( index ) { return 0; },
    getImageSrc: function ( row, col ) {},
    getProgressMode: function ( row, col ) {
        if ( col.id == "cachelist-progress" )
            return Components.interfaces.nsITreeView.PROGRESS_NORMAL;
        else
            return Components.interfaces.nsITreeView.PROGRESS_NONE;
    },
    getCellValue: function ( row, col ) {
        var cacheData = this._cacheList[row];

        if ( cacheData ) {
            if ( col.id == "cachelist-progress" )
                return cacheData._progress;
            else if ( col.id == "cachelist-save" )
                return cacheData._isSaved;
            else if ( col.id == "cachelist-done" )
                return cacheData._isDone;
            else
                return 0;
        }
    },
    getCellText: function ( row, col ) {
        var cacheData = this._cacheList[row];

        if ( cacheData ) {
            switch ( col.id ) {
                case "cachelist-url":            return cacheData._url;
                case "cachelist-content-type":   return cacheData._contentType;
                case "cachelist-content-length": return cacheData._contentLength;
                case "cachelist-size":           return cacheData._size;
                case "cachelist-path":           return cacheData._file.path;
            }
        }
    },
    setTree: function ( tree ) {
        if ( tree ) {
            this._treeBoxObject = tree;
        } else {
            this._treeBoxObject = null;
        }
    },
    toggleOpenState: function ( index ) {},
    cycleHeader: function ( col ) {},
    selectionChanged: function () {},
    cycleCell: function ( row, col ) {},
    isEditable: function ( row, col ) { return false; },
    isSelectable: function ( row, col ) {},
    setCellValue: function ( row, col, value ) {},
    setCellText: function ( row, col, value ) {},
    performAction: function ( action ) {},
    performActionOnRow: function ( action, row ) {},
    performActionOnCell: function ( action, row, col ) {}
};