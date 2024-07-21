const SERVERS_WITH_DISPOSABLE_TOKENS = [
  's95951.cdn.ngenix.net', // Wink
  'api2.hbogoasia.com/onwards-widevine',
  'prepladder.com',
  'scvm1sc0.anycast.nagra.com',
  'wvls/contentlicenseservice/v1/licenses',
  'license.vdocipher.com/auth',
];

const tabIDs = {};
const textDecoder = new TextDecoder();

let os = null;
chrome.runtime.getPlatformInfo(function (info) {
  os = info.os;
});

function requestToClipboard(tabId) {
  const STREAMYX_PATH = os === 'win' ? '.\\streamyx.exe' : './streamyx';

  chrome.tabs.get(tabId, (details) => {
    const lic_headers = tabIDs[details.id].license_request[0]?.license_headers;
    const lic_url = tabIDs[details.id].license_url;
    const lic_data_json = tabIDs[details.id].license_data;
    const widevine_pssh = tabIDs[details.id].pssh;
    const kid = tabIDs[details.id].kid;
    if (!widevine_pssh || !kid) return;

    // Fetching the user's ip for setting the header X-Forwarded-For.
    // This might help to bypass regional restrictions when performing the license request in some cases.

    const ip_retrieve_link = 'https://ipinfo.io/ip';

    var get_ip = new XMLHttpRequest();
    get_ip.open('GET', ip_retrieve_link, true);
    get_ip.onload = function () {
      var ip_resposnse = this.responseText;
      console.log(ip_resposnse);

      var i = 0;

      let command = `${STREAMYX_PATH} `;

      // Append Widevine license URL
      command += `"${lic_url}"`;

      // Append license request headers
      for (; i < lic_headers.length; ++i) {
        const { name, value } = lic_headers[i];
        if (name.toLowerCase() === 'origin') continue;
        command += ` -H "${name.toLowerCase()}: ${value.replaceAll(`"`, `'`)}"`;
      }
      if (!ip_resposnse.includes('403 Forbidden')) command += ` -H "x-forwarded-for: ${ip_resposnse}"`;

      // Append PSSH
      command += ` --pssh "${widevine_pssh}"`;

      // Append license data template
      const commands = {
        windowsPowerShell: command,
        windowsCommandPrompt: command,
        unix: command,
      };
      if (lic_data_json && lic_data_json.startsWith('{')) {
        const windowsPowerShell = `'"${lic_data_json.replaceAll('"', '""')}"'`;
        const windowsCommandPrompt = `"${lic_data_json.replaceAll('"', '""')}"`;
        const unix = `"${lic_data_json.replaceAll(`"`, `\\"`)}"`;
        const prefix = ' --drm-template ';

        commands.windowsPowerShell += prefix + windowsPowerShell;
        commands.windowsCommandPrompt += prefix + windowsCommandPrompt;
        commands.unix += prefix + unix;
      }

      const notificationId = `${kid || widevine_pssh}`;
      const actions =
        os === 'win'
          ? [{ title: 'Copy command for PowerShell' }, { title: 'Copy command for Command Prompt' }]
          : [{ title: 'Copy command' }];
      chrome.notifications.create(notificationId, {
        type: 'basic',
        title: `Streamyx: ${new URL(lic_url).host}`,
        message: `Key ID: ${kid}`,
        iconUrl: 'icon128.png',
        buttons: actions,
      });

      chrome.notifications.onButtonClicked.addListener(function (id, buttonIndex) {
        if (id === notificationId) {
          let dataToCopy = '';
          if (os === 'win') {
            if (buttonIndex === 0) dataToCopy = commands.windowsPowerShell;
            else if (buttonIndex === 1) dataToCopy = commands.windowsCommandPrompt;
          } else {
            if (buttonIndex === 0) dataToCopy = commands.unix;
          }

          // Copy to clipboard
          const copyText = document.createElement('textarea');
          copyText.style.position = 'absolute';
          copyText.style.left = '-5454px';
          copyText.style.top = '-5454px';
          copyText.style.opacity = 0;
          document.body.appendChild(copyText);
          copyText.value = dataToCopy;
          copyText.select();
          document.execCommand('copy');
          document.body.removeChild(copyText);
        }
      });
    };
    get_ip.send();
  });
}

