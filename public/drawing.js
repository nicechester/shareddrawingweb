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

var canvasID = getCanvasID();
var currentColor = "#000000";
var currentPoints = [];
var strokeStartTime = null;
var userId = null;
var allStrokes = {};

firebase.auth().signInAnonymously().then(function(result) {
    userId = result.user.uid;
});

document.querySelectorAll('.color-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
        currentColor = this.dataset.color;
        document.querySelectorAll('.color-btn').forEach(function(b) { b.classList.remove('selected'); });
        this.classList.add('selected');
    });
});

var strokesRef = firebase.database().ref('v2/canvases/' + canvasID + '/strokes');
var metaRef = firebase.database().ref('v2/canvases/' + canvasID + '/meta');
var bgImage = null;

metaRef.on('value', function(snapshot) {
    var meta = snapshot.val();
    var url = meta && meta.backgroundImageUrl;
    if (!url) { bgImage = null; return; }
    var img = new Image();
    img.onload = function() { bgImage = img; redrawAll(); };
    img.onerror = function() { bgImage = null; };
    img.src = url;
});

strokesRef.on('value', function(snapshot) { allStrokes = snapshot.val() || {}; });
strokesRef.on('child_added', function(snapshot) { drawStroke(snapshot.val()); });
strokesRef.on('child_changed', function() { redrawAll(); });
strokesRef.on('child_removed', function() { redrawAll(); });

function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (bgImage) ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
    Object.values(allStrokes).forEach(drawStroke);
}

function drawStroke(stroke) {
    if (!stroke || !stroke.points || stroke.points.length < 2) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    stroke.points.forEach(function(p, i) {
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
}

var mousedown = false;

canvas.onmousedown = function(e) {
    mousedown = true;
    strokeStartTime = Date.now();
    currentPoints = [];
    var pos = getPos(e);
    currentPoints.push({ x: pos.x, y: pos.y, t: 0 });
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
};

canvas.onmousemove = function(e) {
    if (!mousedown) return;
    var pos = getPos(e);
    currentPoints.push({ x: pos.x, y: pos.y, t: Date.now() - strokeStartTime });
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
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
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getCanvasID() {
    var match = /[?&]id=([^&#]*)/.exec(window.location.href);
    return match ? decodeURIComponent(match[1]) : "1";
}
