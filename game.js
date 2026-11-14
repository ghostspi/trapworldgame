
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const deathValue = document.getElementById("deathValue");
const checkpointValue = document.getElementById("checkpointValue");
const progressText = document.getElementById("progressText");
const progressBar = document.getElementById("progressBar");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("startBtn");
const toast = document.getElementById("toast");
const soundBtn = document.getElementById("soundBtn");

const overlayTitle = document.getElementById("overlayTitle");
const overlayCopy = document.getElementById("overlayCopy");
const overlayEyebrow = document.getElementById("overlayEyebrow");

const W = 480;
const H = 270;
const WORLD_WIDTH = 1300;

canvas.width = W;
canvas.height = H;

let deaths = 0;
let checkpoint = 0;
let cameraX = 0;
let worldTime = 0;
let gameStarted = false;
let gameWon = false;
let soundOn = true;
let toastTimer = 0;

const keys = {
    left: false,
    right: false,
    jump: false
};

const player = {
    x: 35,
    y: 195,
    w: 10,
    h: 15,
    vx: 0,
    vy: 0,
    speed: 2.1,
    jumpPower: -5.8,
    grounded: false,
    jumps: 0,
    facing: 1,
    dead: false
};

const spawn = {
    x: 35,
    y: 195
};

const platforms = [
    { x: 0, y: 230, w: 150, h: 40 },
    { x: 150, y: 230, w: 105, h: 40 },
    { x: 310, y: 205, w: 90, h: 65 },
    { x: 430, y: 230, w: 125, h: 40 },
    { x: 555, y: 230, w: 120, h: 40 },
    { x: 700, y: 205, w: 100, h: 65 },
    { x: 835, y: 230, w: 115, h: 40 },
    { x: 1010, y: 210, w: 100, h: 60 },
    { x: 1160, y: 230, w: 140, h: 40 }
];

const traps = [
    { type: "hiddenSpikes", x: 165, y: 220, w: 38, h: 10, active: false, triggered: false },
    { type: "crusher", x: 340, y: 45, w: 25, h: 35, baseY: 45, active: false, triggered: false, t: 0 },
    { type: "fakeFloor", x: 770, y: 230, w: 42, h: 8, active: true, triggered: false, t: 0 },
    { type: "fallingCeiling", x: 875, y: 55, w: 50, h: 14, active: false, triggered: false, t: 0, y: 55 },
    { type: "lava", x: 960, y: 245, w: 45, h: 25, active: false, triggered: false }
];

const particles = [];

function sound(frequency = 220, duration = 0.08) {
    if (!soundOn) return;

    try {
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();

        oscillator.frequency.value = frequency;
        oscillator.type = "square";
        gain.gain.value = 0.035;

        oscillator.connect(gain);
        gain.connect(audio.destination);

        oscillator.start();
        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audio.currentTime + duration
        );

        oscillator.stop(audio.currentTime + duration);
    } catch (error) {}
}

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");
    toastTimer = 100;
}

function updateHUD() {
    if (deathValue) deathValue.textContent = deaths;
    if (checkpointValue) checkpointValue.textContent = checkpoint;

    const progress = Math.min(
        100,
        Math.max(0, Math.floor((player.x / WORLD_WIDTH) * 100))
    );

    if (progressText) progressText.textContent = progress + "%";
    if (progressBar) progressBar.style.width = progress + "%";
}

function resetTraps() {
    traps.forEach(t => {
        t.triggered = false;
        t.t = 0;
        t.active = t.type === "fakeFloor";

        if (t.type === "fallingCeiling") {
            t.y = 55;
        }
    });
}

function resetPlayer() {
    player.x = spawn.x;
    player.y = spawn.y;
    player.vx = 0;
    player.vy = 0;
    player.grounded = false;
    player.jumps = 0;
    player.dead = false;
}

function die() {
    if (player.dead || gameWon) return;

    player.dead = true;
    deaths++;
    sound(90, 0.2);

    for (let i = 0; i < 12; i++) {
        particles.push({
            x: player.x + player.w / 2,
            y: player.y + player.h / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            color: "#ff4e58"
        });
    }

    updateHUD();

    setTimeout(() => {
        resetPlayer();
        resetTraps();
    }, 350);
}

