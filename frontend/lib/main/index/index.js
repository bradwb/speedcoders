/**
 * Main index
 *
 * Copyright (c) 2012 Knewton
 * Dual licensed under:
 *  MIT: http://www.opensource.org/licenses/mit-license.php
 *  GPLv3: http://www.opensource.org/licenses/gpl-3.0.html
 */
/*jslint browser: true, maxerr: 50, indent: 4, maxlen: 79 */
(function ($) {
    "use strict";

    //------------------------------
    //
    // Constants
    //
    //------------------------------

    //------------------------------
    //
    // Properties
    //
    //------------------------------

    var isPolling = false,
        pollTime = 1000,
        pollId;

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    //------------------------------
    //
    // Event bindings
    //
    //------------------------------

    function gameUpdate(data) {
        if (!isPolling) {
            pollId = setInterval(function () {
                $.api("gamestate");
            }, pollTime);
        }
        $.deeplink.loaded();
    }

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    //------------------------------
    // Routes
    //------------------------------

    $.route("#/", function () {
        $.api("gamestate");
    });

    $.deeplink.on("loading", function () {
        if (isPolling) {
            isPolling = false;
            clearInterval(pollId);
            pollId = null;
        }
    });

    //------------------------------
    // API
    //------------------------------

    $.api("gamestate", gameUpdate);
    $.api.failure(function (call, code, data) {
        switch (code) {

        case 401:
            window.location = data.url;
            break;
        }
    });


}(window.jQuery));

