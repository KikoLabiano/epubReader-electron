const $ = require('jquery');
const JSZipUtils = require('jszip-utils');
const JSZip = require('jszip');

$(function () {
    // JSZipUtils.getBinaryContent('./epubs/Hobbit.epub', function (err, data) {
    //     if (err) {
    //         throw err; // or handle err
    //     }
    // }

    //Extract epub
    epubReader.unzipEpub('./epubs/Hobbit.epub','./epubs/Hobbit');
    //Load chapters
    epubReader.loadChapters('Hobbit',$("#ddlChapters"));
    //Evento onchange select
    //Create sections
    epubReader.createSections();
    //Load Canvas
    epubReader.loadEpubCanvas();

    document.getElementById("ddlChapters").addEventListener("click",function(){
        console.log(this.options[this.selectedIndex].text);
        epubReader.changeChapter(this.options[this.selectedIndex].text);
    })

//read contents of zip file
/*var zip2 = new JSZip();
zip2.loadAsync(data)
            .then(function (z) {
$.each(z.files, function (index, zipEntry) {
    var filename = "C:\/Epubs";
    //create directory else create file
    var path = getPath(filename);
    if (filename.match(/\/$/)) {
        //plugin is the embeded npapi-file-io plugin
        plugin.createDirectory(path);
    } else {
        //problem is here
        plugin.saveBinaryFile(path, zipEntry.asUint8Array());
        //this is faster and works with the txt files but not images ect.
        //plugin.saveTextFile(path, zipEntry.data);
    }});
});*/


        /*var zip = new JSZip();
        zip.loadAsync(data)
            .then(function (zip) {
                let textos = [];

                // let filteredNcx = filtered_keys(zip.files, /.ncx/);
                // console.log(filteredNcx);
                // filteredNcx.forEach((idx)=>{
                //     zip.files[idx].async("string").then((v)=>{
                //         $("#content").html(v);
                //     })
                // });


                let filteredNames = filtered_keys(zip.files, /.xhtml/);
                console.log(filteredNames);
                filteredNames.forEach((k) => {
                    let splitted = k.split("/");
                    zip.files[k].async("string").then((v) => {
                        textos.push({
                            "nombre": splitted[splitted.length - 1],
                            "texto": v
                        });
                        $("#content").html(textos[4].texto);
                    })
                });
                textos.sort((a, b) =>
                    (a.nombre.toLowerCase() > b.nombre.toLowerCase()) ? 1 : ((b.nombre.toLowerCase() > a.nombre.toLowerCase()) ? -1 : 0)
                );
                console.log(textos);

            });
    }, function (e) {
        alert(e.message);
    });
*/
});

let filtered_keys = (obj, filter) => {
    let key, keys = []
    for (key in obj)
        if (obj.hasOwnProperty(key) && filter.test(key))
            keys.push(key)
    return keys
}
