//@ts-check

const LEFT_PAGE = '#left-page';
const RIGHT_PAGE = '#right-page';
let directoryName = '';
const pageHandles = [];
let state = {
  currentPageIndex: 0,
  date: new Date(),
  direction: 'RTL',
  directoryLoaded: false,
  pagesPerView: 2,
};

class StateStore {
  static loadState() {
    if (directoryName == '') {
      return false;
    }
    const savedState =
        window.localStorage.getItem('imageviewer:' + directoryName);
    if (!savedState) {
      return false;
    }
    state = JSON.parse(savedState);
    state.date = new Date();
    showPage(state.currentPageIndex);
    return true;
  }

  static saveState() {
    if (directoryName == '') {
      return;
    }
    state.date = new Date();
    window.localStorage.setItem(
        'imageviewer:' + directoryName, JSON.stringify(state));
  }
}

/**
 * @param {FileSystemFileHandle} file_handle
 * @returns {Promise<string>}
 */
async function getImageSrc(file_handle) {
  const file = await file_handle.getFile();
  const file_reader = new FileReader();
  const image_src = new Promise((resolve, reject) => {
    file_reader.onload =
        () => {
          const arrayBufferView = new Uint8Array(file_reader.result);
          const blob = new Blob([arrayBufferView], {type: 'image/jpeg'});
          const imageUrl = window.URL.createObjectURL(blob);
          resolve(imageUrl);
        }
  });
  file_reader.readAsArrayBuffer(file);
  return image_src;
}

async function setPage(elementId, pageHandle) {
  document.querySelector(elementId).src = await getImageSrc(pageHandle);
}

/**
 * @param {number} index
 */
function showPage(index) {
  if (index >= pageHandles.length) {
    return;
  }
  state.currentPageIndex = index;
  const firstPage = state.direction == 'LTR' ? LEFT_PAGE : RIGHT_PAGE;
  const secondPage = state.direction == 'LTR' ? RIGHT_PAGE : LEFT_PAGE;
  setPage(firstPage, pageHandles[index]);

  if (index + 1 >= pageHandles.length || state.pagesPerView < 2) {
    document.querySelector(secondPage).src = '';
    return;
  }
  setPage(secondPage, pageHandles[index + 1]);
  StateStore.saveState();
}

async function loadDirectory() {
  const dir = await window.chooseFileSystemEntries({type: 'openDirectory'});
  directoryName = dir.name;
  pageHandles.length = 0;
  for await (const entry of dir.getEntries()) {
    pageHandles.push(entry);
  }
  pageHandles.sort((handle1, handle2) => {
    return handle1.name.localeCompare(handle2.name);
  })
  state.directoryLoaded = true;
  if (StateStore.loadState()) {
    onResize();
  } else {
    onResize();
    showPage(0);
  }
}

function adjustParity() {
  if (state.currentPageIndex % 2 == 0) {
    showPage(Math.min(pageHandles.length, state.currentPageIndex + 1));
  } else {
    showPage(Math.max(0, state.currentPageIndex - 1));
  }
}

function showNextPage() {
  showPage(Math.min(
      pageHandles.length, state.currentPageIndex + state.pagesPerView));
}

function showPreviousPage() {
  showPage(Math.max(0, state.currentPageIndex - state.pagesPerView));
}

function showPagesToLeft() {
  if (state.direction == 'LTR') {
    showPreviousPage();
  } else {
    showNextPage();
  }
}

function showPagesToRight() {
  if (state.direction == 'LTR') {
    showNextPage();
  } else {
    showPreviousPage();
  }
}

function toggleDirection() {
  state.direction = state.direction == 'LTR' ? 'RTL' : 'LTR';
  showPage(state.currentPageIndex);
}

function setPagesPerView(/** @type {number} */ pagesPerView) {
  state.pagesPerView = pagesPerView;
  document.querySelectorAll('.page-image')
      .forEach(
          (/** @type{HTMLElement} */ element) => element.style['max-width'] =
              `${100 / state.pagesPerView}%`);
  showPage(state.currentPageIndex);
}

function togglepagesPerView() {
  setPagesPerView(state.pagesPerView == 1 ? 2 : 1);
}

function goToFirstPage() {
  showPage(0);
}

function onLeftPageClicked(/** @type {MouseEvent} */ event) {
  if (state.pagesPerView == 1 && state.direction == 'LTR') {
    if (event.offsetX <
        /** @type {HTMLImageElement} */ (event.target).width / 2) {
      showPagesToLeft();
    } else {
      showPagesToRight();
    }
  } else {
    showPagesToLeft();
  }
}

function onRightPageClicked(/** @type {MouseEvent} */ event) {
  if (state.pagesPerView == 1 && state.direction == 'RTL') {
    if (event.offsetX <
        /** @type {HTMLImageElement} */ (event.target).width / 2) {
      showPagesToLeft();
    } else {
      showPagesToRight();
    }
  } else {
    showPagesToRight();
  }
}

function onKeyDown(/** @type {KeyboardEvent} */ event) {
  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      showPagesToLeft();
      break;
    case 'ArrowRight':
      event.preventDefault();
      showPagesToRight();
      break;
    default:
      break;
  }
}

function onResize() {
  if (state.currentPageIndex >= pageHandles.length) {
    return;
  }
  /** @type {HTMLImageElement} */ const page =
      document.querySelector(state.direction == 'LTR' ? LEFT_PAGE : RIGHT_PAGE);
  if (window.innerHeight / window.innerWidth > page.height / page.width) {
    // The window is taller than the page, so we show a single page.
    if (state.pagesPerView != 1) {
      setPagesPerView(1);
    }
    return;
  }
  // We assume that the next page has the same dimensions as the current, and
  // show one or two pages depending on which fills more of the screen.
  const singlePageFillRatio =
      (page.width / page.height) / (window.innerWidth / window.innerHeight);
  const doublePageFillRatio =
      (page.height / page.width / 2) / (window.innerHeight / window.innerWidth);
  setPagesPerView(singlePageFillRatio > doublePageFillRatio ? 1 : 2);
}

function onDOMContentLoaded() {
  document.querySelector('#select-folder')
      .addEventListener('mouseup', loadDirectory);
  document.querySelector('#adjust-parity')
      .addEventListener('mouseup', adjustParity);
  document.querySelector(LEFT_PAGE).addEventListener(
      'mouseup', onLeftPageClicked);
  document.querySelector(RIGHT_PAGE)
      .addEventListener('mouseup', onRightPageClicked);
  document.querySelector('body').addEventListener('keydown', onKeyDown);
  document.querySelector('#toggle-direction')
      .addEventListener('mouseup', toggleDirection);
  document.querySelector('#toggle-pages-shown')
      .addEventListener('mouseup', togglepagesPerView);
  document.querySelector('#go-to-first-page')
      .addEventListener('mouseup', goToFirstPage);
  window.addEventListener('resize', onResize);
}

// Service worker can be removed at chrome://serviceworker-internals
navigator.serviceWorker.register('service_worker.js');
document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
