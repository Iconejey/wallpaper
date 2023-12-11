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

const dps = 20;
let scale = 1;
let r = 1;
let r_min = 17;
let mode = -1;
const img_num = 8;
let image_turn = -1;

function resizeCanvas(canvas) {
	const ratio = innerWidth / innerHeight;
	canvas.width = 1080;
	const last_height = canvas.height;
	canvas.height = canvas.width / ratio;
	return last_height !== canvas.height;
}

async function loadImages(n) {
	const imgs = [];

	for (let i = 1; i <= n; i++) {
		const src = new Image();
		src.src = `green_dominant/base ${i}.png`;
		src.crossOrigin = 'anonymous';

		// Wait for the image to load
		await new Promise(res => {
			src.onload = () => res();
		});

		// Create a canvas
		const can = document.createElement('canvas');

		// Set the canvas size following the screen ratio
		can.width = src.width;
		can.height = src.width / (innerWidth / innerHeight);
		const ctx = can.getContext('2d', { willReadFrequently: true });

		// Draw the image on the base_canvas
		ctx.filter = `blur(1px)`;
		ctx.drawImage(src, 0, 0);

		imgs.push({ src, can, ctx });
	}

	console.log('loaded');
	return imgs;
}

async function start() {
	let decrease_timeout;
	const decrease = () => {
		r = Math.max(r_min, r * 0.9);

		if (r > r_min) {
			if (decrease_timeout) clearTimeout(decrease_timeout);
			decrease_timeout = setTimeout(decrease, 200);
		}
	};

	const skip = () => {
		image_turn = (image_turn + 1) % imgs.length;
		r = 100;
		decrease();
	};

	// Create a result canvas
	const res_canvas = document.createElement('canvas');
	resizeCanvas(res_canvas);
	const res_ctx = res_canvas.getContext('2d');
	document.body.appendChild(res_canvas);

	// Get images from the file input event
	const img_num = 8;
	let imgs = [];

	// Draw blured base image on the result canvas
	const bluredBase = () => {
		const src = imgs[image_turn].src;
		res_ctx.drawImage(src, 0, 0, (res_canvas.height / src.height) * src.width, res_canvas.height);
		res_ctx.filter = `blur(20px)`;
		res_ctx.drawImage(src, 0, 0, (res_canvas.height / src.height) * src.width, res_canvas.height);
		res_ctx.filter = 'none';
	};

	// Loop functione
	let last_t = 0;
	const loop = t => {
		const d = t - last_t;
		last_t = t;

		if (d > 2000) setTimeout(skip, 500);

		if (mode === -1) return;

		const img = imgs[image_turn];

		for (let i = 0; i < dps; i++) {
			const circles = img.circles;
			img.current_circle = (img.current_circle + 1) % (circles.length / 6);
			const offset = img.current_circle * 6;

			// Coordinates
			const x = (circles[offset] << 4) | ((circles[offset + 1] >> 4) & 0xf);
			const y = ((circles[offset + 1] & 0xf) << 8) | circles[offset + 2];

			// Draw the circle
			res_ctx.fillStyle = `rgb(${circles[offset + 3]}, ${circles[offset + 4]}, ${circles[offset + 5]})`;
			res_ctx.beginPath();
			res_ctx.arc(x, y, r, 0, Math.PI * 2);
			res_ctx.fill();
		}

		requestAnimationFrame(loop);
	};

	res_canvas.ondblclick = () => reset(false);

	async function reset(force) {
		res_canvas.requestFullscreen();
		const changed = resizeCanvas(res_canvas) || force;

		if (changed) {
			// Get images from the file input event
			imgs = await loadImages(img_num);

			for (const img of imgs) {
				scale = img.can.width / res_canvas.width;

				// Temporary array to store the coordinates
				temp_coords = [];

				// Generate random coordinates to fill the canvas
				for (let i = 0; i < res_canvas.width; i += r_min * 0.8) {
					for (let j = 0; j < res_canvas.height; j += r_min * 0.8) {
						const x = Math.round(i + (Math.random() - 0.5) * 10);
						const y = Math.round(j + (Math.random() - 0.5) * 10);

						// Get the color of the pixel from the base canvas
						const [r, g, b] = img.ctx.getImageData(x * scale, y * scale, 1, 1).data;

						temp_coords.push([x, y, r, g, b]);
					}
				}

				// Store x, y, r, g, b in a byte array (12 bits per coordinate + 8 bits per color = 6 bytes per coordinate)
				const circles = new Uint8Array(temp_coords.length * 6);

				// Shuffle the coordinates as we store them
				const n = temp_coords.length;
				for (let i = 0; i < n; i++) {
					const temp = temp_coords.splice(Math.floor(Math.random() * temp_coords.length), 1)[0];

					// x and y are stored as 12 bits each
					circles[i * 6] = (temp[0] >> 4) & 0xff;
					circles[i * 6 + 1] = ((temp[0] & 0xf) << 4) | ((temp[1] >> 8) & 0xf);
					circles[i * 6 + 2] = temp[1] & 0xff;

					// r, g and b are stored as 8 bits each
					circles[i * 6 + 3] = temp[2];
					circles[i * 6 + 4] = temp[3];
					circles[i * 6 + 5] = temp[4];
				}

				img.circles = circles;
				img.current_circle = 0;
			}
		}

		mode = -mode;
		if (mode === 1) skip();
		bluredBase();

		// Mode 1 is the loop mode
		if (mode === 1) return loop();

		// Mode -1 is the static mode
		const img = imgs[image_turn];
		r = r_min;

		for (let i = 0; i < img.circles.length / 6; i++) {
			const circles = img.circles;
			img.current_circle = (img.current_circle + 1) % (circles.length / 6);
			const offset = img.current_circle * 6;

			// Coordinates
			const x = (circles[offset] << 4) | ((circles[offset + 1] >> 4) & 0xf);
			const y = ((circles[offset + 1] & 0xf) << 8) | circles[offset + 2];

			// Draw the circle
			res_ctx.fillStyle = `rgb(${circles[offset + 3]}, ${circles[offset + 4]}, ${circles[offset + 5]})`;
			res_ctx.beginPath();
			res_ctx.arc(x, y, r, 0, Math.PI * 2);
			res_ctx.fill();
		}
	}

	// Draw semi-transparent white circles on touch
	res_canvas.ontouchmove = e => {
		if (mode === -1) return;

		for (const touch of e.touches) {
			const x = (touch.clientX / innerWidth) * res_canvas.width;
			const y = (touch.clientY / innerHeight) * res_canvas.height;

			const rx = x + (Math.random() - 0.5) * 100;
			const ry = y + (Math.random() - 0.5) * 100;

			res_ctx.fillStyle = `rgba(0, 0, 0, 0.5)`;
			res_ctx.beginPath();
			res_ctx.arc(rx, ry, 50, 0, Math.PI * 2);
			res_ctx.fill();
		}
	};

	res_canvas.ontouchstart = e => {
		res_canvas.ontouchmove(e);
	};

	onkeydown = e => {
		if (e.key === ' ') skip();
	};

	reset(true);
}

requestAnimationFrame(start);

// Download the result image
function download() {
	const a = document.createElement('a');
	a.href = document.querySelector('canvas').toDataURL();
	a.download = 'result.png';
	a.click();
}