function completeLevel() {
    if (gameWon) return;

    gameWon = true;

    if (overlay) {
        overlay.classList.remove("hidden");
    }

    if (overlayEyebrow) overlayEyebrow.textContent = "YOU SURVIVED";
    if (overlayTitle) overlayTitle.textContent = "LEVEL COMPLETE!";
    if (overlayCopy) {
        overlayCopy.textContent =
            `You defeated the traps with ${deaths} deaths. Impressive!`;
    }

    if (startBtn) startBtn.textContent = "PLAY AGAIN";

    sound(700, 0.3);
}

function jump() {
    if (!gameStarted || player.dead || gameWon) return;

    if (player.jumps < 2) {
        player.vy = player.jumpPower;
        player.grounded = false;
        player.jumps++;

        sound(400 + player.jumps * 100, 0.07);
    }
}

function rectCollision(a, b) {
    return (
        a.x < b.x + b.w &&
        a.x + a.w > b.x &&
        a.y < b.y + b.h &&
        a.y + a.h > b.y
    );
}

function updateTraps() {
    traps.forEach(t => {
        if (t.type === "hiddenSpikes") {
            if (!t.triggered && player.x > t.x - 25) {
                t.triggered = true;
                t.active = true;
                showToast("SURPRISE!");
            }
        }

        if (t.type === "crusher") {
            if (!t.triggered && player.x > t.x - 65) {
                t.triggered = true;
                t.active = true;
                showToast("LOOK UP!");
            }

            if (t.active) {
                t.t += 1;
                t.y = t.baseY + Math.min(130, t.t * 5);

                if (t.y > 165) {
                    t.active = false;
                }
            }
        }

        if (t.type === "fakeFloor") {
            if (!t.triggered && player.x > t.x - 15) {
                t.triggered = true;
                t.t = 1;
                showToast("THE FLOOR IS FAKE!");
            }

            if (t.triggered && t.t > 0) {
                t.t++;
                if (t.t > 18) {
                    t.active = false;
                }
            }
        }

        if (t.type === "fallingCeiling") {
            if (!t.triggered && player.x > t.x - 65) {
                t.triggered = true;
                showToast("RUN!");
            }

            if (t.triggered && t.y < 205) {
                t.y += 5;
            }
        }

        if (t.type === "lava") {
            if (player.x > t.x - 35) {
                t.active = true;
            }
        }
    });
}

function update() {
    if (!gameStarted || gameWon) return;

    worldTime++;

    if (player.dead) return;

    player.vx = 0;

    if (keys.left) {
        player.vx = -player.speed;
        player.facing = -1;
    }

    if (keys.right) {
        player.vx = player.speed;
        player.facing = 1;
    }

    player.x += player.vx;
    player.x = Math.max(0, Math.min(WORLD_WIDTH - player.w, player.x));

    player.vy += 0.28;
    player.vy = Math.min(player.vy, 7);

    const previousBottom = player.y + player.h;
    player.y += player.vy;
    player.grounded = false;

    platforms.forEach(p => {
        const fakeTrap = traps.find(t =>
            t.type === "fakeFloor" &&
            player.x + player.w > t.x &&
            player.x < t.x + t.w &&
            !t.active
        );

        const fakePlatform = fakeTrap &&
            player.x + player.w > fakeTrap.x &&
            player.x < fakeTrap.x + fakeTrap.w &&
            p.x <= fakeTrap.x &&
            p.x + p.w >= fakeTrap.x + fakeTrap.w;

        if (
            fakePlatform &&
            previousBottom <= p.y + 4 &&
            player.y + player.h >= p.y
        ) {
            return;
        }

        if (
            player.x + player.w > p.x &&
            player.x < p.x + p.w &&
            previousBottom <= p.y &&
            player.y + player.h >= p.y &&
            player.vy >= 0
        ) {
            player.y = p.y - player.h;
            player.vy = 0;
            player.grounded = true;
            player.jumps = 0;
        }
    });

    updateTraps();

    traps.forEach(t => {
        if (t.type === "hiddenSpikes" && t.active) {
            if (rectCollision(player, t)) die();
        }

        if (t.type === "crusher" && t.active) {
            if (rectCollision(player, {
                x: t.x,
                y: t.y,
                w: t.w,
                h: 35
            })) die();
        }

        if (t.type === "fallingCeiling" && t.triggered) {
            if (rectCollision(player, {
                x: t.x,
                y: t.y,
                w: t.w,
                h: 14
            })) die();
        }

        if (t.type === "lava" && t.active) {
            if (rectCollision(player, t)) die();
        }
    });

    if (player.y > H + 20) die();

    if (player.x > 600 && checkpoint === 0) {
        checkpoint = 1;
        spawn.x = 620;
        spawn.y = 190;
        showToast("CHECKPOINT ACTIVATED!");
        sound(650, 0.15);
        updateHUD();
    }

    if (player.x > 1240) {
        completeLevel();
    }

    cameraX = Math.max(
        0,
        Math.min(WORLD_WIDTH - W, player.x - 150)
    );

    particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
    });

    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].life <= 0) particles.splice(i, 1);
    }

    if (toastTimer > 0) {
        toastTimer--;
        if (toastTimer === 0 && toast) {
            toast.classList.remove("show");
        }
    }
}

