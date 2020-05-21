/* eslint-disable max-len */
// ==UserScript==
// @name         E(nhanced)621
// @namespace    Lilith
// @version      0.0.0
// @description  TODO
// @author       PrincessRTFM
// @match        *://e621.net/*
// @grant        GM_info
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_setClipboard
// @grant        unsafeWindow
// ==/UserScript==

/* CHANGELOG
v1.0.0 - initial script, minimal functionality, mostly ripped apart from three old scripts broken in the site update
*/
/* eslint-enable max-len */


const SCRIPT_NAME = GM_info.script.name;
const SCRIPT_VERSION = `V${GM_info.script.version || '???'}`;
const SCRIPT_TITLE = `${SCRIPT_NAME} ${SCRIPT_VERSION}`;

const debug = console.debug.bind(console, `[${SCRIPT_TITLE}]`);
const log = console.log.bind(console, `[${SCRIPT_TITLE}]`);
const info = console.info.bind(console, `[${SCRIPT_TITLE}]`);
const warn = console.warn.bind(console, `[${SCRIPT_TITLE}]`);
const error = console.error.bind(console, `[${SCRIPT_TITLE}]`);


const pause = delay => new Promise(resolve => setTimeout(resolve.bind(resolve, delay), delay));
const request = (uri, ctx) => {
	const url = new URL(String(uri));
	url.searchParams.append('_client', encodeURIComponent(`${SCRIPT_TITLE} by lsong@princessrtfm.com`));
	return new Promise((resolve, reject) => GM_xmlhttpRequest({
		method: "GET",
		url: url.toString(),
		responseType: 'json',
		onerror: reject,
		onload: resolve,
		ontimeout: reject,
		context: ctx || Object.create(null),
	}));
};

const makeElem = (tag, id, clazz) => {
	const elem = document.createElement(tag);
	if (id) {
		elem.id = id;
	}
	if (clazz) {
		elem.className = clazz; // eslint-disable-line unicorn/no-keyword-prefix
	}
	return elem;
};
const warningBox = () => {
	const ID = 'enhanced621-message-box';
	let box = document.querySelector(`#${ID}`);
	if (box) {
		return box;
	}
	box = makeElem('div', ID, 'status-notice');
	box.style.display = 'none';
	/* eslint-disable sonarjs/no-duplicate-string */
	GM_addStyle([
		`#${ID} {`,
		'position: fixed;',
		'right: 0;',
		`top: ${document.querySelector('#image-container').offsetTop}px;`,
		'border-top-right-radius: 0;',
		'border-bottom-right-radius: 0;',
		'width: 350px;',
		'z-index: 9999;',
		'}',
		`#${ID} > .enhanced621-message {`,
		'display: block;',
		'margin: 4px;',
		'padding: 3px;',
		'}',
		'.enhanced621-message-dismiss {',
		'cursor: pointer;',
		'margin-right: 4px;',
		'color: #999999;',
		'font-size: 17px;',
		'position: relative;',
		'top: 2px;',
		'}',
		'.enhanced621-message-icon {',
		'cursor: default;',
		'margin-left: 3px;',
		'margin-right: 2px;',
		'font-size: 16px;',
		'position: relative;',
		'top: 1px;',
		'}',
		'.enhanced621-message-icon.enhanced621-message-error {',
		'color: #EE0000;',
		'}',
		'.enhanced621-message-icon.enhanced621-message-warning {',
		'color: #EEEE00;',
		'}',
		'.enhanced621-message-icon.enhanced621-message-help {',
		'color: #00EE44;',
		'}',
		'.enhanced621-message-content {',
		'cursor: default;',
		'margin-left: 2px;',
		'font-size: 16px;',
		'}',
	].join(''));
	/* eslint-enable sonarjs/no-duplicate-string */
	document.body.append(box);
	return box;
};
const putMessage = (content, type, icon) => {
	const master = warningBox();
	const messageContainer = makeElem('div', '', `enhanced621-message enhanced621-message-${type}`);
	const messageText = makeElem('span', '', `enhanced621-message-content enhanced621-message-${type}`);
	const messageClose = makeElem('span', '', `enhanced621-message-dismiss enhanced621-message-${type}`);
	const messageIcon = makeElem('span', '', `enhanced621-message-icon enhanced621-message-${type}`);
	messageText.innerHTML = content;
	messageClose.textContent = '✖';
	messageIcon.textContent = icon;
	messageContainer.append(messageClose, messageIcon, messageText);
	messageClose.addEventListener('click', () => {
		messageContainer.remove();
		if (!master.children.length) {
			master.style.display = 'none';
		}
	});
	master.append(messageContainer);
	master.style.display = 'block';
};
const putError = content => putMessage(content, 'error', '⚠');
const putWarning = content => putMessage(content, 'warning', '⚠');
const putHelp = content => putMessage(content, 'help', '🛈');

