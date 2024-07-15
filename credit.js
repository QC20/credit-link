const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let particles = [];
let isExploding = false;
let explosionStartTime = 0;
const redirectURL = 'https://jonaskjeldmand.vercel.app/';
const explosionDuration = 1500; // 1.5 seconds
const fadeOutDuration = 500; // 0.5 seconds

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 1.25;
        this.baseX = x;
        this.baseY = y;
        this.density = (Math.random() * 10) + 1;
        this.velocity = { x: 0, y: 0 };
        this.alpha = 1; // Full opacity
        this.angle = Math.random() * Math.PI * 0.25; // Random angle for organic movement
        this.speed = Math.random() * 2 + 0.1; // Random speed for organic movement
    }

    draw() {
        ctx.fillStyle = `rgba(255, 255, 255, ${this.alpha})`;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.closePath();
        ctx.fill();
    }

    update(mouseX, mouseY, currentTime) {
        if (isExploding) {
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            
            const elapsedTime = currentTime - explosionStartTime;
            if (elapsedTime > explosionDuration - fadeOutDuration) {
                this.alpha = 1 - (elapsedTime - (explosionDuration - fadeOutDuration)) / fadeOutDuration;
            }
            return;
        }

        const dx = mouseX - this.x;
        const dy = mouseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 80;

        if (distance < maxDistance) {
            // Organic movement when near the mouse
            this.angle += 0.05;
            const moveX = Math.cos(this.angle) * this.speed;
            const moveY = Math.sin(this.angle) * this.speed;
            this.x += moveX + (dx / distance) * (maxDistance - distance) / maxDistance * 2;
            this.y += moveY + (dy / distance) * (maxDistance - distance) / maxDistance * 2;
        } else {
            // Return to original position
            if (this.x !== this.baseX) {
                const dx = this.baseX - this.x;
                this.x += dx / 10;
            }
            if (this.y !== this.baseY) {
                const dy = this.baseY - this.y;
                this.y += dy / 10;
            }
        }
    }

    explode() {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 5 + 2;
        this.velocity.x = Math.cos(angle) * speed;
        this.velocity.y = Math.sin(angle) * speed;
    }
}

function init() {
    particles = [];
    ctx.font = '30px Arial';
    ctx.fillStyle = 'white';
    
    const text = 'Jonas Kjeldmand Jensen';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    
    const x = canvas.width - textWidth - 20;
    const y = canvas.height - 20;
    
    ctx.fillText(text, x, y);
    
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    for (let y = 0; y < data.height; y += 2) {
        for (let x = 0; x < data.width; x += 2) {
            if (data.data[(y * 4 * data.width) + (x * 4) + 3] > 128) {
                particles.push(new Particle(x, y));
            }
        }
    }
}

let mouse = {
    x: null,
    y: null
}

window.addEventListener('mousemove', function(event) {
    mouse.x = event.x;
    mouse.y = event.y;
});

canvas.addEventListener('click', function(event) {
    const textBounds = getTextBounds();
    if (event.x >= textBounds.x && event.x <= textBounds.x + textBounds.width &&
        event.y >= textBounds.y - textBounds.height && event.y <= textBounds.y) {
        startExplosion();
    }
});

function getTextBounds() {
    const text = 'Jonas Kjeldmand Jensen';
    const metrics = ctx.measureText(text);
    return {
        x: canvas.width - metrics.width - 20,
        y: canvas.height - 20,
        width: metrics.width,
        height: 35 // Approximate height based on font size
    };
}

function startExplosion() {
    isExploding = true;
    explosionStartTime = Date.now();
    particles.forEach(particle => particle.explode());
    setTimeout(() => {
        window.location.href = redirectURL;
    }, explosionDuration);
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const currentTime = Date.now();
    for (let i = 0; i < particles.length; i++) {
        particles[i].update(mouse.x, mouse.y, currentTime);
        particles[i].draw();
    }
    requestAnimationFrame(animate);
}

init();
animate();

window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    init();
});