function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, 0, H);
    gradient.addColorStop(0, "#10172d");
    gradient.addColorStop(1, "#25304a");

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, W, H);

    // Moon
    ctx.fillStyle = "#f5edbb";
    ctx.beginPath();
    ctx.arc(390 - cameraX * 0.08, 48, 17, 0, Math.PI * 2);
    ctx.fill();

    // Stars
    for (let i = 0; i < 55; i++) {
        const x = (i * 83 - cameraX * 0.15) % W;
        const y = (i * 37) % 140;

        ctx.fillStyle = i % 3 === 0 ? "#ffeaa0" : "#aebbd6";
        ctx.fillRect((x + W) % W, y, 2, 2);
    }

    // Mountains
    ctx.fillStyle = "#1a243a";
    for (let i = 0; i < 8; i++) {
        const x = i * 100 - (cameraX * 0.3 % 100);

        ctx.beginPath();
        ctx.moveTo(x - 50, 220);
        ctx.lineTo(x + 30, 95 + (i % 3) * 20);
        ctx.lineTo(x + 120, 220);
        ctx.fill();
    }

    // Distant city
    ctx.fillStyle = "#131d31";
    for (let i = 0; i < 15; i++) {
        const x = (i * 50 - cameraX * 0.5) % W;
        const h = 25 + (i % 4) * 12;

        ctx.fillRect((x + W) % W, 220 - h, 30, h);

        ctx.fillStyle = "#e9bd63";
        ctx.fillRect((x + W) % W + 7, 220 - h + 8, 3, 3);
        ctx.fillStyle = "#131d31";
    }
}

function drawPlatforms() {
    platforms.forEach(p => {
        const x = p.x - cameraX;

        ctx.fillStyle = "#2d8d54";
        ctx.fillRect(x, p.y, p.w, p.h);

        ctx.fillStyle = "#62e58b";
        ctx.fillRect(x, p.y, p.w, 4);

        ctx.fillStyle = "#195b42";
        for (let i = 0; i < p.w; i += 12) {
            ctx.fillRect(x + i, p.y + 10, 5, 3);
        }

        ctx.fillStyle = "#173d38";
        ctx.fillRect(x, p.y + p.h - 5, p.w, 5);
    });
}

function drawTraps() {
    traps.forEach(t => {
        const x = t.x - cameraX;

        if (t.type === "hiddenSpikes" && t.active) {
            ctx.fillStyle = "#ff5264";

            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(x + i * 10, t.y + t.h);
                ctx.lineTo(x + i * 10 + 5, t.y);
                ctx.lineTo(x + i * 10 + 10, t.y + t.h);
                ctx.fill();
            }
        }

        if (t.type === "crusher" && t.active) {
            ctx.fillStyle = "#7d879e";
            ctx.fillRect(x, t.y, t.w, 35);

            ctx.fillStyle = "#c6d0e4";
            ctx.fillRect(x + 4, t.y + 4, t.w - 8, 5);

            ctx.fillStyle = "#3b465b";
            ctx.fillRect(x + 3, t.y + 28, t.w - 6, 7);
        }

        if (t.type === "fakeFloor" && t.active) {
            ctx.fillStyle = "#62e58b";
            ctx.fillRect(x, t.y, t.w, t.h);
        }

        if (t.type === "fallingCeiling" && t.triggered) {
            ctx.fillStyle = "#a6a9b5";
            ctx.fillRect(x, t.y, t.w, 14);

            ctx.fillStyle = "#626c82";
            ctx.fillRect(x, t.y + 10, t.w, 4);
        }

        if (t.type === "lava" && t.active) {
            ctx.fillStyle = "#ff542e";
            ctx.fillRect(x, t.y, t.w, t.h);

            ctx.fillStyle = "#ffb52e";
            ctx.fillRect(x, t.y, t.w, 4);
        }
    });
}

