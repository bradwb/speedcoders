/**
 * Lightbox
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
         * jQuery selector for determining if an element is localized.
         * @type {string}
         */
    var IS_LOC = ":localization, :localizationContext",

    //------------------------------
    //
    // Properties
    //
    //------------------------------

    //------------------------------
    // Elements
    //------------------------------

        /**
         * @type {jQuery}
         */
        overlay,
        screen,
        header,
        loading,
        content,
        dialogue,

        /**
         * The active lightbox.
         * @type {jQuery}
         */
        active,

    //------------------------------
    // Lightbox
    //------------------------------

        /**
         * The name of a new lightbox to open when the old one unloads.
         * @type {string}
         */
        pendingLightbox,

        /**
         * The name of the active lightbox, if any.
         * @type {string}
         */
        activeLightbox,

        /**
         * Allow the lightbox to be closed by click events on the page.
         * @type {boolean}
         */
        canClose = true,
        forceClose = false,

        /**
         * Has the current lightbox loaded?
         * @type {boolean}
         */
        loaded = false,

        /**
         * The lightboxes currently known about, by name.
         * @type {Object<string, jQuery>}
         */
        lightboxes = {};

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    //------------------------------
    // Lightbox
    //------------------------------

    /**
     * Centers the dialogue box on the screen.
     */
    function centerDialogue() {
        var w = $(window);
        dialogue.css({
            "top": 7, //0.5 * (w.height() - dialogue.height()),
            left: 0.5 * (w.width() - dialogue.width())
        });
    }

    /**
     * Defines a new lightbox.
     * @param {string} name The name of the lightbox.
     * @param {string|jQuery} markup The markup to power this lightbox.
     * @param {Array|string} flags The flags for the lightbox.
     * @param {string?} A stirng to add to the body when this lightbox is on
     */
    function defineLightbox(name, markup, flags, bodyClass) {
        if (lightboxes[name]) {
            lightboxes[name].remove();
        }

        if (markup.data("lightboxFlags")) {
            flags = markup.data("lightboxFlags");
        }

        if (flags && !$.isArray(flags)) {
            flags = flags.split(",");
        }

        if (flags) {
            flags = $.map(flags, $.trim);
            markup.data("jQueryLightboxFlags", flags);
        }

        if (markup.data("lightboxBodyclass")) {
            bodyClass = markup.data("lightboxBodyclass");
        }

        if (bodyClass) {
            markup.data("jQueryLightboxBodyClass", bodyClass);
        }

        lightboxes[name] = markup.appendTo(content).addClass("lightbox");
        extractLightboxes(markup, true);
    }

    /**
     * Open a lightbox by name. Only one lightbox can be open at a time. If a
     * new lightbox is opened, the old must first be closed. Because a lightbox
     * can break the process at any time, the most recently requested lightbox
     * will begin its opening procedure when the currently open one unloads.
     *
     * @param {string} name The name of the lightbox to open.
     * @param {jQuery} e The triggering element.
     * @return {boolean} True if something was opened, false otherwise.
     */
    function openLightbox(name, e) {
        if (!lightboxes[name]) {
            throw name + " not a defined lightbox";
        }

        if (activeLightbox) {
            pendingLightbox = name;
            closeLightbox(activeLightbox, e);
            return false;
        }

        // We want to show the lightbox here before it's setup. The lightbox
        // loading screen will hide the contents until the loaded event is
        // triggered. Loading will automatically happen unless you stop it.
        loaded = false;
        $.lightbox.active = activeLightbox = name;
        active = lightboxes[name].show();
        header.addClass("loading");

        // This needs to be fired after the var has been defined
        active.trigger("loading.lightbox", [e]);

        // Display the screen if it's not already visible
        var isOpen = overlay.is(".active"),
            flags = active.data("jQueryLightboxFlags");

        if (!isOpen) {
            active.trigger("opening.lightbox");
        }

        $("body").addClass("clamp");
        canClose = true;
        header.show();

        if (flags) {
            if ($.inArray("noclose", flags) > -1) {
                header.hide();
                canClose = false;
            }

            if ($.inArray("static", flags) > -1) {
                screen.removeAttr("data-lightbox");
            } else {
                screen.attr("data-lightbox", "!");
            }
        } else {
            screen.attr("data-lightbox", "!");
        }

        // Only show the screen if the loading cycle hasn't been broken
        if (!loaded) {
            loading.show();
            content.hide();
            centerDialogue();
        }

        // Finally, display the overlay and notify the lightbox
        if (!isOpen) {
            overlay.addClass("active");
            active.trigger("opened.lightbox");
        }
    }

    /**
     * Closes an open lightbox by name.
     * @param {string} name The name for the lightbox.
     * @param {jQuery} e The triggering element.
     * @return {boolean} True if something was closed, false otherwise.
     */
    function closeLightbox(name, e) {
        if (activeLightbox) {
            if (forceClose) {
                forceClose = false;
                canClose = true;
            }

            if (!canClose || (name && activeLightbox !== name)) {
                return false;
            }

            $("body").removeClass("clamp");
            active.trigger("unloading.lightbox", [e]);
            return true;
        }

        return false;
    }

    /**
     * Hides or shows a lightbox based on name contianing an exclamation.
     * @param {string} name The name of the lightbox to open or close.
     * @param {jQuery} e The element which opened the lightbox, if any.
     */
    function handleLightbox(name, e) {
        if (name) {
            var close = name.substr(0, 1) === "!";
            if (close) {
                name = name.substr(1);
                closeLightbox(name, e);
            } else {
                openLightbox(name, e);
            }
        }
    }

    /**
     * Extract lightboxes from the DOM. A lightbox is denoted in the DOM by
     * putting the class "lightbox" on an element with a [data-lightbox] attr,
     * which is used as the name for that lightbox.
     * @param {jQuery|string} context The context for extraction.
     * @param {boolean} bindOnly If true, only events will be bound.
     */
    function extractLightboxes(context, bindOnly) {
        $("[data-lightbox]", context).each(function () {
            var e = $(this);
            if (e.is(".lightbox")) {
                // If we have localization that's not triggered
                if ($.localized && !$.language &&
                        (e.is(IS_LOC) || e.find(IS_LOC).length)) {
                    // Simply return if the localization isn't prepared
                    return;
                }

                if (bindOnly) {
                    return;
                }
                defineLightbox(e.data("lightbox"), e.detach());
            } else if (!e.is(".lightbox-control")) {
                e.addClass("lightbox-control").on("click", function (event) {
                    var e = $(this);
                    event.preventDefault();

                    if (e.is(".force-close")) {
                        forceClose = true;
                    }

                    handleLightbox(e.data("lightbox"), e);
                });
            }
        });
    }

    /**
     * Interface for lightbox control.
     *
     * If this method is called with no arguments, it will extract and bind
     * lightboxes and lightbox triggers.
     *
     * @param {string} name The name of the lightbox.
     *      If the only parameter provided is the name, and the name matches a
     *          defined lightbox, that lightbox will be opened.
     *      If the name begins with an exclamation point and matches the active
     *          lightbox, that lightbox will be closed.
     *      If the name is just an exclamation point, any lightbox which is
     *          currently active will be closed.
     * @param {string|jQuery} markup Only used for creating. Must be a jQuery
     *      object or selector describing the element to display.
     * @return {jQuery} The named lightbox, or all lightboxes (for an extract).
     * @param {Array|string} flags The control flags for a lightbox.
     * @param {boolean} autoOpen If true, opens the lightbox.
     * @param {string} bodyClass An optional class to add to the body when on.
     */
    function lightbox(name, markup, flags, autoOpen, bodyClass) {
        if (!name) {
            extractLightboxes();
            return lightboxes;
        }

        if (markup) {
            defineLightbox(name, $(markup), flags, bodyClass);
        } else {
            handleLightbox(name);
        }

        if (autoOpen) {
            openLightbox(name);
        }
    }

    //------------------------------
    // Setup
    //------------------------------

    /**
     * Returns a hooking function for handling event bindings.
     * @param {string} type The type of function to proxy.
     */
    function eventHook(type) {
        return function () {
            $.fn[type].apply(dialogue, arguments);
        }
    }

    /**
     * Creates the elements which will be used to display the lightbox.
     *
     * Two distinct event cycles are used to power the lightboxes. The loading
     * and opening cycles.
     *
     * The loading cycle refers to an interruptable series of events which you
     * are encouraged to use for complex asynchronicity. If you stop the
     * propogation of the loading cycle, you are responsible for resuming it
     * when appropriate.
     *
     * The opening cycle refers to a non-interruptable series of events which
     * deal with the actual display of the lightbox chrome (screen, box, etc).
     * The events of the opening cycle are dispatched in the same manner that
     * the loading cycle events are, but halting their propogation has no
     * effect on the cycle; rather these are dispatched in case you want to
     * kick something off when they occur.
     *
     * Always use event.stopImmediatePropagation() to interrupt the cycle.
     */
    function createOverlay() {
        if (overlay) {
            return;
        }

        overlay = $$("div#lightbox-overlay").appendTo("body");
        screen = $$("div#lightbox-screen[data-lightbox=!]").appendTo(overlay);
        dialogue = $$("div#lightbox[role=dialogue]").appendTo(overlay);
        header = $$("div#lightbox-header.clearfix", [
            "button.close[type=button][data-lightbox=!]>&times;"
        ]).appendTo(dialogue);
        loading = $$("div#lightbox-loading").appendTo(dialogue);
        content = $$("div#lightbox-content.clearfix").appendTo(dialogue);

        // Loading cycle endpoints
        dialogue.on("loading.lightbox", function (event) {
            event.stopImmediatePropagation();
            if (active) {
                active.trigger("loaded.lightbox");
            }
        });
        dialogue.on("loaded.lightbox", function (event) {
            event.stopImmediatePropagation();
            loaded = true;
            header.removeClass("loading");

            var bodyClass = active.data("jQueryLightboxBodyClass");
            if (bodyClass) {
                $("body").addClass(bodyClass);
            }

            loading.hide();
            active.show();
            content.show();

            centerDialogue();
        });

        // Create binding proxies
        $.lightbox.on = eventHook("on");
        $.lightbox.one = eventHook("one");
        $.lightbox.off = eventHook("off");

        // Unloading cycle endpoints
        dialogue.on("unloading.lightbox", function (event) {
            event.stopImmediatePropagation();
            if (active) {
                active.trigger("unloaded.lightbox");
            }
        });
        dialogue.on("unloaded.lightbox", function (event) {
            event.stopImmediatePropagation();
            var last = active.hide(),
                bodyClass = active.data("jQueryLightboxBodyClass");

            if (bodyClass) {
                $("body").removeClass(bodyClass);
            }

            $.lightbox.active = active = activeLightbox = null;

            loading.show();
            content.hide();
            centerDialogue();

            if (pendingLightbox) {
                openLightbox(pendingLightbox);
                pendingLightbox = null;
            } else if (last) {
                last.trigger("closing.lightbox");
                overlay.removeClass("active");
                last.trigger("closed.lightbox");
            }
        });
    }

    //------------------------------
    //
    // Event bindings
    //
    //------------------------------

    //------------------------------
    // Setup
    //------------------------------

    $(function () {
        createOverlay();
        extractLightboxes();

        if ($.localized) {
            $.localized(function () {
                extractLightboxes();
            });
        }

        if ($.deeplink) {
            $.deeplink.bind("loading", function () {
                closeLightbox();
            });
        }

        $(window).on("resize", centerDialogue);
    });

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    //------------------------------
    // Lightbox
    //------------------------------

    $.lightboxes = lightboxes;

    $.lightbox = lightbox;
    $.lightbox.active = null;
    $.lightbox.extract = extractLightboxes;
    $.lightbox.open = openLightbox;
    $.lightbox.close = closeLightbox;

    //------------------------------
    // Markup
    //------------------------------

    $.markup.queue.add(extractLightboxes);

}(window.jQuery));

