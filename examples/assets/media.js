/** Local file previews and an optional remote source for the media examples. */
export function connectImagePicker(input, image, status) {
	let currentUrl;
	let selection = 0;
	input.addEventListener('change', () => {
		const file = input.files?.[0];
		if(!file) return;
		const request = ++selection;
		status.textContent = '';
		const url = URL.createObjectURL(file);
		const preview = new Image();
		preview.onload = () => {
			if(request !== selection) {
				URL.revokeObjectURL(url);
				return;
			}
			image.src = url;
			image.alt = `Selected image: ${file.name}`;
			if(currentUrl) URL.revokeObjectURL(currentUrl);
			currentUrl = url;
		};
		preview.onerror = () => {
			URL.revokeObjectURL(url);
			if(request === selection) status.textContent = 'This file could not be opened as an image. Choose another image.';
		};
		preview.src = url;
	});
}

export async function preferRemoteVideo(video) {
	const localSource = video.getAttribute('src');
	const localLabel = video.getAttribute('aria-label');
	const remoteSource = video.dataset.remoteSrc;
	try {
		// Test the actual source, rather than relying on navigator.onLine.
		const response = await fetch(remoteSource, {method: 'HEAD', signal: AbortSignal.timeout(5000)});
		if(!response.ok || !video.isConnected) return;
	}
	catch { return; }

	let timeout;
	let usingRemote = true;
	const clearTimeoutOnLoad = () => clearTimeout(timeout);
	const fallback = () => {
		if(!usingRemote) return;
		usingRemote = false;
		clearTimeout(timeout);
		video.removeEventListener('error', fallback);
		video.removeEventListener('loadeddata', clearTimeoutOnLoad);
		const playing = !video.paused;
		video.src = localSource;
		video.setAttribute('aria-label', localLabel);
		video.load();
		if(playing) video.play().catch(() => {});
	};
	video.addEventListener('error', fallback);
	video.addEventListener('loadeddata', clearTimeoutOnLoad);
	const playing = !video.paused;
	video.crossOrigin = 'anonymous';
	video.preload = 'auto';
	video.src = remoteSource;
	video.setAttribute('aria-label', 'Big Buck Bunny');
	timeout = setTimeout(fallback, 8000);
	video.load();
	if(playing) video.play().catch(() => {});
}

const picker = document.querySelector('#palette-image-file');
if(picker) connectImagePicker(picker, document.querySelector('#image-palette-demo img'), document.querySelector('#palette-image-status'));
const video = document.querySelector('#video-palette-demo video');
if(video) preferRemoteVideo(video);
