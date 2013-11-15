/**
 * jQuery deeplink
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
    // Properties
    //
    //------------------------------

    //------------------------------
    // Deeplink
    //------------------------------

        /**
         * A route is a URI with an attached listener.
         * Contains routes as keys and split paths as values.
         * @type {Object<string, Array<string>>}
         */
    var routes = {},
        afterRoutes = {},
        ignoreNext = false,

        /**
         * A list of all the routes currently tracked.
         * @type {Array<string>}
         */
        trackedRoutes = [],

        /**
         * A list of all the routes currently tracked for notification.
         * @type {Array<string>}
         */
        notifyRoutes = [],

        /**
         * Has the deeplinking engine been activated?
         * @type {boolean}
         */
        activated = false,

        /**
         * Are we running in static mode using query params to the page?
         * @type {boolean}
         */
        staticMode = false,

        /**
         * Can the system fire events?
         * @type {boolean}
         */
        canReady = false,
        readyQueue,

        /**
         * The delegate for binding and triggering listeners.
         * @type {jQuery}
         */
        delegate = $({}),

        /**
         * The default class names for route mechanic elements.
         * @type {Object<string, string>}
         */
        defaultClassNames = {
            tab: "active",
            pane: "active"
        };

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    function startup() {
        // Markup
        if ($.markup) {
            $.markup.queue.add(function (context) {
                var rps = "[data-route-path]",
                    rpt = "[data-route-tab]",
                    paths = context.find(rps),
                    tabs = context.find(rpt);

                if (context.is(rps)) {
                    paths = paths.add(context);
                }

                if (context.is(rpt)) {
                    tabs = tabs.add(context);
                }

                paths.each(updateRoutePath);
                tabs.each(updateRouteTab);
            });
        }
    }

    //------------------------------
    // Utilities
    //------------------------------

    /**
     * Sets the current page title.
     * @param {string|Array<string>} t The title to set.
     */
    function pageTitle(t) {
        if (t) {
            if (!$.isArray(t)) {
                t = [t];
            }
        } else {
            t = [];
        }

        // Add the page title base
        t.push($.deeplink.pageTitleBase);
        document.title = t.join($.deeplink.pageTitleSeparator);
    }

    /**
     * Trims leading and trailing slashes from a path.
     * @param {string} path The path to trim.
     * @param {boolean} keepParam Keep parameters in the path.
     * @return {string} The trimmed path.
     */
    function trimPath(path, keepParam) {
        if (!keepParam && path.indexOf("?") > -1) {
            path = path.substr(0, path.indexOf("?"));
        }
        if (path.substr(0, 1) === "#") {
            path = path.substr(1);
        }
        if (path.substr(0, 1) === "/") {
            path = path.substr(1);
        }
        if (path.substr(-1, 1) === "/") {
            path = path.substr(0, path.length - 1);
        }

        return path;
    }

    /**
     * Ensures the path is in absolute form (/path/to/) with no query params.
     * @param {string} path The path.
     * @return {string} The absolute path.
     */
    function absolutePath(path) {
        if (path.indexOf("?") > -1) {
            var s = path.split("?");
            path = trimPath(s[0]) + "/?" + s[1];
        } else {
            path = trimPath(path) + "/";
        }

        // No path is set, return an empty string
        if (path === "/") {
            return "";
        }

        return "/" + path;
    }

    /**
     * Recursively match required query params to the actual ones.
     * @param {Object} reqs The required params.
     * @param {Object} actual The actual params.
     * @return {boolean} True if the required params are present.
     */
    function matchingQueryParams(reqs, actual) {
        var matches = false;
        if ($.isEmptyObject(reqs) && $.isEmptyObject(actual)) {
            return true;
        }
        $.each(reqs, function (k, v) {
            if (k.substr(0, 1) === "|") {
                k = k.substr(1);
                if (actual[k] === undefined) {
                    matches = true;
                    return;
                }
            }

            if (actual[k] !== v) {
                matches = false;
                return false;
            } else {
                matches = true;
            }
        });
        return matches;
    }

    /**
     * Determine if the provide route parts match the provided path parts.
     * @param {string|Array<string>} pathParts The parts of the path.
     * @param {string} routePath The route path.
     * @param {string|Array<string>} routeParts The parts of the route.
     * @param {?Object<string, Object<string, string>>} matches
     * @param {boolean} partial If true, partial matches will be returned.
     * @param {boolean} query If true, query strings will be involved in match.
     * @return {boolean} True if the route and path match, false otherwise.
     */
    function routeMatch(pathParts, routePath, routeParts, matches, partial,
            query) {
        var wildcard = false,
            optionalMatch = false,
            addExtraWildcards = false,
            allowDifferentSizes = false,
            mustNowMatchLength = false,
            fpath, fquery = {},
            ppath, pquery = {},
            index = 0, upIndex = false;

        routePath = trimPath(routePath);
        partial = Boolean(partial);

        // Convert to arrays
        if (!$.isArray(pathParts)) {
            ppath = getQuery(pathParts, pquery);
            pathParts = trimPath(ppath).split("/");
        } else {
            ppath = getQuery(pathParts.join("/"), pquery);
        }

        if (!$.isArray(routeParts)) {
            fpath = getQuery(routeParts, fquery);
            if (fpath === "") {
                // Query only change
                routeParts = [""];
            } else {
                routeParts = trimPath(fpath).split("/");
            }
        } else {
            fpath = getQuery(routeParts.join("/"), fquery);
        }

        if (routeParts[routeParts.length - 1] === "*") {
            wildcard = true;
        }

        if (fpath.indexOf("/;") > -1 ||
                fpath.indexOf("/@") > -1) {
            partial = true;
        }

        // Match up to and then whatever else comes after
        if (fpath.indexOf("/|") > -1) {
            allowDifferentSizes = true;
        }

        // Paths of different lengths cannot match
        if (routeParts.length !== pathParts.length) {
            if (!wildcard && !partial) {
                if (!allowDifferentSizes) {
                    return false;
                }
            } else {
                addExtraWildcards = true;
            }
        }

        if (!matches) {
            matches = {};
        }

        $.each(routeParts, function (i, routePart) {
            // Use a custom iterator to account for skipped parts (@)
            if (!upIndex) {
                upIndex = true;
            } else {
                index++;
            }

            var pathPart = pathParts[index],
                param,
                rm = false;

            // This optionally matches a part
            if (routePart[0] === "|") {
                // When dealing with optional blanks #/|foo this handles
                // the case that the route is #/
                if (pathPart === "" && index === 0) {
                    routePart = "";
                } else if (pathPart === undefined) {
                    // Accept the pipe as an optional matcher
                    return false;
                } else {
                    mustNowMatchLength = true;
                    routePart = routePart.substr(1);
                }
            }

            if ($.inArray(routePart, ["*", "+"]) > -1) {
                param = index;
            } else if (routePart[0] === ":") {
                param = routePart.substr(1);
            } else if (routePart[0] === "@") {
                if (pathPart !== routePart.substr(1)) {
                    // Pretend this doesn't exist if it doesn't match
                    upIndex = false;
                }
            } else if (routePart[0] === ";") {
                param = routePart.substr(1);
                optionalMatch = true;
            } else if (routePart !== pathPart && !optionalMatch) {
                rm = true;
            }

            if (matches[routePath] === undefined) {
                if (rm) {
                    return false;
                } else {
                    matches[routePath] = {};
                }
            } else if (rm) {
                delete matches[routePath];
                return false;
            }

            if (pathPart === undefined && optionalMatch) {
                return false;
            }

            if (param !== undefined) {
                if (pathPart !== undefined) {
                    matches[routePath][param] = pathPart;
                } else {
                    // Empty param values here shouldn't match
                    delete matches[routePath];
                }
            }
        });

        if (routeParts.length === 0 && !$.isEmptyObject(fquery)) {
            // Set this so the path query fires.
            matches[routePath] = {};
            // This state trips the wildcards check, so untrip it
            addExtraWildcards = false;
        }

        if (mustNowMatchLength) {
            if (routeParts.length < pathParts.length) {
                if (!wildcard && !partial) {
                    delete matches[routePath]
                    return false;
                }
            }
        }

        if (addExtraWildcards) {
            $.each(pathParts, function (i, part) {
                if (matches[routePath] !== undefined &&
                        i >= routeParts.length) {
                    matches[routePath][i] = part;
                }
            });
        }

        if (query) {
            if (!matchingQueryParams(fquery, pquery)) {
                delete matches[routePath];
            }
        }

        if (matches[routePath] !== undefined) {
            $.each(fquery, function (k, v) {
                var name, c = v.substr(0, 1);
                if (k.substr(0, 1) === "{" && k.substr(-1) === "}") {
                    v = ":" + k.substr(1, k.length - 2);
                }

                if (v.substr(0, 1) === ":") {
                    name = v.substr(1);
                    matches[routePath][name] = pquery[name];
                }
            });
        }

        return matches && !$.isEmptyObject(matches);
    }

    /**
     * Trigger route matches.
     * @param {?Object<string, Object<string, string>>} matches
     * @param {string} prefix The event prefix.
     */
    function triggerMatches(matches, prefix) {
        if (!matches || $.isEmptyObject(matches)) {
            return;
        }

        $.each(matches, function (route, params) {
            var query = $.extend({}, $.deeplink.query);
            delegate.trigger(prefix + "-" + route, [params, query]);
        });
    }

    /**
     * Extracts a given path as a route.
     * @param {string} path The path to check.
     * @param {Object} router The router to use.
     * @return {?Object<string, Object<string, string>>} Matched routes and
     *      their parameters, or null.
     */
    function matchRoutes(path, router) {
        path = trimPath(path);
        var pathParts = path.split("/"),
            matches = {};

        $.each(router, function (routePath, routeParts) {
            routeMatch(pathParts, routePath, routeParts, matches);
        });

        return $.isEmptyObject(matches) ? null : matches;
    }

    /**
     * Determine if a given path part matches the current path.
     * @param {string} part The path part to match.
     * @param {boolean} exact Match exactly the path only.
     * @param {?Object<string, Object<string, string>>=} matches
     * @param {boolean=} query Match query string as well.
     * @return {boolean} True if part matches path.
     */
    function pathMatch(part, exact, matches, query) {
        if (part) {
            var matchedAny = false;
            $.each(part.split(","), function (i, p) {
                if (routeMatch($.deeplink.fullPath, p, p, matches,
                            !exact, query)) {
                    matchedAny = true;
                    return false;
                }
            });

            return matchedAny;
        }

        return false;
    }

    /**
     * Returns a match from the "deeplink" section of a localization document.
     * @param {string|Array<string>} part The string to return.
     * @param {?boolean} forPage If true, will use the ":pages" sub-block.
     * @return {?string} The display string, if a match is found.
     */
    function loc(part, forPage) {
        if (!$.isArray(part)) {
            part = [part];
        } else {
            part = [].concat(part);
        }

        if (Boolean(forPage)) {
            part.unshift("pages");
        }

        part.unshift("deeplink");

        try {
            return $.loc(part);
        } catch (c) {
            return null;
        }
    }

    /**
     * Returns a match from the "error" section of a localization document.
     * @param {string|Array<string>} part The string to return.
     * @return {?string} The display string, if a match is found, or the
     * part itself.
     */
    function err(part, forPage) {
        if (!$.isArray(part)) {
            part = [part];
        } else {
            part = [].concat(part);
        }

        var orig = [].concat(part);
        part.unshift("error");

        try {
            return $.loc(part);
        } catch (c) {
            return orig;
        }
    }

    /**
     * Sets the page title to a match from the localization document.
     * In a "deeplink" section of the localization document, any key within a
     * "pages" object will match to route names.
     * The pages object for a given route supports the "prepend title with"
     * key of "<" and the "root page title" with "/".
     *
     * For example:
     * deeplink: {
     *      baseTitle: "Bar",
     *      pages: {
     *          foo: {
     *              <: "Blah",
     *              /: "Foo",
     *              baz: {
     *                  /: "Baz"
     *              }
     *          }
     *      }
     * }
     *
     * Route: /
     * Title: "Bar!"
     *
     * Path: /foo
     * Title: "Foo - Blah - Bar"
     *
     * Path: /foo/baz
     * Title: "Baz - Blah - Bar"
     */
    function setCurrentPageTitle() {
        var path = trimPath($.deeplink.currentPath),
            title = [],
            nesting = [],
            lastPageTitle;

        if ($.deeplink.rootTitle) {
            title.unshift($.deeplink.rootTitle);
        }

        $.each(path.split("/"), function (i, v) {
            var t;
            if (v === "") {
                t = loc("/", true);
            } else {
                t = loc([v, "<"], true);
            }

            if (t) {
                title.unshift(t);
            }
            nesting.push(v);
        });

        lastPageTitle = loc(nesting, true);

        if (!lastPageTitle) {
            nesting.push("/");
            lastPageTitle = loc(nesting, true);
            if (!lastPageTitle) {
                // Try without the slash for simple string routes
                nesting.pop();
                lastPageTitle = loc(nesting, true);
            }
        }

        if (lastPageTitle) {
            title.unshift(lastPageTitle);
        }

        if (title && title.length > 0) {
            pageTitle(title);
        }
    }

    /**
     * Fixes a path and populates a query object.
     * @param {string} path The path.
     * @param {Object=} query The query object to populate.
     */
    function getQuery(path, query) {
        var i = path.indexOf("?"),
            qs;

        if (i > -1) {
            if (path.substr(-1) === "/") {
                // Some odd bug adds a trailing slash to the search when using
                // a port. Strip the slash before testing. If you want to use
                // a slash in your query params... don't.
                path = path.slice(0, -1);
            }

            qs = path.substr(i + 1);
            path = path.substr(0, i);
            if (query) {
                $.extend(query, $.deparam(qs));
            }

            // Return nothing if the path was just ?...
            if (i === 0) {
                return "";
            }
        }

        return absolutePath(path);
    }

    /**
     * Sets the current path.
     * @param {string} route The path to make current.
     */
    function setCurrent(path) {
        var q = {};
        $.deeplink.fullPath = path;
        $.deeplink.currentPath = getQuery(path, q);
        $.deeplink.query = q;
    }

    /**
     * Convert a match object to a URL.
     * @param {Object<string, string>} matches
     * @param {string} path The path to use.
     * @param {string=} add Add to the path.
     * @param {boolean} noquery Suppress adding back old query params.
     * @return {?string} The matching path.
     */
    function matchToURL(match, path, add, noquery) {
        var q = {};
        path = trimPath(path, true);

        $.each(match, function (k, v) {
            // Subset matches will have positional arguments which should not
            // be appended as path properties.
            if (!isNaN(parseInt(k, 10))) {
                delete match[k];
                return;
            }

            var p = ":" + k,
                r = "{" + k + "}";

            if (path.indexOf(p) > -1) {
                path = path.replace(p, v);
                delete match[k];
            }
            if (path.indexOf(r) > -1) {
                path = path.replace(r, k + "=" + v);
                delete match[k];
            }
        });

        if (add) {
            if (path.substr(0, 1) === "?") {
                path = "/" + add + "/";
            } else if (path.indexOf("*") > -1) {
                path = path.replace("*", add);
            } else {
                path += "/" + add;
            }
        }

        if (!noquery) {
            path = getQuery(path, q);
            q = $.extend({}, $.deeplink.query, q, match);
            if (!$.isEmptyObject(q)) {
                $.each(q, function (k, v) {
                    if (v === "") {
                        delete q[k];
                    }
                });
                if (!$.isEmptyObject(q)) {
                    path += "?" + $.param(q);
                }
            }
        }

        return "#" + path;
    }

    /**
     * Convert a match object to a URL.
     * @param {?Object<string, Object<string, string>>} matches
     * @param {string} path The path to use.
     * @param {string=} add Add to the path.
     * @param {boolean} noquery Suppress adding back old query params.
     * @return {?string} The matching path.
     */
    function matchesToURL(matches, path, add, noquery) {
        var pathKey = trimPath(path),
            match = matches[pathKey];
        if (match) {
            return matchToURL(match, path, add, noquery);
        }

        return null;
    }

    //------------------------------
    // Selectors
    //------------------------------

    /**
     * Fetches all route tabs with matching attributes.
     * @return {Array<DOMElement>} A list of current route tabs.
     */
    function currentRouteTabs() {
        return $(".route-tab").filter(function () {
            var e = $(this),
                exact = e.hasClass("exact"),
                query = e.hasClass("query"),
                path = e.is("a") ? e.attr("href") : e.data("route");
            return pathMatch(path, exact, null, query);
        });
    }

    /**
     * Fetches all the route panes with matching attributes.
     * @return {Array<DOMElement>} A list of current route tabs.
     */
    function currentSections() {
        return $(".route-pane").filter(function () {
            var e = $(this),
                exact = e.hasClass("exact"),
                query = e.hasClass("query"),
                path = e.attr("data-route");
            return pathMatch(path, exact, null, query);
        });
    }

    //------------------------------
    // Events
    //------------------------------

    /**
     * Returns a proxy method for binding events on the delegate.
     * @param {string} fn The function to proxy.
     * @return {function} A proxy function for event handling.
     */
    function dProxy(fn) {
        return function () {
            delegate[fn].apply(delegate, arguments);
        }
    }

    /**
     * Dispatches an error condition.
     * @param {string} problem The error cause.
     */
    function error(problem) {
        $.deeplink.isError = true;
        $("#click-screen").hide();
        delegate.trigger("error", [problem]);
    }

    /**
     * Dispatches a the loaded event.
     */
    function loaded() {
        if (!$.deeplink.isError) {
            $.deeplink.isLoading = false;
            delegate.trigger("loaded");
            var matches = matchRoutes($.deeplink.currentPath, afterRoutes);
            triggerMatches(matches, "after-route");
            $.deeplink.softChangeNext = false;
            $("#click-screen").hide();
            delegate.trigger("afterLoaded");
        }
    }

    /**
     * Dispatches a the loaded event.
     */
    function loading(path) {
        $.deeplink.isError = false;
        if (path !== undefined) {
            var q = {};
            $.deeplink.currentPath = getQuery(path, q);
            $.deeplink.query = q;
        }
        $("#click-screen").show();
        $.deeplink.isLoading = true;
        delegate.trigger("loading");
    }

    /**
     * Redispatches the current route.
     */
    function reload() {
        executeRoute($.deeplink.fullPath);
    }

    //------------------------------
    // Routes
    //------------------------------

    /**
     * Handles listener binding for route change.
     * @param {string|RegExp} newRoute Route to add.
     * @param {function(Object<string, string>)} listener Listener to add.
     * @param {Object} route The router to use.
     * @param {Array<string>} tracker The tracker to use.
     * @param {string} prefix The event prefix.
     */
    function bindRouteListener(newRoute, listener, router, tracker, prefix) {
        if ($.isArray(newRoute)) {
            $.each(newRoute, function (i, v) {
                bindRouteListener(v, listener, router, tracker, prefix);
            });
            return;
        }

        newRoute = trimPath(newRoute);

        if (router[newRoute] === undefined) {
            router[newRoute] = newRoute.split("/");
        }

        tracker.push(newRoute);
        delegate.bind(prefix + "-" + newRoute, listener);

        if (!activated) {
            return;
        }

        // Test the current path for a match, and execute if we find one
        var matches = {};
        if (routeMatch($.deeplink.currentPath, newRoute, newRoute, matches)) {
            triggerMatches(matches, prefix);
        }
    }

    /**
     * Binds listener for route change.
     * @param {string|RegExp} newRoute Route to add.
     * @param {function(Object<string, string>)} listener Listener to add.
     */
    function addRoute(newRoute, listener) {
        bindRouteListener(newRoute, listener, routes, trackedRoutes, "route");
    }

    /**
     * Binds listener for route change.
     * @param {string|RegExp} newRoute Route to add.
     * @param {function(Object<string, string>)} listener Listener to add.
     */
    function afterRoute(newRoute, listener) {
        bindRouteListener(newRoute, listener, afterRoutes, notifyRoutes,
                "after-route");
    }

    /**
     * Tests a route match result set to determine if only wildcard matches
     * are present.
     * @param {Object<string, Object<string, string>>}
     * @return {boolean} True if only wildcard matches.
     */
    function onlyWildcardMatches(m) {
        var only = true;

        $.each(m, function (p, params) {
            if ($.isEmptyObject(params)) {
                only = false;
                return false;
            }

            $.each(params, function (wk, v) {
                var t = wk.substr(0, 1),
                    k = wk.substr(1);

                if (t !== "*" || isNaN(parseInt(k, 10))) {
                    only = false;
                    return false;
                }
            });
        });

        return only;
    }

    /**
     * Updates a route-path element.
     * @param {AnchorHTMLElement} i The index of the tag in the result set.
     * @param {AnchorHTMLElement} e The tab to update.
     */
    function updateRouteTab(i, e) {
        e = $(e);
        $.each((e.attr("data-route-tab") || "").split(","), function (i, r) {
            if (pathMatch(r, e.hasClass("exact"), null, e.hasClass("query"))) {
                e.addClass($.deeplink.classNames.tab);
            }
        });
    }

    /**
     * Updates a route-tab element.
     * @param {AnchorHTMLElement} i The index of the tag in the result set.
     * @param {AnchorHTMLElement} e The anchor tag to update.
     */
    function updateRoutePath(i, e) {
        e = $(e);
        var rs = (e.attr("data-route-path") || "").split(","),
            p = e.data("original_href"),
            l,
            matches = {};
        $.each(rs, function (index, r) {
            if (p === true) {
                p = null;
            } else if (!p) {
                p = trimPath(e.attr("href") || "#", true);
                e.data("original_href", p || true);
            }

            if (r.substr(0, 1) === "-") {
                r = r.substr(1);
                l = $.deeplink.currentPath;
                l = "#" + absolutePath(l.substr(0, l.indexOf(r)));

                if (!e.hasClass("noquery")) {
                    l += (l.indexOf("?") > -1) ? "&" : "?";
                    l += $.param($.deeplink.query);
                }

                e.attr("href", l);
            }

            if (pathMatch(r, e.hasClass("exact"), matches,
                    e.hasClass("query"))) {
                e.attr("href",
                        matchesToURL(matches, r, p, e.hasClass("noquery")));
            }
        });
    }

    /**
     * Attempts to execute a provided path as a route.
     * @param {string} path The path to execute.
     */
    function executeRoute(path) {
        if (ignoreNext) {
            ignoreNext = false;
            return;
        }

        if ($.deeplink.softChange || $.deeplink.softChangeNext) {
            setCurrent(path);
            delegate.trigger("completed");
            if ($.deeplink.softChangeNext) {
                $.deeplink.softChangeNext = false;
            }
            return;
        }

        loading(path);

        if (!canReady) {
            readyQueue = path;
            return;
        }

        var matches = matchRoutes(path, routes),
            title,
            parts,
            hasCurrentSection,
            hasMatches,
            pane = $.deeplink.classNames.pane,
            tab = $.deeplink.classNames.tab;
        setCurrent(path);

        $.update({
            ".route-tab, [data-route-tab]": {
                removeClass: tab
            },
            ".route-pane": {
                removeClass: pane
            }
        });

        hasCurrentSection = currentSections().addClass(pane).length > 0;

        hasMatches = matches && !onlyWildcardMatches(matches);

        if (hasCurrentSection || hasMatches) {
            setCurrentPageTitle();
            if (hasMatches) {
                triggerMatches(matches, "route");
            } else {
                loaded();
            }
            $("[data-route-path]").each(updateRoutePath);
        } else {
            delegate.trigger("error", ["not_found", path]);
            pageTitle(loc("errorTitle"));
            $("#click-screen").hide();
        }

        currentRouteTabs().addClass(tab);
        $("[data-route-tab]").each(updateRouteTab);

        delegate.trigger("completed");
        runRouteUpdates();
    }

    function runRouteUpdates() {
        $("[data-route-path]").each(updateRoutePath);
        $("[data-route-tab]").each(updateRouteTab);
    }

    /**
     * Changes the current route softly (no page change).
     * @uses Same arguments as setRoute
     */
    function softSetRoute() {
        $.deeplink.softChangeNext = true;
        setRoute.apply(this, arguments);
    }

    /**
     * Changes the current route.
     * @param {string} route The route to change to.
     * @param {?string|Array<string>} title The new page title to set.
     * @param {?boolean} track Track the page change in history. Default true.
     */
    function setRoute(route, title, track) {
        track = track !== undefined ? track : $.deeplink.historyEnabled;

        pageTitle(title);

        // Remove a hash if any.
        if (route.substr(0, 1) === "#") {
            route = route.substr(1);
        }

        // Handle absolute or relative paths
        if (route.substr(0, 1) === "/") {
            route = absolutePath(route);
        } else {
            var query = {},
                l, k;

            route = getQuery(route, query).substr(1);
            if (route.substr(0, 1) === "-") {
                route = route.substr(1);
                if (route.indexOf("/+/") > -1) {
                    route = route.split("/+/");
                    k = route[1];
                    route = route[0];
                }

                if (k.substr(0) === "/") {
                    k = k.splice(0, -1);
                }

                l = $.deeplink.currentPath;
                route = "#" + absolutePath(l.substr(0, l.indexOf(route)));

                if (k) {
                    route += k;
                }

            } else {
                route = $.deeplink.currentPath + route;
            }

            query = $.extend(true, {}, $.deeplink.query, query);

            $.each($.extend({}, query), function (key, value) {
                if (!value) {
                    delete query[key];
                }
            });

            // To make query override current it needs to come last, so we just
            // dump the whole thing into a new object and reassign, using deep
            // copy just incase it's a complex param string.
            if (!$.isEmptyObject(query)) {
                route += "?" + $.param(query);
            }
        }

        if (staticMode) {
            window.location = route;
        } else {
            if (track) {
                Hash.go(route);
            } else {
                executeRoute(route);
                ignoreNext = true;
                window.location.replace("#" + route);
            }
        }
    }

    /**
     * Updates the provided route before setting it, using the current route.
     * In the provided route string, the value /$ is used to place whatever
     * part of the path is there into the string.
     * @param {string} route The route to change to.
     * @param {Object} params The params to set.
     * @param {?string|Array<string>} title The new page title to set.
     * @param {?boolean} track Track the page change in history. Default true.
     */
    function updateRoute(route, params, title, track) {
        var q = {},
            curPath = $.deeplink.currentPath.split("/");

        route = getQuery(route, q).split("/");
        $.each(route, function (i, v) {
            if (v === "$") {
                route[i] = curPath[i];
            }
        });

        $.extend(q, params);
        if ($.isEmptyObject(q)) {
            q = "";
        } else {
            q = "?" + $.param(q);
        }

        setRoute(route.join("/") + q, title, track);
    }

    /**
     * Removes all known routes from the system.
     */
    function purgeRoutes() {
        delegate.unbind();
        routes = {};
        trackedRoutes = [];
        notifyRoutes = [];
    }

    //------------------------------
    // Engine
    //------------------------------

    /**
     * Initiates the ready queue handler.
     */
    function tryReady() {
        if (!canReady && $.isFunction($.deeplink.holdUntil) &&
                $.deeplink.holdUntil()) {
            canReady = true;
            delegate.trigger("ready");
            if (readyQueue) {
                executeRoute(readyQueue);
            }
        }

        return canReady;
    }

    /**
     * Activates the history integration with the deeplink plugin.
     * @param {?string} start The default page to load.
     * @param {?function} h The holding function to use to prevent ready.
     * @param {?string} baseTitle The base page title. Uses current by default.
     * @param {?string} titleSeparator The separator for title parts.
     * @param {?boolean} useHistory Use browser history. Default true.
     */
    function activateDeeplinking(start, h, title, titleSeparator, useHistory) {
        if (!activated) {
            activated = true;

            if (!title) {
                title = loc("baseTitle");
            }

            $.deeplink.pageTitleBase = !!title ? title : document.title;
            $.deeplink.rootTitle = loc("rootTitle");
            $.deeplink.holdUntil = h;

            if ($.isFunction($.deeplink.holdUntil)) {
                canReady =$.deeplink.holdUntil();
            } else {
                canReady = true;
            }

            if (titleSeparator) {
                $.deeplink.titleSeparator = titleSeparator;
            }

            if (useHistory) {
                $.deeplink.historyEnabled = Boolean(useHistory);
            }

            delegate.trigger("activated");
            if (canReady) {
                delegate.trigger("ready");
            }

            pageTitle();
            Hash.init(executeRoute);
            setCurrent(window.location.hash.substr(1));

            if ($.deeplink.currentPath.length === 0 && start) {
                var q = $.param($.deeplink.query);
                if (q) {
                    q = "?" + q;
                }
                if (q && start === "/") {
                    // Adds a double slash in this corner case
                    start = "";
                }
                if (canReady) {
                    setRoute(start + q);
                } else {
                    readyQueue = start + q;
                }
            }
        }
    }

    function activateWithStaticParams(start, title, titleSeparator) {
        if (!activated) {
            activated = true;
            staticMode = true;

            if (!title) {
                title = loc("baseTitle");
            }

            $.deeplink.pageTitleBase = !!title ? title : document.title;
            $.deeplink.rootTitle = loc("rootTitle");

            if (titleSeparator) {
                $.deeplink.titleSeparator = titleSeparator;
            }

            $.deeplink.historyEnabled = true;

            delegate.trigger("activated");

            pageTitle();
            setCurrent(window.location.search || "?");

            if ($.isEmptyObject($.deeplink.query)) {
                if (start) {
                    setRoute(start);
                }
            } else {
                executeRoute(window.location.search);
            }
        }

    }

    /**
     * Sets up an application to work with deeplinking. The content will be
     * hidden whenever a new route is triggered. If the new route dispatches
     * a "loaded" event, the loading screen will hide and the content
     * will be displayed. If an error occurs (any event dispatched on the
     * "error" route), the error page will be shown.
     *
     * The use of the deeplink will attempt to draw error message content from
     * the "error" block where it's defined.
     *
     * @param {string} content The content wrapper selector.
     * @param {string} error The error wrapper selector.
     * @param {string} loading The loading wrapper selector.
     */
    function deeplinkApplication(content, error, loading) {
        var c = $(content),
            e = $(error),
            l = $(loading);

        $.each([c, e, l], function (i, elem) {
            elem.addClass("route-group");
        });

        delegate.bind("error", function (event, problem) {
            c.removeClass("active");
            e.addClass("active");
            l.removeClass("active");

            $(".error_message", error).text($.loc("error:" + problem));
        });

        delegate.bind("loading", function () {
            c.removeClass("active");
            e.removeClass("active");
            l.addClass("active");
        });

        delegate.bind("error", function () {
            $(window).trigger("error", ["deeplink:not_found"]);
        });

        delegate.bind("loaded", function (event, element) {
            c.addClass("active");
            e.removeClass("active");
            l.removeClass("active");
        });

        // Default to loading state
        c.removeClass("active");
        e.removeClass("active");
        l.addClass("active");
    }

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    $.deeplink = {

    //------------------------------
    // Properties
    //------------------------------

        softChangeNext: false,
        softChange: false,
        classNames: defaultClassNames,
        historyEnabled: true,
        currentPath: "",
        fullPath: "",
        query: {},
        isError: false,
        isLoading: false,
        // From the document.body or loc.deeplink.baseTitle
        pageTitleBase: null,
        pageTitleSeparator: " - ",
        // The prefix for all pages
        rootTitle: null,
        events: delegate,

    //------------------------------
    // Events
    //------------------------------

        bind: dProxy("bind"),
        one: dProxy("one"),
        on: dProxy("on"),
        off: dProxy("off"),
        trigger: dProxy("triggerHandler"),
        unbind: dProxy("unbind"),
        error: error,
        loaded: loaded,
        loading: loading,
        reload: reload,

    //------------------------------
    // Utilities
    //------------------------------

        trimPath: trimPath,
        absolutePath: absolutePath,
        pageTitle: pageTitle,
        pathMatch: pathMatch,
        matchToURL: matchToURL,

    //------------------------------
    // Routes
    //------------------------------

        route: addRoute,
        routes: addRoute,
        executeRoute: executeRoute,
        setRoute: setRoute,
        softSetRoute: softSetRoute,
        updateRoute: updateRoute,
        purgeRoutes: purgeRoutes,
        afterRoute: afterRoute,
        runRouteUpdates: runRouteUpdates,

    //------------------------------
    // Engine
    //------------------------------

        activate: activateDeeplinking,
        activateWithStaticParams: activateWithStaticParams,
        application: deeplinkApplication,
        holdUntil: null,
        tryReady: tryReady

    };

    $.extend($, {

    //------------------------------
    // Routes
    //------------------------------

        route: addRoute,
        routes: addRoute,
        setRoute: setRoute,
        updateRoute: updateRoute,
        afterRoute: afterRoute

    });

    //------------------------------
    // Startup
    //------------------------------

    if ($.localized) {
        $.localized(startup);
    } else {
        $(startup);
    }

    $(function () {
        $("body").append($("<div></div>").attr("id", "click-screen"));
    });

}(window.jQuery));

