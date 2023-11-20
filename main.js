// Convert RGB to HSL
function RGBtoHSL(r, g, b) {
	r /= 255;
	g /= 255;
	b /= 255;
	const max = Math.max(r, g, b);
	const min = Math.min(r, g, b);
	let h,
		s,
		l = (max + min) / 2;

	if (max === min) {
		h = s = 0; // achromatic
	} else {
		const diff = max - min;
		s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
		switch (max) {
			case r:
				h = (g - b) / diff + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / diff + 2;
				break;
			case b:
				h = (r - g) / diff + 4;
				break;
		}
		h /= 6;
	}

	return [h * 360, s * 100, l * 100];
}

// Convert HSL to RGB
function HSLtoRGB(h, s, l) {
	h /= 360;
	s /= 100;
	l /= 100;
	let r, g, b;

	if (s === 0) {
		r = g = b = l; // achromatic
	} else {
		const hue2rgb = (p, q, t) => {
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			if (t < 1 / 6) return p + (q - p) * 6 * t;
			if (t < 1 / 2) return q;
			if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
			return p;
		};

		const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
		const p = 2 * l - q;

		r = hue2rgb(p, q, h + 1 / 3);
		g = hue2rgb(p, q, h);
		b = hue2rgb(p, q, h - 1 / 3);
	}

	return [r * 255, g * 255, b * 255];
}

function fixHue(data) {
	// Leaves color
	const [lR, lG, lB] = [186, 218, 85];
	const [lH, lS, lL] = RGBtoHSL(lR, lG, lB);

	for (let i = 0; i < data.length; i += 4) {
		// Get the RGB values
		const pR = data[i];
		const pG = data[i + 1];
		const pB = data[i + 2];

		// Get the hsl values
		const [pH, pS, pL] = RGBtoHSL(pR, pG, pB);

		const nH = lH;
		const nS = pS;
		const nL = pL;

		// Convert the new hsl values to rgb
		let [nR, nG, nB] = HSLtoRGB(nH, nS, nL);

		// Set the new RGB values
		data[i] = nR;
		data[i + 1] = nG;
		data[i + 2] = nB;
	}
}

async function main() {
	// Load image from file
	const image = new Image();
	image.src = './base.png';
	image.crossOrigin = 'anonymous';

	// Wait for the image to load
	await new Promise(res => (image.onload = res));

	// Create a base canvas
	const base_canvas = document.createElement('canvas');
	// document.body.appendChild(base_canvas);
	base_canvas.width = image.width;
	base_canvas.height = image.height;
	const base_ctx = base_canvas.getContext('2d', { willReadFrequently: true });

	// Draw the image on the base_canvas
	base_ctx.drawImage(image, 0, 0);

	// // Get the image data
	// const data = base_ctx.getImageData(0, 0, base_canvas.width, base_canvas.height).data;

	// Create a result canvas
	const res_canvas = document.createElement('canvas');
	const ratio = image.width / image.height;
	res_canvas.width = 2160;
	res_canvas.height = 2160 / ratio;
	const scale = res_canvas.width / image.width;
	const res_ctx = res_canvas.getContext('2d');
	document.body.appendChild(res_canvas);

	const blur = 20;
	res_ctx.filter = `blur(${blur}px)`;

	// Draw the image on the result canvas
	res_ctx.drawImage(image, 0, 0, res_canvas.width, res_canvas.height);

	res_ctx.filter = 'none';

	// Draw a random circle on the result canvas following the image
	const circle = () => {
		// Random position
		const r = 20;
		const x = Math.random() * res_canvas.width;
		const y = Math.random() * res_canvas.height;

		// Get the color of the pixel from the base canvas
		const [pR, pG, pB] = base_ctx.getImageData(x / scale, y / scale, 1, 1).data;

		// Draw the circle
		res_ctx.fillStyle = `rgb(${pR}, ${pG}, ${pB})`;
		res_ctx.beginPath();
		res_ctx.arc(x, y, r, 0, Math.PI * 2);
		res_ctx.fill();
	};

	let t = 0;

	// Loop functione
	const loop = d => {
		if (d) t += d;
		// const dps = t / 1000 < 1000 ? 1000 : 100;
		const dps = 20;
		for (let i = 0; i < dps; i++) circle();

		// Loop
		requestAnimationFrame(loop);
	};

	// Start the loop
	loop();

	res_canvas.onclick = () => res_canvas.requestFullscreen();

	// fixHue(data);

	// // Put the data back on the canvas
	// ctx.putImageData(new ImageData(data, canvas.width, canvas.height), 0, 0);

	// // Crop the image to remove the white border
	// const croppedCanvas = document.createElement('canvas');
	// croppedCanvas.width = canvas.width - blur * 2;
	// croppedCanvas.height = canvas.height - blur * 2;
	// const croppedCtx = croppedCanvas.getContext('2d');
	// croppedCtx.drawImage(canvas, blur, blur, croppedCanvas.width, croppedCanvas.height, 0, 0, croppedCanvas.width, croppedCanvas.height);

	// // Save the image
	// const link = document.createElement('a');
	// link.download = 'fixed.png';

	// // Convert the canvas to a blob
	// res_canvas.toBlob(blob => {
	// 	// Create a URL for the blob
	// 	link.href = URL.createObjectURL(blob);

	// 	// Click the link
	// 	// link.click();

	// 	// Remove the URL
	// 	URL.revokeObjectURL(link.href);
	// });
}

requestAnimationFrame(main);
