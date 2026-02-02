const header = document.getElementById('site-header');
const darkSection = document.querySelector('[data-header-dark]');
if (header && darkSection) {
	function updateHeader() {
		if (!darkSection) return;
		if (!header) return;
		const rect = darkSection.getBoundingClientRect();
		header.classList.toggle('header-over-dark', rect.top <= 80);
	}
	window.addEventListener('scroll', updateHeader, { passive: true });
	updateHeader();
}

let lastHackNightScroll = 0;
function scrollToHackNight() {
	const el = document.getElementById('hack-night');
	if (el) {
		el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		lastHackNightScroll = Date.now();
	}
}

document.addEventListener('click', (e: MouseEvent) => {
	if (!(e.target as HTMLElement | null)?.closest?.('a[href="#hack-night"]')) return;
	e.preventDefault();
	if (Date.now() - lastHackNightScroll < 500) return; // avoid double scroll on mobile
	scrollToHackNight();
}, true);

document.addEventListener('touchend', (e: TouchEvent) => {
	if (!(e.target as HTMLElement | null)?.closest?.('a[href="#hack-night"]')) return;
	e.preventDefault();
	scrollToHackNight();
}, { passive: false });
