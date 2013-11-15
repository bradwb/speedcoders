/**
 * Whitelabel application
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

        /**
         * The date format for updates.
         */
    var DATE_FORMAT = "M j Y h:i A",

        /**
         * The selectors for finding wizard steps.
         */
        WIZ_SEARCH = [
            "[data-wizard-step*={0}]",
            "[data-wizard-not]:not([data-wizard-not*={0}])"
        ].join(", "),
        WIZ_LAST = $.strf(WIZ_SEARCH, "last"),
        RX_CLEAR_NUMERIC = /[^0-9\.\-]*/g,

    //------------------------------
    // Uploader
    //------------------------------

        UPLOADER_TEMPLATE = '<div class="qq-uploader">' +
            '<span class="hide"><span class="qq-drop-processing">' +
            '<span>{dropProcessingText}</span>' +
            '<span class="qq-upload-status-text hide">{statusText}</span>' +
            '<span class="qq-drop-processing-spinner"></span></span></span>' +
            '<ul class="qq-upload-list spacer-top"></ul></div>',
        UPLOADER_ICON = '<i class="icon-plus icon-white"></i>&nbsp;',

    //------------------------------
    // Links
    //------------------------------

        /**
         * Classes which indicate disabled links.
         * @type {string}
         */
        DISABLED = ".disabled, .inactive",

    //------------------------------
    // Third party includes
    //------------------------------

        /**
         * URL for including typekits.
         * @type {string}
         */
        TYPEKIT_URL = "https://use.typekit.net/{}.js",

        /**
         * URL for including mathjax.
         * @type {string}
         */
        MATHJAX_URL = "https://c328740.ssl.cf1.rackcdn.com/mathjax/latest/MathJax.js?{}",

        /**
         * URL for including ckeditor.
         * @type {string}
         */
        CKEDITOR_URL = "https://s3.amazonaws.com/knewton.marketing/ckeditor/{}/ckeditor.js",
        CKEDITOR_JQUERY_URL = "https://s3.amazonaws.com/knewton.marketing/ckeditor/{}/adapters/jquery.js",

    //------------------------------
    // Bootstrap
    //------------------------------

        SPANS = "span" + [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].join(" span"),

    //------------------------------
    //
    // Properties
    //
    //------------------------------

        /**
         * All the fixed table headers.
         */
        fixedHeaders = $(),

        /**
         * The queue for loading mathjax typesetters before it loads.
         * @type {jQuery}
         */
        mathjaxQueue = $();

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    //------------------------------
    // Utility
    //------------------------------

    function uuid() {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
            .replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0;
                if (c !== "x") {
                    r = r & 0x3 | 0x8;
                }
                return r.toString(16);
            });
    }


    /**
     * Returns the full name for the given user identity.
     * @param {Object} u The user identity.
     */
    function userFullName(u) {
        if (u) {
            if (u.first_name && u.last_name) {
                return $.strf("{} {}", u.first_name, u.last_name);
            }

            if (u.id) {
                return "[" + u.id + "]";
            }
        } else {
            return "(Unknown Unknown)";
        }
    }

    //------------------------------
    // Application
    //------------------------------

    /**
     * Show a loaded application.
     */
    function loadApplication() {
        $(".application-pane").show();
        $(".application-loading").hide();
    }

    //------------------------------
    // Authentication
    //------------------------------

    /**
     * Handles an authenticated user.
     * @param {Object} u The user identity.
     */
    function authenticated(u) {
        if (!$.whitelabel.authEveryTime) {
            loadApplication();
        }

        $(".when-authenticated").removeClass("hide");
        if (u !== null) {
            u.full_name = userFullName(u);
            $.update({
                ".user-first-name": {
                    text: u.first_name
                },
                ".user-last-name": {
                    text: u.last_name
                },
                ".user-full-name": {
                    text: u.full_name
                },
                ".user-email": {
                    text: u.email
                }
            });
            $("#user-profile, .user-profile").show();

            if ($.whitelabel.doLocalize) {
                // It's okay if this is empty, there's a default language
                $.setLanguage(u.language);
            }
        } else if ($.whitelabel.doLocalize) {
            // Use the default language
            $.setLanguage();
        }
    }

    //------------------------------
    // Links
    //------------------------------

    /**
     * Determine if the selector matches the element or a parent.
     * @param {jQuery} e The element.
     * @param {string} sel The selector.
     * @return {jQuery?} The matcher, if any.
     */
    function inStack(e, sel) {
        var o = null;

        if (e.is(sel)) {
            o = e;
        } else {
            o = e.parents(sel);
            if (!o.length) {
                o = null;
            }
        }

        return o;
    }

    /**
     * .inactive and .disabled clicks do nothing, unless it's a disabled <a>
     * combined with a special click (ctrl/meta/middle-mouse)
     * @param {Event} event The click event.
     */
    function bodyClick(event) {
        var e = inStack($(event.target), ".inactive, .disabled"),
            special = (event.ctrlKey || event.metaKey || event.which === 2);

        // Allow disabled anchor tags with special click to go through.
        if (e && !(e.is("a.disabled") && special)) {
            event.preventDefault();
        }
    }

    function thirdPartyInclude(name, url, fn) {
        var e = $($.strf("meta[name={}]", name));
        if (e.length) {
            $.holdReady(true);
            $.getScript($.strf(url, e.attr("content")), function () {
                if ($.isFunction(fn)) {
                    fn();
                }
                $.holdReady();
            });
            e.remove();
        }
    }

    /**
     * Includes third party scripts after load.
     */
    function includeThirdParty() {
        thirdPartyInclude("mathjax", MATHJAX_URL, function () {
            MathJax.Hub.Config({
                tex2jax: {inlineMath: [['$_','$_']]}
            });
            mathjaxQueue.mathjax();
        });
        thirdPartyInclude("typekit", TYPEKIT_URL, function () {
            try { Typekit.load(); } catch (e) {}
        });
        thirdPartyInclude("ckeditor", CKEDITOR_URL, function() {
            thirdPartyInclude("ckeditor_jquery", CKEDITOR_JQUERY_URL,
                    function() {});
        });
    }

    function getQueryParams() {
        var path = window.location.search;
        if (path.substr(-1) === "/") {
            // Some odd bug adds a trailing slash to the search when using
            // a port. Strip the slash before testing. If you want to use
            // a slash in your query params... don't.
            path = path.slice(0, -1);
        }

        return $.deparam(path.substr(1));
    }

    function fluidApplication(not) {
        if (not) {
            $(".wl-container")
                .removeClass("container-fluid")
                .addClass("container");
            $(".wl-row")
                .removeClass("row-fluid")
                .addClass("row");
        } else {
            $(".wl-container")
                .removeClass("container")
                .addClass("container-fluid");
            $(".wl-row")
                .removeClass("row")
                .addClass("row-fluid");
        }
    }

    function customErrors() {
        $("body").addClass("custom-errors");
    }

    function framedApplication() {
        $("body").addClass("framed-application");
    }

    function largeContainers() {
        $("body").addClass("large-containers");
        $(".wl-row").removeClass("row").addClass("row-fluid");
    }

    function ucwords (str) {
        // http://kevin.vanzonneveld.net
        return (str + '')
                .replace(/^([a-z\u00E0-\u00FC])|\s+([a-z\u00E0-\u00FC])/g,
                        function (m) { return m.toUpperCase(); });
    }

    function columnApplication(left, center, right, fluid, flush, grail, cb) {
        fluid = Boolean(fluid);
        flush = Boolean(flush);
        grail = Boolean(grail);

        // ColumnBorder
        cb = parseInt(cb, 10);

        var leftRel = false,
            centerRel = false,
            rightRel = false,
            total = 0,
            hasLeft = false,
            hasCenter = false,
            hasRight = false;

        if (typeof left === "string") {
            leftRel = left.substr(-2) === "px" ||
                    right.substr(-1) === "%";
        }
        if (typeof center === "string") {
            centerRel = center.substr(-2) === "px" ||
                    center.substr(-1) === "%";
        }
        if (typeof right === "string") {
            rightRel = right.substr(-2) === "px" ||
                    right.substr(-1) === "%";
        }

        if (!leftRel) {
            left = parseInt(left, 10) || -1;
            hasLeft = left > -1;
        } else {
            hasLeft = true;
        }

        if (!centerRel) {
            center = parseInt(center, 10) || -1;
            hasCenter = left > -1;
        } else {
            hasCenter = true;
        }

        if (!rightRel) {
            right = parseInt(right, 10) || -1;
            hasRight = left > -1;
        } else {
            hasRight = true;
        }

        $("#body-wrapper")
            .addClass("row" + (fluid ? "-fluid" : "") +
                    (flush ? " no-space" : ""));

        if (hasLeft) {
            if (leftRel) {
                $("#application-left").css("width", left);
            } else {
                $("#application-left").addClass("span" + left);
            }
        } else {
            $("#application-left").remove();
        }

        if (hasCenter) {
            if (centerRel) {
                if (!grail) {
                    $("#application-body").css("width", center);
                }
            } else {
                $("#application-body").addClass("span" + center);
            }
        } else {
            $("#application-body").remove();
        }

        if (hasRight) {
            if (rightRel) {
                $("#application-right").css("width", right);
            } else {
                $("#application-right").addClass("span" + right);
            }
        } else {
            $("#application-right").remove();
        }

        if (grail) {
            $("body").addClass("grail-columns");
            right = parseInt(right, 10) + cb;
            left = parseInt(left, 10) + cb;
            total += left + right;

            $("#column-wrapper").css("left", total);
            $("#body-wrapper").css("marginLeft", -1 * right);

            $("#application-body").css({
                marginLeft: left,
                marginRight: right
            }).wrap($$("div#content-wrapper").css("right", left));
            // Need to move the content-wrapper to be first.
            $("#content-wrapper").parent()
                .prepend($("#content-wrapper").detach());
        }
    }

    function fixedTableHeaders(dTable) {
        var table = $(dTable[0]),
            headers;

        if (!table.hasClass("fixed-headers")) {
            headers = table.find("thead").children().clone(true)
                .appendTo("#fixed-headers").find("th").on("click",
                    function () {
                        table.find("tr:eq(0)").children().show().each(function (i, v) {
                            headers.eq(i)
                                .removeClass("sorting_asc sorting_desc sorting")
                                .addClass(v.className);
                            $(":focus").blur();
                        });
                    });
            table.data("headers", headers).addClass("fixed-headers").show();
            fixedHeaders = fixedHeaders.add(headers);
        } else {
            headers = table.data("headers").show().children().find("th");
        }

        table.find("tr:eq(0)").children().show().each(function (i, v) {
            headers.eq(i).css("width", $(v).width())
                .removeClass("sorting_asc sorting_desc sorting")
                .addClass(v.className);
        });
    }

    function preventDefault(event) {
        event.preventDefault();
    }

    function shadeClick(event) {
        event.preventDefault();

        if ($.whitelabel.deeplinkShades) {
            if ($.deeplink.query.hshade) {
                $.setRoute("?hshade=");
            } else {
                $.setRoute("?hshade=true");
            }
        } else {
            $("body").toggleClass("header-shade-open");
            $("#header-shade").toggle();
        }
    }

    function infoClick(event) {
        event.preventDefault();
        if ($.whitelabel.deeplinkShades && $.whitelabel.deeplinkInfoShade) {
            if ($.deeplink.query.ishade) {
                $.setRoute("?ishade=");
            } else {
                $.setRoute("?ishade=true");
            }
        } else {
            $("body").toggleClass("info-shade-open");
            $("#info-shade").toggle();
        }
    }

    //------------------------------
    // Framed table
    //------------------------------

    /**
     * Creates the framed table layout used extensively in retail.
     * @param {Array} headers The localization table headers.
     * @param {string} lcon The localization context for this table.
     * @param {string} cName The API call this table is populated from.
     * @param {string} uri The location to send the add button to.
     * @param {jQuery} extra Extra HTML to inject.
     * @param {Object?} cData The data to use in the API call.
     * @param {string?} act The localization string for the action.
     * @param {string?} title The localization string for the title.
     * @return {jQuery.dataTable} The data table instance of the first element.
     */
    function framedTable(headers, lcon, cName, uri, extra, cData, act, title) {
        var element = this.eq(0),
            table,
            dTable,
            thead,
            proxy,
            attrs = {
                "data-template": "framed-table",
                "data-refresh-call": cName
            },
            columnHeaders = [],
            actionUpdate = {
                html: $.loc(act || "act", lcon)
            };

        if ($.isPlainObject(uri)) {
            $.extend(true, actionUpdate, uri);
        } else if ($.isFunction(uri)) {
            actionUpdate.on = {"click": uri};
        } else {
            actionUpdate.attr = {href: uri};
        }

        proxy = $.api(cName, true, function (data) {
            table.find(".update-screen").addClass("hide");
            table.find(".updated_on").html($.dateformat.format(DATE_FORMAT));
            table.find(".refresher").removeClass("active")
                    .find(".icon-spin").removeClass("icon-spin");
        });
        table = element.attr(attrs).resetTemplate().update({
            ".title": $.loc(title || "title", lcon),
            ".no-content": $.loc("none", lcon),
            ".updated_on": $.dateformat.format(DATE_FORMAT),
            ".refresher": {
                on: {"click do-refresh": function (event) {
                    var e = $(this);
                    table.find(".updated_on").html($.loc("updating_now"));
                    event.preventDefault();
                    if (!e.is(".active")) {
                        table.find(".update-screen").css({
                            width: element.width(),
                            height: element.height()
                        }).removeClass("hide");
                        $(":focus").blur();
                        $(this).addClass("active")
                            .find(".icon-refresh").addClass("icon-spin");
                        proxy(cData);
                    }
                }}
            },
            ".trigger-button": actionUpdate
        }, 0);
        thead = table.find("tr.table-header").resetTemplate();

        if (extra !== undefined) {
            table.find(".extra").append(extra);
        }

        $.each(headers, function (index, pck) {
            var name, value;
            if ($.isArray(pck)) {
                name = pck[0];
                value = pck[1];
            } else {
                name = pck;
                value = null;
            }

            thead.update({html: $.loc(name, lcon)}, columnHeaders.length);
            columnHeaders.push(value);
        });

        dTable = table.find("table.table").dataTable({
            aaSorting: [[0, "asc"]],
            bAutoWidth: false,
            oLanguage: {
                sSearch: $.loc("search_table", "common"),
                sEmptyTable: $.loc("empty_table", "common"),
                sZeroRecords: $.loc("zero_table", "common")
            },
            iDisplayLength: 10,
            aoColumns: columnHeaders
        });

        table.find("table.table").wrap($$("div.table-scroller"));

        return dTable;
    }

    /**
     * Wrap a string in a span.nowrap element. This is used in the data table
     * for strings that shouldn't wrap.
     * @param {string} s The string to wrap.
     */
    function nowrap(s) {
        return $.strf('<span class="nowrap">{}</span>', s);
    }

    /**
     * Clears any currently active inplace trigers.
     */
    function clearInplace() {
        var e = $(".inplace-trigger.active-trigger")
                .removeClass("active-trigger");

        e.find(".triggered").addClass("hide");
        e.find(".untriggered").removeClass("hide");
    }

    /**
     * Turn an HREF into a link.
     */
    function hrefWrap(href, title, target) {
        if (!href) {
            return "";
        }

        if (!title) {
            title = "";
        } else {
            title = $.strf(' title="{}"', title);
        }

        if (!target) {
            target = "";
        } else {
            target = $.strf(' target="{}"', target);
        }

        return $.strf('<a href="{0}"{1}{2}>{0}</a>', href, title, target);
    }

    /**
     * Handle an inplace click.
     * @param {Event} event
     */
    function inplace(event) {
        var element = $(this),
            container = element.parents(".inplace-trigger");

        clearInplace();

        container.addClass("active-trigger")
            .find(".triggered").removeClass("hide")
            .find(":text:first").focus();

        if (!container.is(".inplace-trigger-rect")) {
            container.find(".untriggered").addClass("hide");
        }

        event.preventDefault();
    }

    //------------------------------
    // Modal workspace
    //------------------------------

    /**
     * Resets the specified (or all) workspace(s).
     * @param {string?} sel The selector to reset.
     */
    function resetWorkspaces(sel) {
        $(sel || ".workspace").removeClass("in dirty confirmed")
            .find(".modal-confirm, .modal-warning").slideUp("fast");
    }

    /**
     * Displays a modal warning message for the given workspace.
     * @param {string} msg The error message.
     */
    function modalWarning(msg) {
        var e = this.find(".modal-warning");
        if (msg) {
            e.find(".warning-message").html(msg);
            e.addClass("active-message").slideDown("fast");
        } else {
            if (e.hasClass("active-message")) {
                e.removeClass("active-message").slideUp("fast");
            }
        }
        return this;
    }

    /**
     * Triggered when the modal attempts to close.
     * @param {Event} event
     */
    function canHide(event) {
        var e = $(this),
            forDeeplink = ($.deeplink.isLoading || $.deeplink.isError);
        $(":focus").blur();
        if (e.is(".dirty:not(.confirmed)")) {
            e.trigger("prompt-force-close");
            if (e.is(".modal")) {
                e.find(".modal-confirm").slideDown("fast");
                return forDeeplink;
            }
            if (!forDeeplink && e.is(".lightbox")) {
                event.stopImmediatePropagation();
            }
        }

        if (e.is(".modal")) {
            resetWorkspaces(e);
            return true;
        }
    }

    /**
     * Click handler.
     * @param {event} Event The click event.
     */
    function cancelClose(event) {
        event.preventDefault();
        $(this).parents(".modal-confirm").slideUp("fast");
    }

    /**
     * Click handler.
     * @param {event} Event The click event.
     */
    function confirmAndClose(event) {
        event.preventDefault();
        var e = $(this).parents(".workspace")
                    .addClass("confirmed")
                    .trigger("force-closed");
        if (e.is(".lightbox")) {
            $.lightbox("!");
        } else if (e.is("modal")) {
            e.modal("hide");
        }
    }

    /**
     * Bubble up the save and close event click.
     * @param {Event} event
     */
    function bubbleSaveClose(event) {
        var e = $(this).parents(".workspace");
        if (e.is(".prompt-save-close,.force-save")) {
            event.preventDefault();
            e.trigger("force-save-closed");
        } else {
            e.trigger("save-close");
            confirmAndClose.call(this, event);
        }
    }

    /**
     * Creates a modal workspace.
     * @param {function} onCancel
     * @param {function} onSaveClose
     */
    function modalWorkspace(onCancel, onSaveClose, onClose, onForceSave) {
        return this.each(function () {
            var e = $(this).addClass("modal-workspace").on("hide", canHide);

            e.find(".cancel-close").on("click", cancelClose);
            e.find(".confirm-close").on("click", confirmAndClose);
            e.find(".save-close").on("click", bubbleSaveClose);
            if ($.isFunction(onForceSave)) {
                e.on("force-save-closed", onForceSave);
            }
            if ($.isFunction(onCancel)) {
                e.on("force-closed", onCancel);
            }
            if ($.isFunction(onSaveClose)) {
                e.on("save-close", onSaveClose);
            }
            if ($.isFunction(onClose)) {
                e.on("hidden", onClose);
            }

            e.on("force-closed", function (event) {
                $(this).parents(".modal").modal("hide");
            });
        });
    }

    /**
     * Creates a modal workspace.
     * @param {function} onCancel
     * @param {function} onSaveClose
     */
    function lightboxWorkspace(onPrompt, onSaveClose, onClose, onForceSave) {
        return this.each(function () {
            var e = $(this).addClass("lightbox-workspace")
                        .on("unloading.lightbox", canHide);

            e.find(".confirm-close").on("click", confirmAndClose);
            e.find(".save-close").on("click", bubbleSaveClose);
            if ($.isFunction(onPrompt)) {
                e.on("prompt-force-close", onPrompt);
            }
            if ($.isFunction(onSaveClose)) {
                e.on("save-close", onSaveClose);
            }
            if ($.isFunction(onClose)) {
                e.on("closed.lightbox", onClose);
            }
            if ($.isFunction(onForceSave)) {
                e.on("force-save-closed", onForceSave);
            }
        });
    }

    //------------------------------
    // Auto wizard
    //------------------------------

    function doWizardChange(e, tab, navigation, index) {
        var s = e.find("[data-wizard-step], [data-wizard-not]")
                    .addClass("hide"),
            x = s.filter($.strf(WIZ_SEARCH, index)),
            pages = navigation.children().length;

        x.removeClass("hide");
        e.trigger("wizard-step", [index, pages]);
        e.find(".modal-confirm").slideUp("fast");

        e.find("[data-wizard-active]")
            .removeClass("active")
            .filter("[data-wizard-active*=" + index + "]")
                .addClass("active");
    }

    function autoWizard() {
        return this.each(function () {
            var e = $(this),
                lastChange;
            e.find(".wizard-next, .wizard-prev")
                .on("click", preventDefault);
            e.bootstrapWizard({
                nextSelector: ".wizard-next",
                previousSelector: ".wizard-prev",
                onTabShow: function (tab, navigation, index) {
                    if (lastChange !== index) {
                        lastChange = index;
                        doWizardChange(e, tab, navigation, index);
                    }
                }
            });
        });
    }

    //------------------------------
    // Uploader
    //------------------------------

    function injectUploader(form, button, calls, selector, endpoint, extra) {
        var element = (selector === undefined) ?
                    form.find(":file").parent().empty()[0] :
                    form.find(selector).empty()[0],
            callResponse,
            callProxy,
            cb = $.isFunction(calls) ? calls : null,
            uploader = new qq.FineUploader({
                multiple: false,
                button: button,
                element: element,
                dragAndDrop: {
                    disableDefaultDropzone: true,
                    hideDropzones: false
                },
                request: {
                    inputName: "data",
                    customHeaders: {
                        "Authorization": $.api.authHeader
                    },
                    forceMultipart: true,
                    endpoint: endpoint || '/'
                },
                text: {
                    uploadButton: UPLOADER_ICON + $.loc("files", "common"),
                    failUpload: $.loc("failed_upload", "common")
                },
                autoUpload: true,
                template: UPLOADER_TEMPLATE,
                callbacks: {
                    onComplete: function (id, fileName, response) {
                        uploader.clearStoredFiles();
                        if (callResponse) {
                            $.extend(callResponse, response);
                            callProxy(200);
                        }
                        if (cb !== null) {
                            cb(true, response);
                        }
                    },
                    onError: function (id, fileName, reason) {
                        uploader.clearStoredFiles();
                        if (callResponse) {
                            callResponse.message = reason;
                            callProxy(400, callResponse);
                        }
                        if (cb !== null) {
                            cb(false, reason);
                        }
                    }
                },
                validation: {
                    allowedExtensions: ['jpeg', 'jpg', 'gif', 'png', 'svg'],
                    sizeLimit: 1048576
                }
            });

        // Software that tells you how you work is the devil.
        uploader._origMaybeParse = uploader._maybeParseAndSendUploadError;
        uploader._maybeParseAndSendUploadError = function (a, b, c, d) {
            var code = d.status;
            if (code >= 200 && code < 300 && $.inArray(code, [301, 304])) {
                // Successful, do nothing
            } else {
                uploader._origMaybeParse.apply(uploader, arguments);
            }
        }

        if (cb !== null) {
            return uploader;
        }

        $.api.intercept(calls, function (resp, data, headers, urlp, url, cp) {
            callProxy = cp;
            callResponse = resp;
            uploader._options.request.endpoint = url;
            uploader._handler._options.endpoint = url;
            uploader.uploadStoredFiles();
            return -1; // We will call the proxy when we're done
        });

        return uploader;
    }

    function loadBuildData() {
        if (window.location.host.match(/localhost|virtualhost/) === null) {
            $.ajax({
                url: ".build.json",
                cache: false,
                dataType: "json",
                success: function (data) {
                    $(".build-number").addClass("label-inverse")
                        .html("Build #" + data.build_id);
                }
            });
        } else {
            $(".build-number").addClass("label-error").html("Dev Mode");
        }
    }

    //------------------------------
    //
    // Event bindings
    //
    //------------------------------

    $(function () {
        $("#user-profile, .user-profile").hide();
        $(".when-authenticated").addClass("hide");
        $.authenticated(authenticated);

        $("body").on("click", bodyClick);
        $(".toggle-shade").on("click", shadeClick);
        $(".toggle-info").on("click", infoClick);

        loadBuildData();
    });

    //------------------------------
    // Deeplink
    //------------------------------

    $(function () {
        $.deeplink.application("#content", "#error", "#loading");
    });

    $.deeplink.bind("loading", function () {
        $(".modal").modal("hide");
        $.lightbox("!");
        resetWorkspaces();
        clearInplace();
        $.pageData = {};
        if ($.whitelabel.deeplinkShades) {
            if ($.deeplink.query.hshade) {
                $("#header-shade-loading").removeClass("hide");
                $("body").addClass("header-shade-open");
                $("#header-shade").show();
            } else {
                $("body").removeClass("header-shade-open");
                $("#header-shade").hide();

                // Don't allow more than one deeplink shade open at a time
                if ($.deeplink.query.ishade) {
                    $("body").addClass("info-shade-open");
                    $("#info-shade").show();
                } else {
                    $("body").removeClass("info-shade-open");
                    $("#info-shade").hide();
                }
            }
        }
        $(".page-pane").removeClass("active");
        fixedHeaders.hide();
    });

    $.deeplink.bind("loaded", function () {
        $("#header-shade-loading").addClass("hide");
    });

    $.deeplink.bind("error", function () {
        $(".modal").modal("hide");
        $.lightbox("!");
        if ($.whitelabel.deeplinkShades) {
            $("body").removeClass("header-shade-open info-shade-open");
            $("#header-shade, #info-shade").hide();
        }
    });

    $.route("/logout", function () {
        $.deeplink.softSetRoute("#/");
        $.logout();
    });

    function uniqueArray(arr) {
        return $.grep(arr, function(v, k) {
            return $.inArray(v, arr) === k;
        });
    }

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    //------------------------------
    // Utility
    //------------------------------

    $.extend($, {
        uniqueArray: uniqueArray,
        hrefWrap: hrefWrap,
        userFullName: userFullName,
        pageData: {},
        queryParams: getQueryParams(),
        includeThirdParty: includeThirdParty,
        fluidApplication: fluidApplication,
        framedApplication: framedApplication,
        customErrors: customErrors,
        largeContainers: largeContainers,
        columnApplication: columnApplication,
        fixedTableHeaders: fixedTableHeaders,
        ucwords: ucwords,
        loadApplication: loadApplication,
        nowrap: nowrap,
        uuid: uuid,
        clearInplace: clearInplace,
        date_format: DATE_FORMAT,
        whitelabel: {
            saveUserData: false,
            reloadOnLogout: true,
            logoutDestination: null,
            logoutGeneratesHistoryEvent: false,
            alwaysAuthenticate: false,
            showLoginAsPage: false,
            deeplinkShades: false,
            deeplinkInfoShade: false,
            doLocalize: true,
            canLogin: true,
            authEveryTime: false,
            keepSession: false
        }
    });

    function fixedWorkspace(makeFixed) {
        var e = $(this);
        if (makeFixed === false) {
            e.removeClass("fixed-body");
            e.find(".body-content").removeClass("scrollable");
        } else {
            e.addClass("fixed-body");
            e.find(".body-content").addClass("scrollable");
        }
    }

    $.extend($.fn, {
        treeRender: treeRender,
        modalWorkspace: modalWorkspace,
        lightboxWorkspace: lightboxWorkspace,
        fixedWorkspace: fixedWorkspace,
        modalWarning: modalWarning,
        framedTable: framedTable,
        autoWizard: autoWizard,
        injectUploader: function (button, calls, sel, url) {
            return injectUploader(this.eq(0), button, calls, sel, url);
        }
    });

    $.beforeFirstExtract.add(function () {
        if ($.queryParams.debug) {
            $("body").addClass("debug");
        }

        $("[data-href]").on("click", function () {
            var e = $(this),
                href = e.attr("data-href");

            if (e.is("refresh")) {
                window.location.replace(href);
            } else {
                window.location = href;
            }
        });

        $(".inplace-trigger").delegate(".untriggered a", "click", inplace);

        $('.scrollable').on('DOMMouseScroll mousewheel', function(ev) {
            var $this = $(this),
                scrollTop = this.scrollTop,
                scrollHeight = this.scrollHeight,
                height = $this.height(),
                delta = ev.originalEvent.wheelDelta,
                up = delta > 0,
                prevent = function() {
                    ev.stopPropagation();
                    ev.preventDefault();
                    ev.returnValue = false;
                    return false;
                };

            if (!$this.is(".scrollable") || (scrollHeight <= height)) {
                return;
            }

            if (!up && -delta > scrollHeight - height - scrollTop) {
                // Scrolling down, but this will take us past the bottom.
                $this.scrollTop(scrollHeight);
                return prevent();
            } else if (up && delta > scrollTop) {
                // Scrolling up, but this will take us past the top.
                $this.scrollTop(0);
                return prevent();
            }
        });

        $(".paginator")
            .delegate(".paginator-prev", "click", function (event) {
                event.preventDefault();
                var e = $(this),
                    p = e.parents(".paginator"),
                    d = p.data("paginator");

                if (e.is("disabled")) {
                    return;
                }

                d.current -= 1;
                if (d.current < 0) {
                    d.current = 0;
                }

                p.data("paginator", d);
                e.trigger("paginator-change", [d.current]);
            })
            .delegate(".paginator-next", "click", function (event) {
                event.preventDefault();
                var e = $(this),
                    p = e.parents(".paginator"),
                    d = p.data("paginator");

                if (e.is("disabled")) {
                    return;
                }

                d.current += 1;
                if (d.current > (d.total - 1)) {
                    d.current = (d.total - 1);
                }

                p.data("paginator", d);
                e.trigger("paginator-change", [d.current]);
            })
            .delegate(".paginator-page", "click", function (event) {
                event.preventDefault();
                var e = $(this),
                    p = e.parents(".paginator"),
                    d = p.data("paginator"),
                    i = parseInt(e.data("index"), 10);

                if (e.is("disabled") || isNaN(i)) {
                    return;
                }

                d.current  = i;
                if (d.current < 0) {
                    d.current = 0;
                }
                if (d.current > (d.total - 1)) {
                    d.current = (d.total - 1);
                }

                p.data("paginator", d);
                e.trigger("paginator-change", [d.current]);
            })
            .on("paginator-change", function () {
                var e = $(this),
                    d = e.data("paginator");
                if (d.current === (d.total - 1) || d.total === 0) {
                    e.find(".paginator-next").addClass("disabled muted");
                } else {
                    e.find(".paginator-next").removeClass("disabled muted");
                }

                if (d.current === 0) {
                    e.find(".paginator-prev").addClass("disabled muted");
                } else {
                    e.find(".paginator-prev").removeClass("disabled muted");
                }

                e.find(".paginator-page").removeClass("disabled muted")
                    .filter("[data-index=" + d.current + "]")
                        .addClass("disabled muted");
                e.trigger("paginator-changed", [d.current, d.total]);
            })
            .on("paginator-init", function (event, total, current) {
                var e = $(this),
                    d = e.data("paginator"),
                    p = e.find(".pages").resetTemplate(),
                    index;

                for (index = 0; index < total; index += 1) {
                    p.update({
                        text: (index + 1),
                        attr: {"data-index": index}
                    }, index);
                }

                e.data("paginator", $.extend(true, {}, d, {
                    total: total,
                    current: current || 0
                }))
                e.trigger("paginator-change");
            });

        $(".prevent-default-click").on("click", preventDefault);

        $(".pseudo-input span").attr("contenteditable", "true")
            .on("click focus", function (event) {
                $(event.currentTarget).attr("contenteditable", "true");
                if (event.type === "click") {
                    event.stopImmediatePropagation();
                } else {

                }
            })
            .on("change", function (event) {
                var e = $(event.currentTarget),
                    trunc = parseInt(e.data("truncate"), 10),
                    text = e.text();
                if (isNaN(trunc)) {
                    trunc = 0;
                }

                if (trunc && text.length > trunc) {
                    text = text.substring(0, trunc);
                }

                e.text(text).attr("contenteditable", "false");
            })
            .on("blur", function (event) {
                $(event.currentTarget).change();
            })
            .on("paste", function (event) {
                var e = $(event.currentTarget),
                    doTimeout = true,
                    text,
                    trunc = parseInt(e.data("truncate"), 10);
                if (isNaN(trunc)) {
                    trunc = 0;
                }

                if (event.clipboardData && event.clipboardData.getData) {
                    event.preventDefault();
                    text = e.clipboardData.getData('text/plain');
                    if (trunc && text.length > trunc) {
                        text = text.substring(0, trunc);
                    }
                    $(event.currentTarget).text(text).change();
                    doTimeout = false;
                }

                if (doTimeout) {
                    setTimeout(function () {
                        text = e.text();
                        if (trunc && text.length > trunc) {
                            text = text.substring(0, trunc);
                        }
                        e.text(text).change().focus();
                    }, 1);
                }
            })
            .on("keyup", function (event) {
                var e = $(event.currentTarget),
                    text = e.text(),
                    trunc = parseInt(e.data("truncate"), 10);
                if (isNaN(trunc)) {
                    trunc = 0;
                }
                if (trunc && text.length > trunc) {
                    text = text.substring(0, trunc);
                    e.text(text);
                }
            })
            .on("keypress", function (event) {
                var e = $(event.currentTarget),
                    k = event.which,
                    text,
                    trunc;
                if (!k ||
                    // control keys
                    $.inArray(k, $.allowedNumericKeys) > -1) {
                    if (k === 13) {
                        // Enter key
                        e.change().blur();
                        return false;
                    }
                    return true;
                }

                text = e.text();

                trunc  = parseInt(e.data("truncate"), 10);
                if (isNaN(trunc)) {
                    trunc = 0;
                }

                if ((text.length + 1) > trunc) {
                    return false;
                }
            });

        $(".in-sync")
            .on("keyup change", function (event) {
                var e = $(event.currentTarget),
                    n = e.attr("name"),
                    v;

                if (n) {
                    if (e.is(":input")) {
                        v = e.val();
                    } else {
                        v = e.text();
                    }

                    $("[name=" + n + "]").not(e).trigger("sync", [v]);
                }
            })
            .on("sync", function (event, v) {
                var e = $(event.currentTarget);
                if (e.is(":input")) {
                    e.val(v);
                } else {
                    e.text(v);
                }
            });

        $(document).on("click", ".tree-header", treeToggle);

        $.allowedNumericKeys = [
            // Control keys backspace, tab, end, home, left
            8, 9, 13, 35, 36, 37, 39
        ];

        $(".numeric")
            .on("keypress", function(event) {
                var k = event.which,
                    e = $(event.currentTarget),
                    kc = String.fromCharCode(k),
                    v = $.trim(e.val());

                if (!k ||
                    // control keys
                    $.inArray(k, $.allowedNumericKeys) > -1) {
                    return;
                } else if (!isNaN(parseInt(kc, 10))) {
                    return;
                } else if (kc === "." && v.indexOf(".") === -1) {
                    // Prefix with 0
                    if (v.length === 0) {
                        e.val("0");
                    }
                    return;
                } else if (kc === "-" && v.length === 0) {
                    // Let minus sign be used if it's the first character
                    return;
                }

                event.preventDefault();
            })
            .on("paste", function (event) {
                if (event.clipboardData && event.clipboardData.getData) {
                    event.preventDefault();
                    var text = e.clipboardData.getData('text/plain');
                    $(event.currentTarget)
                        .val(sanitizeNumberInput(text)).change();
                } else {
                    setTimeout(function () {
                        var val = $(event.currentTarget).val();
                        $(event.currentTarget)
                            .val(sanitizeNumberInput(val)).change();
                    }, 0);
                }
            });

        $(".editable-trim").on("blur change keyup", function (event) {
            var e = $(event.currentTarget);
            if (event.type === "keyup") {
                if (!(event.which === 8 || event.which === 46) ||
                        e.contents().length > 1 ) {
                        return;
                }
            }
            e.find("p").each(function (i, p) {
                p = $(p);
                var c = p.contents();
                if (c.length && c.length !== c.filter("br").length) {
                    return;
                }
                p.remove();
            });
        });
    });

    function sanitizeNumberInput(val) {
        var dec, isNeg = false;
        val = val.replace(RX_CLEAR_NUMERIC, "");
        val = val.split(".");
        if (val.length > 1) {
            dec = val.shift();
            val = dec + "." + val.join("");
        } else {
            val = val.join("");
        }

        if (val.substr(0, 1) === "-") {
            isNeg = true;
        }

        val = val.replace("-", "");

        if (val.substr(0, 1) === ".") {
            val = "0" + val;
        }

        if (val === "0.") {
            val += "0";
        }

        if (isNeg) {
            val = "-" + val;
        }

        return val;
    }

    function treeToggle(event) {
        var e = $(event.target);
        if (e.has(".tree-arrow")) {
            e.closest(".subtree").toggleClass("open");
        }
        $(":focus").blur();
    }

    function treeRender(obj) {
        var e = $(this);
        // @TODO: Implement convenience method for collapsetree
        //console.log(e, obj);
    }

    //------------------------------
    // Third party
    //------------------------------

    $.fn.mathjax = function (fn) {
        if (window.MathJax === undefined) {
            mathjaxQueue = mathjaxQueue.add(this);
            return this;
        }

        return this.each(function () {
            MathJax.Hub.Queue(["Typeset", MathJax.Hub, this]);

            if ($.isFunction(fn)) {
                MathJax.Hub.Queue(fn);
            }
        });
    };

}(window.jQuery));

