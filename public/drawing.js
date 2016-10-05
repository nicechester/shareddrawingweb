// Initialize Firebase
var config = {
    apiKey: "AIzaSyBRCJitAeFM67FqtIBwsZgxu3Sw9IE080Y",
    authDomain: "shareddrawing.firebaseapp.com",
    databaseURL: "https://shareddrawing.firebaseio.com/",
    storageBucket: "shareddrawing.appspot.com",
};
firebase.initializeApp(config);

var canvas = document.getElementById('canvas'),
    coord = document.getElementById('coord'),
    ctx = canvas.getContext('2d'), // get 2D context
    imgCat = new Image();

/*********** draw image *************/
imgCat.src = 'http://c.wearehugh.com/dih5/openclipart.org_media_files_johnny_automatic_1360.png';
imgCat.onload = function() { // wait for image load
    ctx.drawImage(imgCat, 0, 0); // draw imgCat on (0, 0)
};

var canvasID = getCanvasID();
//var canvasID = "1";
var lines = [];

var ref = firebase.database().ref('/' + canvasID + '/paths/');
ref.on('child_added', function(snapshot) {
	updateCanvas(snapshot.val());
});

ref.on('child_changed', function(snapshot) {
	updateCanvas(snapshot.val());
});

ref.on('child_removed', function(snapshot) {
	ctx.clearRect(0, 0, canvas.width, canvas.height);	
});

function updateCanvas(pathInfo) {
	var color = pathInfo['color'];
	switch (color) {
		case "Red":
			ctx.strokeStyle = '#FF0000';
			break;
		case "Blue":
			ctx.strokeStyle = '#0000FF';
			break;
		case "Orange":
			ctx.strokeStyle = '#FFA500';
			break;
		case "Yellow":
			ctx.strokeStyle = '#FFFF00';
			break;

	}

	var points = pathInfo['points'];
	ctx.lineWidth = 3;
	ctx.beginPath();
	for (var i in points) {
		var x = parseFloat(points[i][0]);
		var y = parseFloat(points[i][1]);
		ctx.lineTo(x, y)
	}
	ctx.stroke();
}

/*********** load canvas by query param **************/

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function getCanvasID() {
	id = getParameterByName('id');
	if (!id) id = "1";
	return id;
}

/*********** handle mouse events on canvas **************/
var mousedown = false;
ctx.strokeStyle = '#0000FF';
ctx.lineWidth = 3;
canvas.onmousedown = function(e) {
    var pos = fixPosition(e, canvas);
    mousedown = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
	lines.push([pos.x, pos.y]);
    return false;
};

canvas.onmousemove = function(e) {
    var pos = fixPosition(e, canvas);
    coord.innerHTML = '(' + pos.x + ',' + pos.y + ')';
    if (mousedown) {
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
		lines.push([pos.x, pos.y]);
    }
};

canvas.onmouseup = function(e) {
    mousedown = false;
	ref = firebase.database().ref('/' + canvasID + '/paths/');
	var pathID = ref.push().key;
	var updates = {};
  		updates[pathID + '/color/'] = "Blue";
		updates[pathID + '/user/'] = "web";
		updates[pathID + '/points/'] = lines;
	ref.update(updates);
	lines = [];
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
