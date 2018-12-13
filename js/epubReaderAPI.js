const electron = require('electron');
const fs = require('fs-jetpack');
const extract = require('extract-zip');
const resolve = require('path').resolve


//Electron no permite utilizar directamente el constructor BrowserWindow para crear múltiples ventanas
//Hay que hacerlo a través del módule remote
//Más info: https://stackoverflow.com/questions/45639628/how-to-fix-browserwindow-is-not-a-constructor-error-when-creating-child-window-i
const BrowserWindow = electron.remote.BrowserWindow;

var epubReader = (function() {

  var publicAPI = {
    unzipEpub: (source, target) => {
      let resolvedPath = resolve(target);
      if (!fs.exists(resolvedPath)) {
        extract(source, {
          dir: resolvedPath
        }, function(err) {
          console.error("Se ha producido un error al extraer el fichero: " + err);
        });
      }
    }
  }

  return publicAPI;
})();
