import {afterEach, describe, expect, it, vi} from 'vitest';
import {connectImagePicker, preferRemoteVideo} from '../examples/assets/media.js';

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
	document.body.innerHTML = '';
});

function videoExample() {
	document.body.innerHTML = '<video src="?asset=palette.webm" data-remote-src="https://example.com/bunny.mp4" aria-label="Local clip"></video>';
	const video = document.querySelector('video');
	video.load = vi.fn();
	return video;
}

describe('Media example source selection', () => {
	it('keeps the local video when the remote source is unreachable or rejects the request', async () => {
		const video = videoExample();
		vi.stubGlobal('fetch', vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ok: false}));
		await preferRemoteVideo(video);
		await preferRemoteVideo(video);
		expect(video.getAttribute('src')).toBe('?asset=palette.webm');
		expect(video.load).not.toHaveBeenCalled();
	});

	it('uses a reachable remote video with CORS and restores the local source on a media error', async () => {
		vi.useFakeTimers();
		const video = videoExample();
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true}));
		await preferRemoteVideo(video);
		expect(video.src).toBe('https://example.com/bunny.mp4');
		expect(video.crossOrigin).toBe('anonymous');
		video.dispatchEvent(new Event('loadeddata'));
		await vi.advanceTimersByTimeAsync(9000);
		expect(video.src).toBe('https://example.com/bunny.mp4');
		video.dispatchEvent(new Event('error'));
		expect(video.getAttribute('src')).toBe('?asset=palette.webm');
		expect(video.getAttribute('aria-label')).toBe('Local clip');
	});

	it('falls back when remote media does not finish loading', async () => {
		vi.useFakeTimers();
		const video = videoExample();
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ok: true}));
		await preferRemoteVideo(video);
		await vi.advanceTimersByTimeAsync(8000);
		expect(video.getAttribute('src')).toBe('?asset=palette.webm');
	});

	it('previews only the latest image and releases replaced or invalid file URLs', () => {
		document.body.innerHTML = '<input type="file"><img src="original.svg"><p></p>';
		const input = document.querySelector('input');
		const image = document.querySelector('img');
		const status = document.querySelector('p');
		const previews = [];
		vi.stubGlobal('Image', class { constructor() { previews.push(this); } });
		vi.stubGlobal('URL', {createObjectURL: vi.fn().mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second').mockReturnValueOnce('blob:third').mockReturnValueOnce('blob:bad'), revokeObjectURL: vi.fn()});
		connectImagePicker(input, image, status);
		const choose = name => {
			Object.defineProperty(input, 'files', {configurable: true, value: [new File(['image'], name)]});
			input.dispatchEvent(new Event('change'));
		};
		choose('first.png');
		choose('second.png');
		previews[1].onload();
		previews[0].onload();
		expect(image.getAttribute('src')).toBe('blob:second');
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:first');
		choose('third.png');
		previews[2].onload();
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:second');
		choose('bad.png');
		previews[3].onerror();
		expect(image.getAttribute('src')).toBe('blob:third');
		expect(status.textContent).toContain('could not be opened');
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:bad');
	});
});
