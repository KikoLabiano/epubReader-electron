const electron = require('electron');
const fs = require('fs-jetpack');
const extract = require('extract-zip');
const resolve = require('path').resolve


//Electron no permite utilizar directamente el constructor BrowserWindow para crear múltiples ventanas
//Hay que hacerlo a través del módule remote
//Más info: https://stackoverflow.com/questions/45639628/how-to-fix-browserwindow-is-not-a-constructor-error-when-creating-child-window-i
const BrowserWindow = electron.remote.BrowserWindow;

// Dimensions of the whole book
let BOOK_WIDTH = 1280;
let BOOK_HEIGHT = 960;

// Dimensions of one page in the book
let PAGE_WIDTH = 490;
let PAGE_HEIGHT = 700;
// The canvas size equals to the book dimensions + this padding
let CANVAS_PADDING = 40;
let epubFolder;
let oebps;

var flips = [];

var epubReader = (function () {
  let chaptersDictionary = [];

  var publicAPI = {
    unzipEpub: (source, target) => {
      epubFolder = target;
      let resolvedPath = resolve(target);
      if (!fs.exists(resolvedPath)) {
        extract(source, {
          dir: resolvedPath
        }, function (err) {
          console.error("Se ha producido un error al extraer el fichero: " + err);
        });
      }
    },
    loadChapters: (title, ctrl) => {
      let chapters = fs.find('epubs', {
        matching: title + '/**/*.xhtml'
      });
      oebps = chapters[0].split("\\")[2];
      chapters.forEach((v, i) => {
        let splitted = v.split("\\");
        chaptersDictionary.push({
          "chapter": splitted[splitted.length - 1],
          "text": fs.read(v, "utf8")
        });
        ctrl.append(new Option(splitted[splitted.length - 1].split(".")[0], i));
      });
    },
    createSections: () => {

      for (let c of chaptersDictionary) {

        let temp = document.createElement('html');
        temp.innerHTML = c.text;
        let text = temp.getElementsByTagName("body")[0].innerHTML;
        let elems = $(text);
        let sect = document.createElement('section');
        let sectDiv = document.createElement('div');
        sectDiv.setAttribute("name",c.chapter.split('.')[0]);
        for (let e of elems) {
          if (e !== undefined) {
            if (e.nodeName !== "#text") {
              replaceRefs(e);
              sectDiv.innerHTML += e.outerHTML;
              sect.appendChild(sectDiv);
              if (measure(sectDiv, function (el) {
                  return el.offsetHeight
                }) >= BOOK_HEIGHT - PAGE_HEIGHT - CANVAS_PADDING) {
                sect.appendChild(sectDiv);
                document.getElementById("pages").appendChild(sect);
                sect = document.createElement('section');
                sectDiv = document.createElement('div');
                sectDiv.innerHTML += e.outerHTML;
                sect.appendChild(sectDiv);
              }
            }
          }
        }
        //Last text
        sect.appendChild(sectDiv);
        document.getElementById("pages").appendChild(sect);

      }

      function measure(el, fn) {
        let pV = el.style.visibility,
          pP = el.style.position;

        el.style.visibility = 'hidden';
        el.style.position = 'absolute';

        document.getElementById("pages").appendChild(el);
        let result = fn(el);
        el.parentNode.removeChild(el);

        el.style.visibility = pV;
        el.style.position = pP;
        return result;
      }

      function replaceRefs(el) {
        if (el.innerHTML != undefined && (el.innerHTML.indexOf("href=") > -1 || el.innerHTML.indexOf("src=") > -1)) {
          if (el.innerHTML.indexOf("href=") > -1) {
            el.innerHTML = el.innerHTML.replace('href="../', `href="${epubFolder}/${oebps}/`);
          } else {
            el.innerHTML = el.innerHTML.replace('src="../', `src="${epubFolder}/${oebps}/`);
          }
        }
      }
    },
    loadEpubCanvas: () => {

      // Vertical spacing between the top edge of the book and the papers
      let PAGE_Y = (BOOK_HEIGHT - PAGE_HEIGHT) / 2;

      let page = 0;
      let canvas = document.getElementById("pageflip-canvas");
      let context = canvas.getContext("2d");

      let mouse = {
        x: 0,
        y: 0
      };

      
      let book = document.getElementById("book");

      // List of all the page elements in the DOM
      let pages = book.getElementsByTagName("section");
      let len = pages.length;
      // Organize the depth of our pages and create the flip definitions
      for (let i = 0; i < len; i++) {
        pages[i].style.zIndex = len - i;
        pages[i].style.display = "none";

        flips.push({
          // Current progress of the flip (left -1 to right +1)
          progress: 1,
          // The target value towards which progress is always moving
          target: 1,
          // The page DOM element related to this flip
          page: pages[i],
          // True while the page is being dragged
          dragging: false
        });
      }
      //First page inline-block
      pages[0].style.display = "inline-block";

      // Resize the canvas to match the book size
      canvas.width = BOOK_WIDTH + (CANVAS_PADDING * 2);
      canvas.height = BOOK_HEIGHT + (CANVAS_PADDING * 2);

      // Offset the canvas so that it's padding is evenly spread around the book
      canvas.style.top = -CANVAS_PADDING + "px";
      canvas.style.left = -CANVAS_PADDING + "px";

      // Render the page flip 60 times a second
      setInterval(render, 1000 / 60);

      document.addEventListener("mousemove", mouseMoveHandler, false);
      document.addEventListener("mousedown", mouseDownHandler, false);
      document.addEventListener("mouseup", mouseUpHandler, false);
      document.addEventListener("keydown", keydownhandler, false);

      function keydownhandler(e) {
        //Left arrow
        if (e.keyCode == 37) {
          flips[page - 1].dragging = true;
        }
        //Right arrow
        if (e.keyCode == 39) {
          flips[page].dragging = true;
        }

        for (let i = 0; i < flips.length; i++) {
          if (flips[i].dragging) {
            if (e.keyCode == 39) {
              flips[i].target = -1;
              page = Math.min(page + 1, flips.length);
              flips[page].page.style.display = "inline-block";
              flips[page - 1].page.style.display = "none";
            } else if (e.keyCode == 37) {
              flips[i].target = 1;
              page = Math.max(page - 1, 0);
              flips[page].page.style.display = "inline-block";
              flips[page + 1].page.style.display = "none";
            }
          }
          // else{
          //   flips[i].page.style.display = "none";
          // }
          flips[i].dragging = false;
        }

      }

      function mouseMoveHandler(event) {
        // Offset mouse position so that the top of the book spine is 0,0
        mouse.x = event.clientX - book.offsetLeft - (BOOK_WIDTH / 2);
        mouse.y = event.clientY - book.offsetTop;
      }

      function mouseDownHandler(event) {
        // Make sure the mouse pointer is inside of the book
        if (Math.abs(mouse.x) < PAGE_WIDTH) {
          if (mouse.x < 0 && page - 1 >= 0) {
            // We are on the left side, drag the previous page
            flips[page - 1].dragging = true;            
          } else if (mouse.x > 0 && page + 1 < flips.length) {
            // We are on the right side, drag the current page
            flips[page].dragging = true;
            flips[page + 1].page.style.display = "none";
          }
        }

        // Prevents the text selection
        if(mouse.x>= -BOOK_WIDTH/2 && mouse.x<=BOOK_WIDTH/2 && mouse.y<=BOOK_HEIGHT-PAGE_HEIGHT-CANVAS_PADDING && mouse.y>=PAGE_HEIGHT){
          event.preventDefault();
        }
      }

      function mouseUpHandler(event) {
        for (let i = 0; i < flips.length; i++) {
          // If this flip was being dragged, animate to its destination
          if (flips[i].dragging) {
            // Figure out which page we should navigate to
            if (mouse.x < 0) {
              flips[i].target = -1;
              page = Math.min(page + 1, flips.length);
              flips[page].page.style.display = "inline-block";
              flips[page - 1].page.style.display = "none";
            } else {
              flips[i].target = 1;
              page = Math.max(page - 1, 0);
              flips[page].page.style.display = "inline-block";
              flips[page + 1].page.style.display = "none";
            }
          }
          // else{
          //   flips[i].page.style.display = "none";
          // }

          flips[i].dragging = false;
        }
      }

      function render() {

        // Reset all pixels in the canvas
        context.clearRect(0, 0, canvas.width, canvas.height);

        for (let i = 0, len = flips.length; i < len; i++) {
          let flip = flips[i];

          if (flip.dragging) {
            flip.target = Math.max(Math.min(mouse.x / PAGE_WIDTH, 1), -1);
          }

          // Ease progress towards the target value 
          flip.progress += (flip.target - flip.progress) * 0.2;

          // If the flip is being dragged or is somewhere in the middle of the book, render it
          if (flip.dragging || Math.abs(flip.progress) < 0.997) {
            drawFlip(flip);
          }

        }

      }

      function drawFlip(flip) {
        // Strength of the fold is strongest in the middle of the book
        let strength = 1 - Math.abs(flip.progress);

        // Width of the folded paper
        let foldWidth = (PAGE_WIDTH * 0.5) * (1 - flip.progress);

        // X position of the folded paper
        let foldX = PAGE_WIDTH * flip.progress + foldWidth;

        // How far the page should outdent vertically due to perspective
        let verticalOutdent = 20 * strength;

        // The maximum width of the left and right side shadows
        let paperShadowWidth = (PAGE_WIDTH * 0.5) * Math.max(Math.min(1 - flip.progress, 0.5), 0);
        let rightShadowWidth = (PAGE_WIDTH * 0.5) * Math.max(Math.min(strength, 0.5), 0);
        let leftShadowWidth = (PAGE_WIDTH * 0.5) * Math.max(Math.min(strength, 0.5), 0);


        // Change page element width to match the x position of the fold
        flip.page.style.width = Math.max(foldX, 0) + "px";

        context.save();
        context.translate(CANVAS_PADDING + (BOOK_WIDTH / 2), PAGE_Y + CANVAS_PADDING);


        // Draw a sharp shadow on the left side of the page
        context.strokeStyle = 'rgba(0,0,0,' + (0.05 * strength) + ')';
        context.lineWidth = 30 * strength;
        context.beginPath();
        context.moveTo(foldX - foldWidth, -verticalOutdent * 0.5);
        context.lineTo(foldX - foldWidth, PAGE_HEIGHT + (verticalOutdent * 0.5));
        context.stroke();


        // Right side drop shadow
        let rightShadowGradient = context.createLinearGradient(foldX, 0, foldX + rightShadowWidth, 0);
        rightShadowGradient.addColorStop(0, 'rgba(0,0,0,' + (strength * 0.2) + ')');
        rightShadowGradient.addColorStop(0.8, 'rgba(0,0,0,0.0)');

        context.fillStyle = rightShadowGradient;
        context.beginPath();
        context.moveTo(foldX, 0);
        context.lineTo(foldX + rightShadowWidth, 0);
        context.lineTo(foldX + rightShadowWidth, PAGE_HEIGHT);
        context.lineTo(foldX, PAGE_HEIGHT);
        context.fill();


        // Left side drop shadow
        let leftShadowGradient = context.createLinearGradient(foldX - foldWidth - leftShadowWidth, 0, foldX - foldWidth, 0);
        leftShadowGradient.addColorStop(0, 'rgba(0,0,0,0.0)');
        leftShadowGradient.addColorStop(1, 'rgba(0,0,0,' + (strength * 0.15) + ')');

        context.fillStyle = leftShadowGradient;
        context.beginPath();
        context.moveTo(foldX - foldWidth - leftShadowWidth, 0);
        context.lineTo(foldX - foldWidth, 0);
        context.lineTo(foldX - foldWidth, PAGE_HEIGHT);
        context.lineTo(foldX - foldWidth - leftShadowWidth, PAGE_HEIGHT);
        context.fill();


        // Gradient applied to the folded paper (highlights & shadows)
        let foldGradient = context.createLinearGradient(foldX - paperShadowWidth, 0, foldX, 0);
        foldGradient.addColorStop(0.35, '#fafafa');
        foldGradient.addColorStop(0.73, '#eeeeee');
        foldGradient.addColorStop(0.9, '#fafafa');
        foldGradient.addColorStop(1.0, '#e2e2e2');

        context.fillStyle = foldGradient;
        context.strokeStyle = 'rgba(0,0,0,0.06)';
        context.lineWidth = 0.5;

        // Draw the folded piece of paper
        context.beginPath();
        context.moveTo(foldX, 0);
        context.lineTo(foldX, PAGE_HEIGHT);
        context.quadraticCurveTo(foldX, PAGE_HEIGHT + (verticalOutdent * 2), foldX - foldWidth, PAGE_HEIGHT + verticalOutdent);
        context.lineTo(foldX - foldWidth, -verticalOutdent);
        context.quadraticCurveTo(foldX, -verticalOutdent * 2, foldX, 0);

        context.fill();
        context.stroke();
        context.restore();
      }

    },
    changeChapter:(chapter)=>{
      for (let i = 0; i < flips.length; i++) {
        if (flips[i].page.firstChild.outerHTML.indexOf("name=\"" + chapter + "\"")>-1) {
          flips[i].page.style.display="inline-block";
        }
        else{
          flips[i].page.style.display="none";
        }
      }
    }
  }

  return publicAPI;
})();