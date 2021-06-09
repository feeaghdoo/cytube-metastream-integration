// ==UserScript==
// @name         Metastream-in-Cytube cleanup
// @namespace    https://apothes.is/
// @version      0.1
// @description  improves metastream as an iframe in cytube
// @author       FD
// @match        https://app.getmetastream.com/*
// @match        https://cytu.be/r/*
// @match        https://youtube.googleapis.com/embed/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    //a lot of stuff isn't there at DOMContentLoaded so you have to use mutation observers to do things to them
    function doThingToDynamicallyAddedNode(nodeSelector, staticAncestorSelector, thing) {
        var targetNodes = document.querySelectorAll(nodeSelector);
        if (targetNodes.length > 0) {
            //if it's already available, act on it
            for (var i = 0; i < targetNodes.length; targetNodes++) {
                thing(targetNodes[i]);
            }
        }
        //not already available, add observer to available ancestor to remove it when it gets added
        var targetObserver = new MutationObserver(function(mutationsList, observer) {
            for (var mutation of mutationsList) {
                for (var addedNode of mutation.addedNodes) {
                    if (addedNode.nodeType == Node.ELEMENT_NODE) {
                        //an entire node tree can be added, so you have to query through the added node and its children
                        targetNodes = addedNode.parentNode.querySelectorAll(nodeSelector);
                        //act on it
                        for (var i = 0; i < targetNodes.length; targetNodes++) {
                            thing(targetNodes[i]);
                        }
                    }
                }
            }
        });
        targetObserver.observe(document.querySelector(staticAncestorSelector), { childList: true, subtree: true });
    }

    if (window.location.href.indexOf('https://cytu.be') === 0) {
        window.addEventListener("message", function(event) {
            if (event.origin === "https://app.getmetastream.com") {
                if (event.data === "query username") {
                    var username = window.CLIENT ? window.CLIENT.name : null;
                    if (!username) {
                        username = '';
                    }
                    event.source.postMessage("username: " + username, "https://app.getmetastream.com");
                }
            } else if (event.origin === "https://youtube.googleapis.com") {
                if (event.data === "query quality") {
                    var quality = window.USEROPTS ? window.USEROPTS.default_quality : null;
                    if (!quality) {
                        quality = 'auto';
                    }
                    event.source.postMessage("quality: " + username, "https://youtube.googleapis.com");
                }
            }
        });
    } else if (window.location.href.indexOf('https://app.getmetastream.com/?p=/join/') === 0 || window.location.href.indexOf('https://app.getmetastream.com/join/') === 0) {
        //only in iframed metastream sessions
        if (window.parent) {
            window.addEventListener("message", function(event) {
                if (event.origin === "https://cytu.be") {
                    if (event.data.indexOf("username: ") === 0) {
                        var usernameTextField = document.querySelector('#profile_username');
                        if (usernameTextField) {
                            usernameTextField.value = event.data.substr("username: ".length);
                            var e = { target: usernameTextField };
                            usernameTextField[Object.getOwnPropertyNames(usernameTextField).filter(a => a.indexOf("__reactEventHandlers") == 0)[0]].onChange(e);
                            /*var a = new Event("change");
                            usernameTextField.dispatchEvent(a);*/
                            var usernameSubmitButton = document.querySelector('#getstarted');
                            if (usernameSubmitButton) {
                                window.setTimeout(() => usernameSubmitButton.click(), 100);
                            }
                        }
                    }
                }
            });

            function cleanUpMetastream() {
                var styleEl = document.createElement('style');
                document.head.appendChild(styleEl);
                var styleSheet = styleEl.sheet;
                //remove junk
                styleSheet.insertRule("[class^='GameLobby__chatFloat'] { display: none; }");
                styleSheet.insertRule("[class^='GameLobby__titlebar'] { display: none; }");
                styleSheet.insertRule("#userlist [class^='PanelHeader__actions'] { display: none; }");

                doThingToDynamicallyAddedNode('[href="/assets/icons/undock-float.svg#undock-float"], #profile_username', "body", function(node) {
                    //click button to make UI undocked
                    if (node && node.parentNode.querySelector('[href="/assets/icons/undock-float.svg#undock-float"]')) {
                        node.parentNode.parentNode.click();
                    //autologin
                    } else if (node && node.id == 'profile_username') {
                        window.parent.postMessage("query username", "https://cytu.be");
                    }
                });
            }
            //SPA, have to make sure it's run every pseudo-pageload
            window.addEventListener("popstate", cleanUpMetastream);
            cleanUpMetastream();
        }
    } else if (window.location.href.indexOf('https://youtube.googleapis.com/embed/') === 0) {
        if (window.parent) {
            window.addEventListener("message", function(event) {
                if (event.origin === "https://cytu.be") {
                    if (event.data.indexOf("quality: ") === 0) {
                        var ytQualityOptions = document.querySelector('.html5-video-player').getAvailableQualityLevels();
                        var ytQualityOptionTranslation = {'highres': 4320, 'hd2160': 2160, 'hd1440': 1440, 'hd1080': 1080, 'hd720': 720, 'large': 480, 'medium': 360, 'small': 240, 'tiny': 144 };
                        var ctQuality = event.data.substr("quality: ".length);
                        var ytQuality = "auto";
                        if (ctQuality && ctQuality !== "auto" && ctQuality !== "best") {
                            ctQuality = parseInt(ctQuality);
                            for (var i = 0; i < ytQualityOptions.length; i++) {
                                if (ctQuality >= ytQualityOptionTranslation[ytQualityOptions[i]]) {
                                    ytQuality = ytQualityOptions[i];
                                    break;
                                }
                            }
                        } if (ctQuality === "best") {
                            ytQuality = ytQualityOptions[0];
                        }
                    }
                    document.querySelector('.html5-video-player').setPlaybackQualityRange(ytQuality);
                    console.log("set playback quality range to " + ytQuality);
                }
            });
            doThingToDynamicallyAddedNode('.html5-video-player', "body", function(node) {
                var stateChangeListener = document.querySelector('.html5-video-player').addEventListener('stateChange', function(e) {
                    if (e.data === 1) {
                        document.querySelector('.html5-video-player').removeEventListener('stateChange', stateChangeListener);
                        window.top.postMessage("query quality", "https://cytu.be");
                    }
                });
            });
        }
    }
})();
