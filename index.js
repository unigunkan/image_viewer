//@ts-check

// - Need to serve this on localhost for the API to work.
// - Explainer:
//   https://github.com/WICG/native-file-system/blob/master/EXPLAINER.md
// - Need to enable chrome://flags#native-filesystem-api in Chrome Canary
// - chooseFileSystemEntries() needs a user gesture

// debug globals
let i;
let d;

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

function initTestGlobals() {
  i = document.querySelector('#image');
}

async function selectFolder() {
  return self.chooseFileSystemEntries({type: 'openDirectory'});
}

/**
 * @param {FileSystemBaseHandle} handle
 * @returns {Promise<FileSystemFileHandle>}
 */
async function getFirstImageInNestedDir(handle) {
  if (handle.isFile) {
    return handle;
  }
  let firstEntry;
  for await (const entry of handle.getEntries()) {
    firstEntry = firstEntry || entry;
  }
  return firstEntry.isFile ? firstEntry : getFirstImageInNestedDir(firstEntry);
}

async function loadCoverImages() {
  const dir = await self.chooseFileSystemEntries({type: 'openDirectory'});
  const coverDivPromises = [];
  for await (const entry of dir.getEntries()) {
    coverDivPromises.push(new Promise((resolve, reject) => {
      getFirstImageInNestedDir(entry).then(
          imageHandle => resolve(createCoverDiv(entry, imageHandle)));
    }));
  }
  const coverDivs = await Promise.all(coverDivPromises);
  coverDivs.sort((div1, div2) => {
    return div1.handle.name.localeCompare(div2.handle.name);
  });
  const fragment = document.createDocumentFragment();
  for (const div of coverDivs) {
    fragment.append(await div);
  }
  document.querySelector('#books').innerHTML = '';
  document.querySelector('#books').append(fragment);
}

async function createCoverDiv(handle, fileHandle) {
  const image = new Image();
  image.src = await getImageSrc(fileHandle);
  const div = document.createElement('div');
  div.className = 'book';
  div.append(image);
  div.handle = handle;
  return div;
}

function onDOMContentLoaded() {
  initTestGlobals();
  document.querySelector('#select-folder')
      .addEventListener('mouseup', loadCoverImages);
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