const navbar = document.querySelector('#nav').children[0];
const subnavbar = document.querySelector('#nav').children[1];

const POOL_PATH_PREFIX = '/pools/';
const POST_PATH_PREFIX = '/posts/';

const POOL_FRAG_READER = 'reader-mode';

const POOL_READER_CONTAINER_ID = 'pool-reader';
const POOL_READER_STATUSLINE_ID = 'enhanced621-pool-reader-status';

const enablePoolReaderMode = async () => {
	location.hash = POOL_FRAG_READER;
	const vanillaPageList = document.querySelector('div#posts');
	let readerPageContainer = document.querySelector(`div#${POOL_READER_CONTAINER_ID}`);
	if (!vanillaPageList) {
		throw new Error("No post container found");
	}
	if (readerPageContainer) {
		vanillaPageList.style.display = 'none';
		readerPageContainer.style.display = '';
		document.querySelector(`#${POOL_READER_STATUSLINE_ID}`).style.display = '';
		return Promise.resolve(readerPageContainer);
	}
	GM_addStyle([
		`div#${POOL_READER_CONTAINER_ID} > a {`,
		'display: block;',
		'margin: 20px auto;',
		'width: fit-content;',
		'}',
		`div#${POOL_READER_CONTAINER_ID} > a > img.pool-image {`,
		'display: block;',
		'max-width: 85vw;',
		'max-height: 120vh;',
		'}',
	].join(''));
	const poolID = parseInt(location.pathname.slice(POOL_PATH_PREFIX.length), 10);
	readerPageContainer = makeElem('div', POOL_READER_CONTAINER_ID);
	const statusLine = makeElem('menu', POOL_READER_STATUSLINE_ID);
	subnavbar.parentElement.append(statusLine);
	const status = statusText => {
		debug("Status:", statusText);
		statusLine.textContent = statusText;
	};
	const title = subtitle => {
		document.title = `Pool Reader: ${subtitle} - e621`;
	};
	const checkResponseValidity = async poolData => {
		const pools = poolData.response;
		// pools is an array of pool objects
		if (pools.length > 1) {
			throw new Error(`Site returned too many options (${pools.length})`);
		}
		if (pools < 1) {
			throw new Error("Site returned no pools");
		}
		const pool = pools[0];
		const id = pool.id || poolData.context.pool;
		const name = pool.name.replace(/_/gu, ' ');
		const total = pool.post_count;
		if (total != pool.post_ids.length) {
			throw new Error(
				`Sanity check failed, post list (${pool.post_ids.length}) doesn't match expected size (${total})`
			);
		}
		if (!total) {
			throw new Error("Sanity check failed, post list empty");
		}
		title(`loading ${name}... (#${id})`);
		status(`Loading ${total} post${total == 1 ? '' : 's'} from pool #${id}...`);
		const state = Object.create(null);
		state.poolID = id;
		state.poolName = name;
		state.postCount = total;
		state.postIDs = pool.post_ids;
		return state;
	};
	const insertImages = async state => {
		state.posts = [];
		await state.postIDs.reduce(async (ticker, postID) => {
			await ticker;
			await pause(1000);
			const current = state.posts.length + 1;
			const total = state.postCount;
			status(`Loading post #${postID} (${current}/${total})`);
			const api = await request(`https://e621.net/posts/${postID}.json`);
			state.posts.push({
				url: api.response.post.file.url,
				id: api.response.post.id,
			});
			return new Promise(resolve => {
				const img = makeElem('img', '', 'pool-image');
				const link = makeElem('a', `post-${postID}`);
				link.href = `/posts/${postID}`;
				link.title = `${state.poolName}, ${current}/${total}`;
				link.append(img);
				readerPageContainer.append(link);
				img.addEventListener('load', resolve, {
					once: true,
				});
				img.src = api.response.post.file.url;
			});
		}, Promise.resolve());
		return state;
	};
	const onPoolLoadingError = err => {
		title(`pool loading failed`);
		status(err.toString().replace(/^error:\s+/ui, ''));
	};
	title(`loading pool #${poolID}...`);
	status(`Loading pool data for pool #${poolID}...`);
	const context = {
		pool: poolID,
	};
	return request(`${location.origin}/pools.json?search[id]=${poolID}`, context)
		.then(checkResponseValidity)
		.then(state => {
			vanillaPageList.parentElement.append(readerPageContainer);
			vanillaPageList.style.display = 'none';
			return state;
		})
		.catch(onPoolLoadingError)
		.then(insertImages)
		.then(state => {
			title(`${state.poolName} (#${state.poolID})`);
			status(`Finished loading images for pool ${state.poolID} (${state.postCount} total)`);
			return state;
		});
};
const disablePoolReaderMode = () => {
	location.hash = '';
	const vanillaPageList = document.querySelector('div#posts');
	const readerPageContainer = document.querySelector(`div#${POOL_READER_CONTAINER_ID}`);
	if (!vanillaPageList || !readerPageContainer) {
		return;
	}
	readerPageContainer.style.display = 'none';
	vanillaPageList.style.display = '';
	document.querySelector(`#${POOL_READER_STATUSLINE_ID}`).style.display = 'none';
};
const togglePoolReaderMode = evt => {
	const readerPageContainer = document.querySelector(`div#${POOL_READER_CONTAINER_ID}`);
	if (readerPageContainer && readerPageContainer.style.display) {
		// Exists, hidden
		enablePoolReaderMode();
	}
	else if (readerPageContainer) {
		// Exists, visible
		disablePoolReaderMode();
	}
	else {
		// Doesn't exist
		enablePoolReaderMode();
	}
	if (evt) {
		evt.preventDefault();
		evt.stopPropagation();
	}
};

