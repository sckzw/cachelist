function init() {
    var fileField;
    var file;

    fileField = document.getElementById( "downloadDirFilefield" );
    file = document.getElementById( "extensions.cachelist.downloadDir" ).value;

    if ( file ) {
        fileField.file  = file;
        fileField.label = file.path;
    }

    fileField = document.getElementById( "tempDirFilefield" );
    file = document.getElementById( "extensions.cachelist.tempDir" ).value;

    if ( file ) {
        fileField.file  = file;
        fileField.label = file.path;
    }
}

function browseDownloadDir() {
    var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance( Components.interfaces.nsIFilePicker );

    filePicker.init( window, "", filePicker.modeGetFolder );

    var file = document.getElementById( "extensions.cachelist.downloadDir" ).value;

    if ( file )
        filePicker.displayDirectory = file;

    if ( filePicker.show() != filePicker.returnOK )
        return;

    document.getElementById( "extensions.cachelist.downloadDir" ).value = filePicker.file;

    var fileField = document.getElementById( "downloadDirFilefield" );

    fileField.file  = filePicker.file;
    fileField.label = filePicker.file.path;
}

function browseTempDir() {
    var filePicker = Components.classes["@mozilla.org/filepicker;1"].createInstance( Components.interfaces.nsIFilePicker );

    filePicker.init( window, "", filePicker.modeGetFolder );

    var file = document.getElementById( "extensions.cachelist.tempDir" ).value;

    if ( file )
        filePicker.displayDirectory = file;

    if ( filePicker.show() != filePicker.returnOK )
        return;

    document.getElementById( "extensions.cachelist.tempDir" ).value = filePicker.file;

    var fileField = document.getElementById( "tempDirFilefield" );

    fileField.file  = filePicker.file;
    fileField.label = filePicker.file.path;
}
