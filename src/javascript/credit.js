const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

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
        this.alpha = 1;
        this.noise = {
            x: Math.random() * 0.5 - 0.25,
            y: Math.random() * 0.5 - 0.25
        };
        this.noiseOffset = Math.random() * 1000;
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
        const maxDistance = 35; // 65% smaller than 100

        if (distance < maxDistance) {
            // Organic movement when near the mouse/touch
            const force = (maxDistance - distance) / maxDistance;
            const angle = Math.atan2(dy, dx);
            
            // Add noise to the movement
            const noiseX = Math.sin(currentTime * 0.002 + this.noiseOffset) * this.noise.x;
            const noiseY = Math.cos(currentTime * 0.002 + this.noiseOffset) * this.noise.y;
            
            this.velocity.x += Math.cos(angle) * force * 0.1 + noiseX;
            this.velocity.y += Math.sin(angle) * force * 0.1 + noiseY;
            
            // Apply velocity with stronger damping
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.velocity.x *= 0.9;
            this.velocity.y *= 0.9;
        } else {
            // Return to original position with easing
            const returnForce = 0.05;
            this.velocity.x += (this.baseX - this.x) * returnForce;
            this.velocity.y += (this.baseY - this.y) * returnForce;
            
            this.x += this.velocity.x;
            this.y += this.velocity.y;
            this.velocity.x *= 0.9;
            this.velocity.y *= 0.9;
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
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const fontSize = Math.min(window.innerWidth / 20, 28);
    ctx.font = `550 ${fontSize}px "Poppins", Arial, sans-serif`;
    ctx.fillStyle = 'white';
    
    const text = 'Jonas Kjeldmand Jensen';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    
    const x = canvas.width - textWidth - 20;
    const y = canvas.height - 20;
    
    ctx.fillText(text, x, y);
    
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const step = Math.max(1, Math.floor(3 * window.devicePixelRatio));
    for (let y = 0; y < data.height; y += step) {
        for (let x = 0; x < data.width; x += step) {
            if (data.data[(y * 4 * data.width) + (x * 4) + 3] > 200) {
                particles.push(new Particle(x, y));
            }
        }
    }
}

let mouse = {
    x: null,
    y: null
}

function handleInteraction(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if (event.type === 'mousemove') {
        mouse.x = (event.clientX - rect.left) * scaleX;
        mouse.y = (event.clientY - rect.top) * scaleY;
    } else if (event.type === 'touchmove') {
        mouse.x = (event.touches[0].clientX - rect.left) * scaleX;
        mouse.y = (event.touches[0].clientY - rect.top) * scaleY;
        event.preventDefault();
    }
}

function handleClick(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    const textBounds = getTextBounds();
    if (clickX >= textBounds.x && clickX <= textBounds.x + textBounds.width &&
        clickY >= textBounds.y - textBounds.height && clickY <= textBounds.y) {
        startExplosion();
    }
}

function handleTouch(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touchX = (event.touches[0].clientX - rect.left) * scaleX;
    const touchY = (event.touches[0].clientY - rect.top) * scaleY;

    const textBounds = getTextBounds();
    if (touchX >= textBounds.x && touchX <= textBounds.x + textBounds.width &&
        touchY >= textBounds.y - textBounds.height && touchY <= textBounds.y) {
        startExplosion();
    }
}

window.addEventListener('mousemove', handleInteraction);
window.addEventListener('touchmove', handleInteraction, { passive: false });
canvas.addEventListener('click', handleClick);
canvas.addEventListener('touchend', handleTouch);

function getTextBounds() {
    const text = 'Jonas Kjeldmand Jensen';
    const metrics = ctx.measureText(text);
    const fontSize = parseFloat(ctx.font);
    return {
        x: canvas.width - metrics.width - 20,
        y: canvas.height - 20,
        width: metrics.width,
        height: fontSize * 1.2 // Approximate height based on font size
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
    init();
});