log("Initialising");

for (const link of document.querySelectorAll(`a[href^="${POOL_PATH_PREFIX}"]`)) {
	link.href = `${link.href}#${POOL_FRAG_READER}`;
}
if (location.pathname.startsWith(POOL_PATH_PREFIX)) {
	const readerItem = makeElem('li', 'enhanced621-pool-reader-toggle');
	const readerLink = makeElem('a');
	GM_addStyle('#enhanced621-pool-reader-toggle { position: absolute; right: 20px; cursor: pointer; }');
	readerLink.addEventListener('click', togglePoolReaderMode);
	readerLink.textContent = 'Toggle reader';
	readerItem.append(readerLink);
	subnavbar.append(readerItem);
	if (location.hash.replace(/^#+/u, '') == POOL_FRAG_READER) {
		enablePoolReaderMode();
	}
}
else if (location.pathname.startsWith(POST_PATH_PREFIX)) {
	const sourceLink = document.querySelector('#image-download-link > a[href]');
	const image = document.querySelector('#image');
	const errorNoSource = "Could't find download/source link!";
	if (image) {
		if (image.tagName.toLowerCase() == 'img') {
			image.addEventListener('dblclick', evt => {
				if (sourceLink && sourceLink.href) {
					location.assign(sourceLink.href);
				}
				else {
					putError(errorNoSource);
				}
				evt.preventDefault();
				evt.stopPropagation();
			});
		}
		if (sourceLink && sourceLink.href) {
			const directSourceItem = makeElem('li', 'enhanced621-direct-source');
			const directSourceLink = makeElem('a');
			GM_addStyle('#enhanced621-direct-source { position: absolute; right: 20px; cursor: pointer; }');
			directSourceLink.textContent = 'Direct Link';
			directSourceLink.href = sourceLink.href;
			directSourceItem.append(directSourceLink);
			subnavbar.append(directSourceItem);
		}
		else {
			putWarning(errorNoSource);
		}
	}
}