function drawPlayer() {
    const x = Math.floor(player.x - cameraX);
    const y = Math.floor(player.y);

    // Shadow
    ctx.fillStyle = "#080c16";
    ctx.fillRect(x - 2, y + 15, 14, 3);

    // Body
    ctx.fillStyle = "#36c8ff";
    ctx.fillRect(x + 1, y + 5, 8, 8);

    // Head
    ctx.fillStyle = "#ffcf9d";
    ctx.fillRect(x + 1, y, 8, 6);

    // Hair
    ctx.fillStyle = "#28344d";
    ctx.fillRect(x, y, 9, 3);

    // Eyes
    ctx.fillStyle = "#111827";
    ctx.fillRect(x + (player.facing === 1 ? 6 : 2), y + 3, 2, 2);

    // Legs
    ctx.fillStyle = "#e9edf7";
    ctx.fillRect(x + 1, y + 12, 3, 3);
    ctx.fillRect(x + 6, y + 12, 3, 3);
}

function drawParticles() {
    particles.forEach(p => {
        ctx.globalAlpha = Math.max(0, p.life / 30);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - cameraX, p.y, 3, 3);
    });

    ctx.globalAlpha = 1;
}

function drawGoal() {
    const x = 1250 - cameraX;

    ctx.fillStyle = "#d6d9e7";
    ctx.fillRect(x, 175, 4, 55);

    ctx.fillStyle = "#ffcc45";
    ctx.fillRect(x + 4, 175, 24, 14);

    ctx.fillStyle = "#fff2a1";
    ctx.fillRect(x + 4, 175, 24, 3);
}

function draw() {
    ctx.clearRect(0, 0, W, H);

    drawBackground();
    drawPlatforms();
    drawTraps();
    drawGoal();
    drawParticles();
    drawPlayer();
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

function startGame() {
    deaths = 0;
    checkpoint = 0;
    spawn.x = 35;
    spawn.y = 195;
    gameWon = false;
    gameStarted = true;

    resetPlayer();
    resetTraps();
    updateHUD();

    if (overlay) overlay.classList.add("hidden");
    if (startBtn) startBtn.textContent = "RESTART";
}

if (startBtn) startBtn.addEventListener("click", startGame);

if (soundBtn) {
    soundBtn.addEventListener("click", () => {
        soundOn = !soundOn;
        soundBtn.textContent = soundOn ? "SOUND: ON" : "SOUND: OFF";
    });
}

document.addEventListener("keydown", event => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "Space"].includes(event.code)) {
        event.preventDefault();
    }

    if (event.code === "ArrowLeft" || event.code === "KeyA") keys.left = true;
    if (event.code === "ArrowRight" || event.code === "KeyD") keys.right = true;

    if (
        (event.code === "Space" || event.code === "ArrowUp" || event.code === "KeyW") &&
        !keys.jump
    ) {
        keys.jump = true;
        jump();
    }
});

document.addEventListener("keyup", event => {
    if (event.code === "ArrowLeft" || event.code === "KeyA") keys.left = false;
    if (event.code === "ArrowRight" || event.code === "KeyD") keys.right = false;

    if (
        event.code === "Space" ||
        event.code === "ArrowUp" ||
        event.code === "KeyW"
    ) {
        keys.jump = false;
    }
});

document.querySelectorAll("[data-key]").forEach(button => {
    const key = button.dataset.key;

    button.addEventListener("pointerdown", event => {
        event.preventDefault();

        if (key === "jump") {
            if (!keys.jump) jump();
            keys.jump = true;
        } else {
            keys[key] = true;
        }
    });

    const release = () => {
        if (key === "jump") {
            keys.jump = false;
        } else {
            keys[key] = false;
        }
    };

    button.addEventListener("pointerup", release);
    button.addEventListener("pointerleave", release);
    button.addEventListener("pointercancel", release);
});

resetTraps();
updateHUD();
loop();
