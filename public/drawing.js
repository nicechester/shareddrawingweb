var firebaseConfig = {
    apiKey: "AIzaSyBogMAH-Oc7UCeQZpoylhR3EJHWogtIRcQ",
    authDomain: "shared-drawing.firebaseapp.com",
    databaseURL: "https://shared-drawing-default-rtdb.firebaseio.com",
    projectId: "shared-drawing",
    storageBucket: "shared-drawing.firebasestorage.app",
    messagingSenderId: "1006489746800",
    appId: "1:1006489746800:web:c9e0f9e2334cbf86fd63b5",
};
firebase.initializeApp(firebaseConfig);

var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');

canvas.width = window.screen.width * window.devicePixelRatio;
canvas.height = window.screen.height * window.devicePixelRatio;
canvas.style.width = window.screen.width + 'px';
canvas.style.height = window.screen.height + 'px';


var canvasID = getCanvasID();
var currentColor = "#000000";
var currentPoints = [];
var strokeStartTime = null;
var userId = null;
var allStrokes = {};

var imageWidth = null;
var imageHeight = null;
var fitScale = 1;
var userZoom = 1;
var ZOOM_INCREMENT = 1.2;
var ZOOM_DECREMENT = 1 / ZOOM_INCREMENT;

function loadZoomLevel() {
    var stored = sessionStorage.getItem('zoomLevel_' + canvasID);
    if (stored) {
        userZoom = parseFloat(stored);
    }
}

function saveZoomLevel() {
    sessionStorage.setItem('zoomLevel_' + canvasID, userZoom);
}

firebase.auth().signInAnonymously().then(function(result) {
    userId = result.user.uid;
});

loadZoomLevel();

document.querySelectorAll('.color-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        currentColor = this.dataset.color;
        document.querySelectorAll('.color-btn').forEach(function(b) { b.classList.remove('selected'); });
        this.classList.add('selected');
    });
});

var zoomInBtn = document.getElementById('zoom-in');
var zoomOutBtn = document.getElementById('zoom-out');
var zoomResetBtn = document.getElementById('zoom-reset');

if (zoomInBtn) {
    zoomInBtn.addEventListener('click', function() {
        userZoom *= ZOOM_INCREMENT;
        saveZoomLevel();
        redrawAll();
    });
}

if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', function() {
        userZoom *= ZOOM_DECREMENT;
        saveZoomLevel();
        redrawAll();
    });
}

if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', function() {
        userZoom = 1;
        saveZoomLevel();
        redrawAll();
    });
}

var strokesRef = firebase.database().ref('v2/canvases/' + canvasID + '/strokes');
var metaRef = firebase.database().ref('v2/canvases/' + canvasID + '/meta');
var textObjectsRef = firebase.database().ref('v2/canvases/' + canvasID + '/textObjects');
var bgImage = null;
var allTextObjects = {};

metaRef.on('value', function(snapshot) {
    var meta = snapshot.val();
    imageWidth = meta && meta.imageWidth;
    imageHeight = meta && meta.imageHeight;
    updateFitScale();
    var url = meta && meta.backgroundImageUrl;
    if (!url) { bgImage = null; redrawAll(); return; }
    var img = new Image();
    img.onload = function() { bgImage = img; redrawAll(); };
    img.onerror = function() { bgImage = null; };
    img.src = url;
});

strokesRef.on('value', function(snapshot) {
    allStrokes = snapshot.val() || {};
    redrawAll();
});

textObjectsRef.on('value', function(snapshot) {
    allTextObjects = snapshot.val() || {};
    redrawAll();
});

function updateFitScale() {
    if (imageWidth && imageHeight) {
        var canvasScreenWidth = canvas.width / window.devicePixelRatio;
        fitScale = canvasScreenWidth / imageWidth;
    } else {
        fitScale = 1;
    }
}

