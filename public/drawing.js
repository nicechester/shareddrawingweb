import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import { getDatabase, ref, push, set, onChildAdded, onChildChanged, onChildRemoved, onValue } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBogMAH-Oc7UCeQZpoylhR3EJHWogtIRcQ",
    authDomain: "shared-drawing.firebaseapp.com",
    databaseURL: "https://shared-drawing-default-rtdb.firebaseio.com",
    projectId: "shared-drawing",
    storageBucket: "shared-drawing.firebasestorage.app",
    messagingSenderId: "1006489746800",
    appId: "1:1006489746800:web:c9e0f9e2334cbf86fd63b5",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const canvasID = getCanvasID();
let currentColor = "#000000";
let currentPoints = [];
let strokeStartTime = null;
let userId = null;
let allStrokes = {};

signInAnonymously(auth).then(result => { userId = result.user.uid; });

// Color picker
document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        currentColor = this.dataset.color;
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
        this.classList.add('selected');
    });
});

// Firebase listeners
const strokesRef = ref(db, `v2/canvases/${canvasID}/strokes`);

onValue(strokesRef, snapshot => { allStrokes = snapshot.val() || {}; });
onChildAdded(strokesRef, snapshot => drawStroke(snapshot.val()));
onChildChanged(strokesRef, () => redrawAll());
onChildRemoved(strokesRef, () => redrawAll());

function redrawAll() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    Object.values(allStrokes).forEach(drawStroke);
}

function drawStroke(stroke) {
    if (!stroke?.points || stroke.points.length < 2) return;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width || 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    stroke.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();
}

// Mouse events
let mousedown = false;

canvas.onmousedown = function(e) {
    mousedown = true;
    strokeStartTime = Date.now();
    currentPoints = [];
    const pos = getPos(e);
    currentPoints.push({ x: pos.x, y: pos.y, t: 0 });
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
};

canvas.onmousemove = function(e) {
    if (!mousedown) return;
    const pos = getPos(e);
    currentPoints.push({ x: pos.x, y: pos.y, t: Date.now() - strokeStartTime });
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
};

canvas.onmouseup = function() {
    if (!mousedown) return;
    mousedown = false;
    set(push(strokesRef), {
        userId: userId || 'anonymous',
        color: currentColor,
        width: 2,
        points: currentPoints,
        isComplete: true,
        createdAt: strokeStartTime / 1000,
    });
    currentPoints = [];
};

// Utils
function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function getCanvasID() {
    const match = /[?&]id=([^&#]*)/.exec(window.location.href);
    return match ? decodeURIComponent(match[1]) : "1";
}
