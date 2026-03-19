// Bu script ikonları oluşturmak için Node.js ile çalıştırın
// Kullanım: node generate-icons.js
// Not: 'canvas' paketi gereklidir: npm install canvas

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 128];

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const center = size / 2;
  const radius = size * 0.45;

  // Arka plan
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a2e';
  ctx.fill();

  // Dış halka
  ctx.beginPath();
  ctx.arc(center, center, radius, 0, Math.PI * 2);
  ctx.strokeStyle = '#4ecdc4';
  ctx.lineWidth = size * 0.08;
  ctx.stroke();

  // Kalkan/Check işareti
  if (size >= 32) {
    ctx.beginPath();
    ctx.moveTo(center - radius * 0.45, center);
    ctx.lineTo(center - radius * 0.1, center + radius * 0.35);
    ctx.lineTo(center + radius * 0.5, center - radius * 0.35);
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = size * 0.1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  } else {
    // Küçük ikonlar için dolu daire
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = '#4ecdc4';
    ctx.fill();
  }

  return canvas.toBuffer('image/png');
}

sizes.forEach(size => {
  const buffer = drawIcon(size);
  const filePath = path.join(__dirname, 'icons', `icon${size}.png`);
  fs.writeFileSync(filePath, buffer);
  console.log(`Oluşturuldu: icon${size}.png`);
});

console.log('Tüm ikonlar oluşturuldu!');
