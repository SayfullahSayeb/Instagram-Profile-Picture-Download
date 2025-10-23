// ==UserScript==
// @name               Instagram Profile Picture Downloader
// @namespace          https://github.com/SayfullahSayeb/Instagram-Profile-Picture-Download/
// @version            1.0.0
// @description        Download Instagram profile pictures in full resolution.
// @author             Sayfullah Sayeb
// @match              https://*.instagram.com/*
// @grant              GM_xmlhttpRequest
// @grant              GM_addStyle
// @grant              GM_notification
// @connect            i.instagram.com
// @require            https://code.jquery.com/jquery-3.7.1.min.js
// @icon               https://www.google.com/s2/favicons?domain=www.instagram.com&sz=32
// @license            GPL-3.0-only
// @compatible         firefox >= 100
// @compatible         chrome >= 100
// @compatible         edge >= 100
// ==/UserScript==

(function($) {
    'use strict';

    // SVG icons
    const SVG = {
        DOWNLOAD: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24px" viewBox="0 0 24 24" width="24px" fill="#000000"><g><rect fill="none" height="24" width="24"/></g><g><path d="M18,15v3H6v-3H4v3c0,1.1,0.9,2,2,2h12c1.1,0,2-0.9,2-2v-3H18z M17,11l-1.41-1.41L13,12.17V4h-2v8.17L8.41,9.59L7,11l5,5 L17,11z"/></g></svg>',
        OPEN: '<svg xmlns="http://www.w3.org/2000/svg" height="20" width="20" viewBox="0 0 24 24" fill="#000000"><path d="M14 3v2h3.59L10 12.59l1.41 1.41L19 6.41V10h2V3h-7z"/><path d="M5 5v14h14v-7h-2v5H7V7h5V5H5z"/></svg>'
    };

    // Add CSS styles
    GM_addStyle(`
        .IG_DWPROFILE {
            position: absolute;
            right: 5px;
            bottom: 5px;
            background: #fff;
            border-radius: 4px;
            padding: 2px;
            cursor: pointer;
            z-index: 999;
            filter: drop-shadow(0px 0px 2px rgba(0,0,0,0.5));
        }
        .IG_DWPROFILE:hover {
            background: #eee;
        }
        .IG_DWPROFILE svg {
            display: block;
            width: 20px;
            height: 20px;
        }
        /* New open-in-new-tab button, placed left of download */
        .IG_OPENPROFILE {
            position: absolute;
            right: 32px;
            bottom: 5px;
            background: #fff;
            border-radius: 4px;
            padding: 2px;
            cursor: pointer;
            z-index: 999;
            filter: drop-shadow(0px 0px 2px rgba(0,0,0,0.5));
        }
        .IG_OPENPROFILE:hover {
            background: #eee;
        }
        .IG_OPENPROFILE svg {
            display: block;
            width: 20px;
            height: 20px;
        }
    `);

    // Main functions
    function getUserId(username) {
        return new Promise((resolve, reject) => {
            let getURL = `https://www.instagram.com/web/search/topsearch/?query=${username}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                onload: function(response) {
                    let obj = JSON.parse(response.response);
                    let result = null;
                    obj.users.forEach(pos => {
                        if (pos.user.username?.toLowerCase() === username?.toLowerCase()) {
                            result = pos;
                        }
                    });

                    if (result != null) {
                        resolve(result);
                    } else {
                        getUserIdWithAgent(username).then((result) => {
                            resolve(result);
                        }).catch((err) => {
                            reject(err);
                        });
                    }
                },
                onerror: function(err) {
                    reject(err);
                }
            });
        });
    }

    function getUserIdWithAgent(username) {
        return new Promise((resolve, reject) => {
            let getURL = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                headers: {
                    'X-IG-App-ID': getAppID() || '936619743392459'
                },
                onload: function(response) {
                    try {
                        let obj = JSON.parse(response.response);
                        let hasUser = obj?.data?.user;

                        if (hasUser != null) {
                            resolve({ user: {
                                pk: hasUser.id,
                                username: hasUser.username,
                                profile_pic_url: hasUser.profile_pic_url_hd || hasUser.profile_pic_url
                            }});
                        } else {
                            reject('User not found');
                        }
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror: function(err) {
                    reject(err);
                }
            });
        });
    }

    function getAppID() {
        let result = null;
        $('script[type="application/json"]').each(function() {
            const regexp = /"APP_ID":"([0-9]+)"/ig;
            const matcher = $(this).text().match(regexp);
            if (matcher != null && result == null) {
                result = [...$(this).text().matchAll(regexp)];
            }
        });
        return (result) ? result.at(0).at(-1) : null;
    }

    function getUserHighSizeProfile(userId) {
        return new Promise((resolve, reject) => {
            let getURL = `https://i.instagram.com/api/v1/users/${userId}/info/`;

            GM_xmlhttpRequest({
                method: "GET",
                url: getURL,
                headers: {
                    'User-Agent': 'Instagram 219.0.0.12.117 Android',
                    'X-IG-App-ID': getAppID() || '936619743392459'
                },
                onload: function(response) {
                    try {
                        let obj = JSON.parse(response.response);
                        if (obj.status !== 'ok') {
                            reject('Failed to fetch profile picture');
                        } else {
                            // Get highest resolution URL available
                            const hdUrl = obj.user.hd_profile_pic_url_info?.url ||
                                        obj.user.hd_profile_pic_versions?.pop()?.url ||
                                        obj.user.profile_pic_url;
                            resolve(hdUrl);
                        }
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror: function(err) {
                    reject(err);
                }
            });
        });
    }

    async function onProfileAvatar(isDownload) {
        if (isDownload) {
            try {
                let username = location.pathname.replaceAll(/(reels|tagged)\/$/ig, '').split('/').filter(s => s.length > 0).at(-1);
                let userInfo = await getUserId(username);
                let date = new Date().getTime();
                let timestamp = Math.floor(date / 1000);

                try {
                    let dataURL = await getUserHighSizeProfile(userInfo.user.pk);
                    saveFiles(dataURL, username, timestamp);
                } catch (err) {
                    console.warn('Failed to get HD profile picture, falling back to standard resolution', err);
                    // Fallback to standard resolution if HD fetch fails
                    let fallbackURL = userInfo.user.profile_pic_url;
                    if (fallbackURL) {
                        saveFiles(fallbackURL, username, timestamp);
                    } else {
                        console.error('No profile picture URL available');
                    }
                }
            } catch (err) {
                console.error('Failed to download profile picture:', err);
                GM_notification({
                    text: 'Failed to download profile picture. Please try again.',
                    title: 'Download Failed',
                    timeout: 3000
                });
            }
        } else {
            if (!$('.IG_DWPROFILE').length && !$('.IG_OPENPROFILE').length) {
                let profileTimer = setInterval(() => {
                    if ($('.IG_DWPROFILE').length || $('.IG_OPENPROFILE').length) {
                        clearInterval(profileTimer);
                        return;
                    }

                    // Insert both buttons: open (left) and download (right)
                    $('header > *[class]:first-child > *[class] img[alt][draggable]').parent().parent().append(`<div title="Open Profile Picture in New Tab" class="IG_OPENPROFILE">${SVG.OPEN}</div>`);
                    $('header > *[class]:first-child > *[class] img[alt][draggable]').parent().parent().append(`<div title="Download Profile Picture" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                    $('header > *[class]:first-child > *[class] img[alt][draggable]').parent().parent().css('position', 'relative');

                    $('header > *[class]:first-child > *[class] img[alt]:not([draggable])').parent().parent().parent().append(`<div title="Open Profile Picture in New Tab" class="IG_OPENPROFILE">${SVG.OPEN}</div>`);
                    $('header > *[class]:first-child > *[class] img[alt]:not([draggable])').parent().parent().parent().append(`<div title="Download Profile Picture" class="IG_DWPROFILE">${SVG.DOWNLOAD}</div>`);
                    $('header > *[class]:first-child > *[class] img[alt]:not([draggable])').parent().parent().parent().css('position', 'relative');
                }, 150);
            }
        }
    }

    function saveFiles(downloadLink, username, timestamp) {
        fetch(downloadLink)
            .then(res => res.blob())
            .then(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${username}_profile_${timestamp}.jpg`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            })
            .catch(err => console.error('Download failed:', err));
    }

    // Event listeners
    $(function() {
        // Check if we're on a profile page
        setInterval(() => {
            if (
                $('header > *[class]:first-child img[alt]').length &&
                location.pathname.match(/^(\/)([0-9A-Za-z\.\-_]+)\/?(tagged|reels|saved)?\/?$/ig) &&
                !location.pathname.match(/^(\/explore\/?$|\/stories(\/.*)?$|\/p\/)/ig)
            ) {
                onProfileAvatar(false);
            }
        }, 1000);

        // Click event for download button
        $('body').on('click', '.IG_DWPROFILE', function(e) {
            e.stopPropagation();
            onProfileAvatar(true);
        });

        // Click event for open-in-new-tab button
        $('body').on('click', '.IG_OPENPROFILE', async function(e) {
            e.stopPropagation();
            try {
                let username = location.pathname.replaceAll(/(reels|tagged)\/$/ig, '').split('/').filter(s => s.length > 0).at(-1);
                let userInfo = await getUserId(username);
                try {
                    let dataURL = await getUserHighSizeProfile(userInfo.user.pk);
                    window.open(dataURL, '_blank');
                } catch (err) {
                    console.warn('Failed to get HD profile picture for opening, falling back', err);
                    let fallbackURL = userInfo.user.profile_pic_url;
                    if (fallbackURL) {
                        window.open(fallbackURL, '_blank');
                    } else {
                        GM_notification({
                            text: 'No profile picture available to open.',
                            title: 'Open Failed',
                            timeout: 3000
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to open profile picture:', err);
                GM_notification({
                    text: 'Failed to open profile picture. Please try again.',
                    title: 'Open Failed',
                    timeout: 3000
                });
            }
        });
    });

})(jQuery);
