// Plain script, not bundled: this page exists so the permission prompt has a normal
// tab to appear in. Manifest V3 forbids inline scripts on extension pages.
const button = document.getElementById('grant');
const status = document.getElementById('status');

button.addEventListener('click', () => {
  chrome.permissions
    .request({ origins: ['*://*/*'] })
    .then((granted) => {
      status.textContent = granted
        ? 'Access granted. Close this tab and use the side panel.'
        : 'Request declined. The side panel cannot read pages without it.';
    })
    .catch((error) => {
      status.textContent = `Request failed: ${error.message}`;
    });
});
