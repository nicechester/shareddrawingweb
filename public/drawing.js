var canvas = document.getElementById('canvas'),
    coord = document.getElementById('coord'),
    ctx = canvas.getContext('2d'), // get 2D context
    imgCat = new Image();

/*********** draw image *************/
imgCat.src = 'http://c.wearehugh.com/dih5/openclipart.org_media_files_johnny_automatic_1360.png';
imgCat.onload = function() { // wait for image load
    ctx.drawImage(imgCat, 0, 0); // draw imgCat on (0, 0)
};

/*********** handle mouse events on canvas **************/
var mousedown = false;
ctx.strokeStyle = '#0000FF';
ctx.lineWidth = 5;
canvas.onmousedown = function(e) {
    var pos = fixPosition(e, canvas);
    mousedown = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    return false;
};

canvas.onmousemove = function(e) {
    var pos = fixPosition(e, canvas);
    coord.innerHTML = '(' + pos.x + ',' + pos.y + ')';
    if (mousedown) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }
};

canvas.onmouseup = function(e) {
    mousedown = false;
};

/********** utils ******************/
// Thanks to http://stackoverflow.com/questions/55677/how-do-i-get-the-coordinates-of-a-mouse-click-on-a-canvas-element/4430498#4430498
function fixPosition(e, gCanvasElement) {
    var x;
    var y;
    if (e.pageX || e.pageY) { 
      x = e.pageX;
      y = e.pageY;
    }
    else { 
      x = e.clientX + document.body.scrollLeft +
          document.documentElement.scrollLeft;
      y = e.clientY + document.body.scrollTop +
          document.documentElement.scrollTop;
    } 
    x -= gCanvasElement.offsetLeft;
    y -= gCanvasElement.offsetTop;
    return {x: x, y:y};
}