function getLicenseRequestData(details) {
  tabIDs[details.tabId] = tabIDs[details.tabId] || {};
  if (details.requestBody && details.requestBody.raw && details.method == 'POST') {
    for (var j = 0; j < details.requestBody.raw.length; ++j) {
      try {
        const decodedString = textDecoder.decode(details.requestBody.raw[j].bytes);
        const encodedString = btoa(unescape(encodeURIComponent(decodedString)));

        // If the license request does not uses json payloads the data has been sent in raw format.
        // But the base64 encoded format of it will have the characters "CAES".
        if (encodedString.includes('CAES')) {
          tabIDs[details.tabId].license_data = `$'\\u0008\\u0004'`;
          tabIDs[details.tabId].license_url = details.url;
          tabIDs[details.tabId].req_id = details.requestId;

          // If the license request uses json payloads the charcters "CAES" will be there in almost all cases.
        } else if (
          decodedString.includes('CAES') ||
          (details.url.includes('license') && decodedString.includes('token') && decodedString.length > 4000) ||
          decodedString.includes('8,1,18')
        ) {
          const challengePart = decodedString.split('"CAES')[1]?.split('"')[0];
          const challenge = 'CAES' + challengePart;
          const licenseTemplate = decodedString.replace(challenge, '{{challenge}}');
          tabIDs[details.tabId].license_data = challengePart ? licenseTemplate : decodedString;
          tabIDs[details.tabId].license_url = details.url;
          tabIDs[details.tabId].req_id = details.requestId;
        } else {
          return;
        }
      } catch (e) {
        console.error(e);
      }
    }
  } else if (details.requestBody && details.requestBody.formData && details.method == 'POST') {
    try {
      if (details.requestBody.formData.widevine2Challenge) {
        const challenge = String(details.requestBody.formData.widevine2Challenge);
        if (challenge.includes('CAES')) {
          const decodedString = `widevine2Challenge=${challenge}&includeHdcpTestKeyInLicense=true`;
          tabIDs[details.tabId].license_data = decodedString;
          tabIDs[details.tabId].license_url = details.url;
          tabIDs[details.tabId].req_id = details.requestId;
        }
      } else {
        return;
      }
    } catch (e) {
      console.error(e);
    }
  }
}
chrome.webRequest.onBeforeRequest.addListener(
  getLicenseRequestData,
  { urls: ['<all_urls>'], types: ['xmlhttprequest'] },
  ['requestBody']
);

function getLicenseRequestHeaders(details) {
  if (
    details.method == 'POST' &&
    tabIDs[details.tabId] &&
    tabIDs[details.tabId].license_url === details.url &&
    tabIDs[details.tabId].req_id === details.requestId
  ) {
    if (!tabIDs[details.tabId].license_request) tabIDs[details.tabId].license_request = [];
    tabIDs[details.tabId].license_request.push({ license_headers: details.requestHeaders });
    requestToClipboard(details.tabId);

    // Some license requests can hold one time token values in their headers or payload. So blocking such requests before they are sent to the server and capturing them!
    // If your license request also holds one time values add them in the below line, seprating by an || operator. Remember to disable the extension if you actually need to play the video of these services!
    const shouldBlockRequest = SERVERS_WITH_DISPOSABLE_TOKENS.some(
      (server) => details.url.includes(server) || details.requestHeaders.includes(server)
    );
    if (shouldBlockRequest) return { cancel: true };
  }
}
chrome.webRequest.onBeforeSendHeaders.addListener(
  getLicenseRequestHeaders,
  { urls: ['<all_urls>'], types: ['xmlhttprequest'] },
  ['requestHeaders', 'blocking', 'extraHeaders']
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!request || !sender.tab) return;
  tabIDs[sender.tab.id] = tabIDs[sender.tab.id] || {
    license_data: '',
    license_request: [],
    license_url: '',
    req_id: '',
  };
  if (request.pssh) tabIDs[sender.tab.id].pssh = request.pssh;
  if (request.kid) tabIDs[sender.tab.id].kid = request.kid;
  requestToClipboard(sender.tab.id);
});
