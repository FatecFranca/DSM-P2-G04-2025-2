export const resolveUrl = (url) => {
	if (!url || typeof url !== 'string') return '';
	if (url.startsWith('http://') || url.startsWith('https://')) return url;
	const normalized = url.startsWith('/') ? url : `/${url}`;
	const isBrowser = typeof window !== 'undefined' && window.location;
	if (isBrowser) {
		const protocol = window.location.protocol || 'http:';
		const hostname = window.location.hostname || 'localhost';
		const base = `${protocol}//${hostname}:5000`;
		return `${base}${normalized}`;
	}
	return normalized;
};


