'use strict'

const browser = require('webextension-polyfill')

async function findUrlForContext (context) {
  if (context) {
    if (context.linkUrl) {
      // present when clicked on a link
      return context.linkUrl
    }
    if (context.srcUrl) {
      // present when clicked on page element such as image or video
      return context.srcUrl
    }
    if (context.pageUrl) {
      // pageUrl is the root frame
      return context.pageUrl
    }
  }
  // falback to the url of current tab
  const currentTab = await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
  return currentTab.url
}

module.exports.findUrlForContext = findUrlForContext

const contextMenuUploadToIpfs = 'contextMenu_UploadToIpfs'
const contextMenuCopyCanonicalAddress = 'panelCopy_currentIpfsAddress'
const contextMenuCopyAddressAtPublicGw = 'panel_copyCurrentPublicGwUrl'

function createContextMenus (getState, ipfsPathValidator, { onUploadToIpfs, onCopyCanonicalAddress, onCopyAddressAtPublicGw }) {
  browser.contextMenus.create({
    id: contextMenuUploadToIpfs,
    title: browser.i18n.getMessage(contextMenuUploadToIpfs),
    contexts: ['image', 'video', 'audio'],
    documentUrlPatterns: ['<all_urls>'],
    enabled: false,
    onclick: onUploadToIpfs
  })

  browser.contextMenus.create({
    id: contextMenuCopyCanonicalAddress,
    title: browser.i18n.getMessage(contextMenuCopyCanonicalAddress),
    contexts: ['page', 'image', 'video', 'audio', 'link'],
    documentUrlPatterns: ['*://*/ipfs/*', '*://*/ipns/*'],
    onclick: onCopyCanonicalAddress
  })

  browser.contextMenus.create({
    id: contextMenuCopyAddressAtPublicGw,
    title: browser.i18n.getMessage(contextMenuCopyAddressAtPublicGw),
    contexts: ['page', 'image', 'video', 'audio', 'link'],
    documentUrlPatterns: ['*://*/ipfs/*', '*://*/ipns/*'],
    onclick: onCopyAddressAtPublicGw
  })

  return {
    async update (changedTabId) {
      try {
        await browser.contextMenus.update(contextMenuUploadToIpfs, {enabled: getState().peerCount > 0})
        if (changedTabId) {
          // recalculate tab-dependant menu items
          const currentTab = await browser.tabs.query({active: true, currentWindow: true}).then(tabs => tabs[0])
          if (currentTab && currentTab.id === changedTabId) {
            const ipfsContext = ipfsPathValidator.isIpfsPageActionsContext(currentTab.url)
            browser.contextMenus.update(contextMenuCopyCanonicalAddress, {enabled: ipfsContext})
            browser.contextMenus.update(contextMenuCopyAddressAtPublicGw, {enabled: ipfsContext})
          }
        }
      } catch (err) {
        console.log('[ipfs-companion] Error updating context menus', err)
      }
    }

    // TODO: destroy?
  }
}

module.exports.createContextMenus = createContextMenus