function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    var effectiveScale = fitScale * userZoom;
    ctx.scale(effectiveScale, effectiveScale);
    if (bgImage && imageWidth && imageHeight) {
        ctx.drawImage(bgImage, 0, 0, imageWidth, imageHeight);
    } else if (bgImage) {
        ctx.drawImage(bgImage, 0, 0, canvas.width / window.devicePixelRatio / fitScale, canvas.height / window.devicePixelRatio / fitScale);
    }
    Object.values(allStrokes).forEach(drawStroke);
    if (currentPoints.length > 1) {
        drawStroke({ color: currentColor, style: 'default', points: currentPoints });
    }
    ctx.restore();

    Object.values(allTextObjects).forEach(drawTextObject);
}

var PEN_STYLES = {
    default: { width: 2, opacity: 1.0, blendMode: 'source-over' },
    marker: { width: 8, opacity: 0.4, blendMode: 'lighten' },
    calligraphy: { minWidth: 1, maxWidth: 6, opacity: 1.0, blendMode: 'source-over' },
    fountainPen: { width: 3, opacity: 0.7, blendMode: 'source-over' }
};

function drawStroke(stroke) {
    if (!stroke || !stroke.points || stroke.points.length < 2) return;

    var style = PEN_STYLES[stroke.style] || PEN_STYLES.default;
    var isCalligraphy = stroke.style === 'calligraphy';

    ctx.save();
    ctx.strokeStyle = stroke.color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = style.opacity;
    ctx.globalCompositeOperation = style.blendMode;

    if (isCalligraphy) {
        drawCalligraphyStroke(stroke, style);
    } else {
        ctx.lineWidth = style.width;
        ctx.beginPath();
        stroke.points.forEach(function(p, i) {
            i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
    }

    ctx.restore();
}

function drawCalligraphyStroke(stroke, style) {
    var points = stroke.points;
    for (var i = 0; i < points.length - 1; i++) {
        var p1 = points[i];
        var p2 = points[i + 1];
        var dx = p2.x - p1.x;
        var dy = p2.y - p1.y;
        var angle = Math.atan2(dy, dx);
        var width = style.minWidth + (style.maxWidth - style.minWidth) * (0.5 + 0.5 * Math.cos(angle * 2));

        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
    }
}

function drawTextObject(textObj) {
    if (!textObj || !textObj.text) return;

    var effectiveScale = fitScale * userZoom;
    var screenX = textObj.x * effectiveScale;
    var screenY = textObj.y * effectiveScale;

    ctx.save();
    ctx.fillStyle = textObj.color || '#000000';
    var fontSize = (textObj.fontSize || 24) * 2;
    ctx.font = fontSize + 'px system-ui';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.globalAlpha = 1.0;
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillText(textObj.text, screenX, screenY);
    ctx.restore();
}

var mousedown = false;

canvas.onmousedown = function(e) {
    mousedown = true;
    strokeStartTime = Date.now();
    currentPoints = [];
    var pos = getPos(e);
    currentPoints.push({ x: pos.x, y: pos.y, t: 0 });
    redrawAll();
};

canvas.onmousemove = function(e) {
    if (!mousedown) return;
    var pos = getPos(e);
    currentPoints.push({ x: pos.x, y: pos.y, t: Date.now() - strokeStartTime });
    redrawAll();
};

canvas.ontouchstart = function(e) { e.preventDefault(); canvas.onmousedown(e.touches[0]); };
canvas.ontouchmove = function(e) { e.preventDefault(); canvas.onmousemove(e.touches[0]); };
canvas.ontouchend = function() { canvas.onmouseup(); };

canvas.onmouseup = function() {
    if (!mousedown) return;
    mousedown = false;
    var newRef = strokesRef.push();
    newRef.set({
        userId: userId || 'anonymous',
        color: currentColor,
        width: 2,
        points: currentPoints,
        isComplete: true,
        createdAt: strokeStartTime / 1000,
    });
    currentPoints = [];
};

function getPos(e) {
    var rect = canvas.getBoundingClientRect();
    var screenX = e.clientX - rect.left;
    var screenY = e.clientY - rect.top;
    var effectiveScale = fitScale * userZoom;
    return { x: (screenX * window.devicePixelRatio) / effectiveScale, y: (screenY * window.devicePixelRatio) / effectiveScale };
}

function getCanvasID() {
    var match = /[?&]id=([^&#]*)/.exec(window.location.href);
    return match ? decodeURIComponent(match[1]) : "1";
}
