//@ts-check

const pageHandles = [];
const LEFT_PAGE = '#left-page';
const RIGHT_PAGE = '#right-page';
let currentPageIndex = 0;

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

function showPage(index) {
  if (index >= pageHandles.length) {
    return;
  }
  currentPageIndex = index;
  setPage(RIGHT_PAGE, pageHandles[index]);

  if (index + 1 >= pageHandles.length) {
    document.querySelector(LEFT_PAGE).src = '';
    return;
  }
  setPage(LEFT_PAGE, pageHandles[index + 1]);
}

async function loadDirectory() {
  const dir = await window.chooseFileSystemEntries({type: 'openDirectory'});
  pageHandles.length = 0;
  for await (const entry of dir.getEntries()) {
    pageHandles.push(entry);
  }
  pageHandles.sort((handle1, handle2) => {
    return handle1.name.localeCompare(handle2.name);
  })
  showPage(0);
}

function adjustParity() {
  if (currentPageIndex % 2 == 0) {
    showPage(Math.min(pageHandles.length, currentPageIndex + 1));
  } else {
    showPage(Math.max(0, currentPageIndex - 1));
  }
}

function showNextPage() {
  showPage(Math.min(pageHandles.length, currentPageIndex + 2));
}

function showPreviousPage() {
  showPage(Math.max(0, currentPageIndex - 2));
}

function onDOMContentLoaded() {
  document.querySelector('#select-folder')
      .addEventListener('mouseup', loadDirectory);
  document.querySelector('#adjust-parity')
      .addEventListener('mouseup', adjustParity);
  document.querySelector(LEFT_PAGE).addEventListener('mouseup', showNextPage);
  document.querySelector(RIGHT_PAGE)
      .addEventListener('mouseup', showPreviousPage);
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
