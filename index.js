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
 * Not used
 * @param {Uint8Array} input
 */
function encode(input) {
  var keyStr =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var output = '';
  var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
  var i = 0;

  while (i < input.length) {
    chr1 = input[i++];
    chr2 = i < input.length ? input[i++] : Number.NaN;  // Not sure if the index
    chr3 =
        i < input.length ? input[i++] : Number.NaN;  // checks are needed here

    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }
    output += keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) +
        keyStr.charAt(enc4);
  }
  return output;
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
  for await (const entry of dir.getEntries()) {
    getFirstImageInNestedDir(entry).then(
        imageHandle => testAddImage(imageHandle));
  }
}

async function testAddImage(fileHandle) {
  console.log('start');
  const image = new Image();
  image.src = await getImageSrc(fileHandle);
  document.querySelector('#images').prepend(image);
  console.log('end');
}

async function testAddImages() {
  const dir = await self.chooseFileSystemEntries({type: 'openDirectory'});
  const entries = [];
  for await (const entry of dir.getEntries()) {
    entries.push(entry);
  }
  for (const entry of entries) {
    if (entry.isFile) {
      testAddImage(entry);
    }
  }
}

function onDOMContentLoaded() {
  initTestGlobals();
  document.querySelector('#select-folder')
      .addEventListener('mouseup', loadCoverImages);
}

document.addEventListener('DOMContentLoaded', onDOMContentLoaded);
