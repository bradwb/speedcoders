/**
 * jQuery API
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
    // Regular expressions
    //------------------------------

        /**
         * Matches colon-identified URL parameters. (/a/:b/c/:d/)
         * @type {RegExp}
         */
    var RX_URL_PARAMETERS = /:([a-z0-9_\-]+)\b/gi,

        /**
         * Matches vendor specific lines in content types.
         * application/<vendor_specific>+json -> application/json.
         * @type {RegExp}
         */
        RX_CONTENT_VENDOR = /([a-z0-9\._\-]+\+)/,

    //------------------------------
    // Plugin enhancement
    //------------------------------

        /**
         * Provide some enhanced functionality to plugins that are included.
         * @type {Object<string, boolean>}
         */
        ENHANCED_PLUGINS = {
            deeplink: false,
            markup: false
        },

    //------------------------------
    // Defaults
    //------------------------------

        /**
         * The default options for an API call.
         *
         * An optional transformer function can be defined to modify the result
         * of a successful call before it is dispatched. It receives the data
         * and httpStatus of the call as args.
         *
         * @type {Object}
         */
        DEFAULT_CALL = {
            paramCache: false,
            url: "",
            textKey: null,
            type: "GET",
            dataType: "json",
            cache: false,
            cacheFirst: false,
            headers: {},
            data: {},
            queryParams: null,
            customSuccess: [],
            authenticated: false,
            ignoreBaseURL: false,
            urlGroup: null,
            entity: null,
            format: null,
            transformer: null,
            asyncTransformer: null,
            whitelist: null,
            blacklist: null,
            andCall: [],
            thenCall: null
        },

        /**
         * The default options for a database entity.
         *
         * If a call is marked as "multiple", the assumption is that the base
         * object will be iterated through to extract data. This iterator is
         * used as the callback to a jQuery.map function; it receives a single
         * object and that object's index or key and must return the object
         * to be stored or null|undefined to remove that object from the list.
         *
         * @type {Object}
         */
        DEFAULT_ENTITY = {
            type: "",
            key: "id",
            multiple: false,
            remove: false,
            // @type {function(Object, number|string):Object?}
            iterator: null
        },

        /**
         * The settings for the API queue.
         */
        DEFAULT_QUEUE = {
            abortOnFail: false,
            throttle: 0
        },

    //------------------------------
    //
    // Properties
    //
    //------------------------------

    //------------------------------
    // Calls
    //------------------------------

        /**
         * Defined API calls.
         * @type {Object<string, Object<string, string>>}
         */
        calls = {},
        cache = {},

        /**
         * The queue of calls to fire so to not shotgun blast the backend.
         */
        queueSettings,
        queue = null,
        queueCalls = false,
        emptyQueue = false,
        queueThrottle = null,

    //------------------------------
    // Global events
    //------------------------------

        /**
         * Global callback handlers.
         * @type {jQuery.Callbacks}
         */
        globalSuccessful = $.Callbacks("unique"),
        globalFailure = $.Callbacks("unique"),
        globalTimeout = $.Callbacks("unique"),
        globalComplete = $.Callbacks("unique");

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    //------------------------------
    // Utility
    //------------------------------

    /**
     * Conditionally returns a function listener which removes itself.
     * @param {Callbacks} cb The callbacks queue.
     * @param {function} fn The listener function.
     */
    function onceProxy(cb, fn) {
        return function () {
            fn.apply(fn, arguments);
            cb.remove(fn);
        };
    }

    /**
     * Extracts details from an XHR object.
     * @param {XMLHTTPRequest} xhr
     * @param {boolean=} extractPayload Add the payload.
     * @param {boolean=} asJSON Parse response as json.
     * @return {number|Object} The details.
     */
    function extractDetails(xhr, extractPayload, asJSON) {
        var d = {
            code: undefined,
            payload: undefined
        };

        try {
            d.code = xhr.status;
        } catch (codeError) {}

        if (!extractPayload) {
            return d.code;
        }

        try {
            d.payload = xhr.responseText;
            if (asJSON) {
                try {
                    d.payload = $.parseJSON(d.payload);
                } catch (textError) {}
            }
        } catch (e) {}

        return d;
    }

    //------------------------------
    // API
    //------------------------------

    /**
     * Creates a new API call.
     * @param {string} name The name of the call.
     * @param {Object} options The options for the call.
     */
    function createCall(name, options, basis) {
        // Ensure the entity is configured properly if configured at all.
        if (options.entity) {
            options.entity = $.extend({}, DEFAULT_ENTITY, options.entity);
        }

        if (typeof options.andCall === "string") {
            options.andCall = [options.andCall];
        }

        if (!$.isArray(options.andCall)) {
            delete options.andCall;
        }

        if (options.queryParams) {
            if (typeof options.queryParams === "string") {
                options.queryParams = [options.queryParams];
            }

            if ($.isArray(options.queryParams) &&
                    options.queryParams.length === 0) {
                delete options.queryParams;
            }

            if ($.isPlainObject(options.queryParams) &&
                    $.isEmptyObject(options.queryParams)) {
                delete options.queryParams;
            }
        }

        calls[name] = $.extend(true, {}, basis || DEFAULT_CALL, options, {
            name: name,
            parameters: options.url.match(RX_URL_PARAMETERS),
            successful: $.Callbacks("unique"),
            failure: $.Callbacks("unique"),
            expired: $.Callbacks("unique"),
            complete: $.Callbacks("unique"),
        });
    }

    /**
     * Bind listeners to an API call.
     * @param {string} name The name of the call.
     * @param {?function(Object|string, number)=} success The success handler.
     * @param {?function(number, Object|string)=} failure The failure handler.
     * @param {?function()=} complete The complete handler.
     * @param {?function(number, Object|string)=} failure The timeout handler.
     */
    function bindCall(name, success, failure, complete, timeout) {
        var c = calls[name];
        if ($.isFunction(success)) {
            c.successful.add(success);
        }
        if ($.isFunction(failure)) {
            c.failure.add(failure);
        }
        if ($.isFunction(complete)) {
            c.complete.add(complete);
        }
        if ($.isFunction(timeout)) {
            c.expired.add(timeout);
        }
    }

    /**
     * Creates a proxy for interceptors to complete the request later.
     * @param {c} The call.
     * @param {r} The response.
     * @param {urlp} URL Parameters.
     * @param {data} Request data.
     * @param {name} The name.
     */
    function interceptCompleteProxy(c, r, urlp, data, name, headers) {
        return function (code, resp) {
            var msg = [code, c.type.toUpperCase(), c.url, "(" + name + ")"]
                    .join(" "),
                customSuccess = false;

            if (c.customSuccess.length > 0) {
                customSuccess = $.inArray(code, c.customSuccess) > -1;
            }

            if (customSuccess ||
                (code >= 200 && code < 300 && $.inArray(code, [301, 304]))) {
                console.info(msg);
                callSuccess(c, resp || r, code, null, urlp, data, headers);
            } else {
                console.error(msg);
                callFailure(c, code, resp || r, null, urlp, data);
            }
        }
    }

    /**
     * Makes an API call.
     * @param {string} name The name of the call.
     * @param {Object} data The data for the call.
     * @param {Object=} headers Any headers for the call.
     * @param {boolean} Internal. For queue processing?
     */
    function invokeCall(name, data, headers, forQueue) {
        if (queueCalls && !forQueue) {
            queue.push([name, data, headers, true]);
            return;
        }

        var c = $.extend({}, calls[name]),
            urlp,
            r, code,
            contentType,
            proxy,
            m, pc,
            trashData = {},
            unused = [];

        if (c.andCall) {
            $.each(c.andCall, function (i, n) {
                invokeCall(n, data, headers, forQueue);
            });
        }

        // Clone the object before working on it
        data = $.extend(true, {}, DEFAULT_CALL.data, c.data, data);

        if ($.isFunction(c.format)) {
            data = c.format(data);
        }

        if ($.isArray(c.parameters)) {
            urlp = {};
            $.each(c.parameters, function (i, parameter) {
                // Remove the colon
                var p = parameter.substr(1);
                if (!data || !data[p]) {
                    throw "Missing URL parameter: " + p;
                }
                c.url = c.url.replace(parameter, data[p]);
                urlp[p] = data[p];
                delete data[p];
            });
        }

        // Object {urlKey: dataKey}
        if (c.queryParams) {
            if ($.isArray(c.queryParams)) {
                $.each(c.queryParams, function (i, key) {
                    urlp[key] = data[key];
                });
            } else if ($.isPlainObject(c.queryParams)) {
                $.each(c.queryParams, function (key, value) {
                    urlp[key] = data[value];
                });
            }
        }

        if (c.blacklist) {
            if (c.blacklist === "*") {
                data = {};
            } else {
                if (!$.isArray(c.blacklist)) {
                    c.blacklist = [c.blacklist];
                }

                $.each(c.blacklist, function (i, k) {
                    if (data[k] !== undefined) {
                        trashData[k] = data[k];
                        delete data[k];
                    }
                });
            }
        }

        if (c.whitelist) {
            if (c.whitelist !== "*") {
                if (!$.isArray(c.whitelist)) {
                    c.whitelist = [c.whitelist];
                }

                m = $.extend({}, data);
                $.each(data, function (k, v) {
                    if ($.inArray(k, c.whitelist) === -1) {
                        delete m[k];
                    }
                });

                $.each(trashData, function (k, v) {
                    if ($.inArray(k, c.whitelist) > -1) {
                        if (m[k] === undefined) {
                            m[k] = v;
                        }
                    }
                });
                data = m;
            }
        }

        if (c.paramCache) {
            pc = paramize(c, urlp, data);
            if (cache[c.name] && cache[c.name][pc]) {
                callSuccess.apply(window, cache[c.name][pc]);
                return;
            }
        }

        $.extend(c.headers, headers);

        if (c.authenticated && $.api.authHeader) {
            c.headers.Authorization = $.api.authHeader;
        }

        contentType = (c.contentType || c.headers["Content-Type"] || "")
                .replace(RX_CONTENT_VENDOR, "");

        if (c.urlGroup) {
            if (!$.api.baseURLGroups[c.urlGroup]) {
                throw ["jQuery.api:", c.name, "undefined group", c.urlGroup]
                        .join(" ");
            }

            c.url = $.api.baseURLGroups[c.urlGroup] + c.url;
        } else if ($.api.baseURL && !c.ignoreBaseURL) {
            c.url = $.api.baseURL + c.url;
        }

        if (c.interceptor !== undefined) {
            if (!c.interceptWithArray) {
                r = {};
            } else {
                r = [];
            }
            proxy = interceptCompleteProxy(c, r, urlp, data, name, headers);
            // Return 0 to ignore intercept
            // Return -1 to wait for proxy
            code = c.interceptor(r, data, headers, urlp, c.url, proxy);
            if (code !== 0) {
                if (code > 0) {
                    proxy(code);
                }
                return;
            }
        }

        if (contentType === "text/plain" && c.textKey !== null) {
            data = data[c.textKey];
        }

        if (contentType === "application/json" &&
                c.type.toUpperCase() !== "GET") {
            data = window.JSON.stringify(data);
        }

        if (c.cacheFirst !== false) {
            if (c.cacheFirst === true) {
                c.cache = true;
                c.cacheFirst = $.now();
            }

            data._ = c.cacheFirst;
        }

        $.ajax($.extend(c, {
            data: data,
            context: {
                urlParameters: urlp,
                headers: headers,
                apiCall: calls[name],
                data: data
            }
        }));
    }

    //------------------------------
    //
    // CallProxy
    //
    //------------------------------

    /**
     * The CallProxy class.
     *
     * You can bind any number of success or error handlers to this proxy,
     * and they will only be fired when the proxy instance makes the call.
     *
     * @param {string} name The call the proxy is created for.
     */
    function CallProxy(name) {
        this.name = name;
        this.active = false;
        this.after = $.Callbacks("unique");
        var self = this;
        bindCall(name, null, null, function () {
            if (self.active) {
                self.after.fire();
            }
            self.active = false;
        });
    }


    /**
     * Wraps a function to only be dispatched when active.
     * @param {function} fn The function to wrap.
     */
    function wrap(fn) {
        var self = this;
        return function () {
            if (self.active) {
                fn.apply(fn, arguments);
            }
        };
    }

    /**
     * Sets up listeners for the proxy.
     * @param {function(Object|string, number)=} success The success handler.
     * @param {function(number, Object|string)=} failure The failure handler.
     * @param {function()} complete The completed handler.
     * @return {CallProxy}
     */
    function proxyBind(success, failure, complete, timeout) {
        if ($.isFunction(success)) {
            success = this.wrap(success);
        }
        if ($.isFunction(failure)) {
            failure = this.wrap(failure);
        }
        if ($.isFunction(complete)) {
            complete = this.wrap(complete);
        }
        if ($.isFunction(timeout)) {
            timeout = this.wrap(timeout);
        }
        bindCall(this.name, success, failure, complete, timeout);
        return this;
    }

    /**
     * Invoke the proxy.
     * @param {Object=} data The data.
     * @param {Object<string, string>=} headers The headers.
     * @return {CallProxy}
     */
    function proxyInvoke(data, headers) {
        this.active = true;
        invokeCall(this.name, data, headers);
        return this;
    }

    /**
     * Build the class.
     */
    $.extend(CallProxy.prototype, {
        wrap: wrap,
        proxyBind: proxyBind,
        proxyInvoke: proxyInvoke
    });

    //------------------------------
    // Handlers
    //------------------------------

    /**
     * Handles an entity action, given a type and some data.
     * @param {Object} entity The entity definition.
     * @param {*} data The data to store.
     * @param {Object} urlp The url parameters for this call.
     */
    function handleEntity(entity, data, urlp) {
        if (!$.database[entity.type]) {
            $.database[entity.type] = {};
        }

        if (entity.multiple && entity.iterator) {
            data = $.map(data, entity.iterator);
        }

        var o = $.database[entity.type],
            fn;

        if (!entity.remove) {
            fn = function (k, v) {
                var dbKey = v[entity.key];
                if (dbKey === undefined) {
                    dbKey = urlp[entity.key];
                }

                if (dbKey) {
                    o[dbKey] = v;
                }
            };
        } else {
            fn = function (k, v) {
                var dbKey = v[entity.key];
                if (dbKey === undefined) {
                    dbKey = urlp[entity.key];
                }
                if (dbKey) {
                    delete o[dbKey];
                }
            };
        }

        data = $.extend({}, data, urlp);

        if (entity.multiple) {
            $.each(data, fn);
        } else {
            fn(null, data);
        }
    }

    /**
     * Handle a call as successful.
     * @param {APICall} c The call.
     * @param {*} data The data returned.
     * @param {number} code The status code.
     * @param {XMLHTTPRequest?} xhr
     * @param {Object} urlp The url parameters for this call.
     * @param {Object} h Headers.
     * @param {boolean} cached Internal.
     * @param {boolean} async Internal.
     */
    function callSuccess(c, data, code, xhr, urlp, query, h, cached, async) {
        if (!cached) {
            if (!async && $.isFunction(c.asyncTransformer)) {
                c.asyncTransformer(function (d) {
                    callSuccess(c, d || data, code, xhr, urlp, query, h,
                            false, true);
                }, data, code, xhr, urlp, query);
                return;
            }

            if ($.isFunction(c.transformer)) {
                data = c.transformer(data, code, xhr, urlp, query) || data;
            }

            if (c.entity) {
                handleEntity(c.entity, data, urlp, query);
            }

            if (c.paramCache) {
                if (cache[c.name] === undefined) {
                    cache[c.name] = {};
                }

                var pc = paramize(c, urlp, query);
                // True is for cached var
                cache[c.name][pc] = [c, data, code, xhr, urlp, query, h, true];
            }
        }

        c.successful.fire(data, code, xhr, urlp, query);
        c.complete.fire();

        globalSuccessful.fire(c.name, data, code, xhr, urlp, query);
        globalComplete.fire(c.name);

        if (c.thenCall) {
            $.each(c.thenCall, function (n, d) {
                // We want to actually override with the default call data
                var callData;
                if (d === "*") {
                    callData = data;
                } else {
                    callData = {};
                    if ($.isFunction(d)) {
                        callData = d(data);
                    } else if ($.isPlainObject(d)) {
                        $.each(d, function (k, v) {
                            v = v || k;
                            callData[v] = data[k];
                        });
                    } else {
                        if (!$.isArray(d)) {
                            d = [d];
                        }
                        $.each(d, function (i, k) {
                            callData[k] = data[k];
                        });
                    }
                }

                invokeCall(n, callData, h);
            });
        }

        drainQueue();
    }

    /**
     * Creates a paramize string for cache storage.
     * @param {APICall} c The call.
     * @param {Object} urlp The url parameters.
     * @param {*} data The call data.
     */
    function paramize(c, urlp, data) {
        var pc = $.extend(true, {}, urlp);
        if (c.type.toUpperCase() !== "POST") {
            $.extend(pc, data);
        }

        return $.param(pc);
    }

    /**
     * Handles successful ajax calls.
     * @param {*} data The data returned.
     * @param {string} st The status text.
     * @param {XMLHTTPRequest} xhr
     */
    function successHandler(data, st, xhr) {
        var c = this.apiCall,
            d = this.data;
        callSuccess(c, data, extractDetails(xhr), xhr, this.urlParameters, d,
            this.headers);
    }

    /**
     * Handle a call as unsuccessful.
     * @param {APICall} c The call.
     * @param {number} code The status code.
     * @param {*} data The data returned.
     * @param {XMLHTTPRequest?} xhr
     * @param {Object} urlp The url parameters for this call.
     */
    function callFailure(c, code, data, xhr, urlp) {
        c.failure.fire(code, data, xhr, urlp);
        c.complete.fire();

        globalFailure.fire(c.name, code, data, xhr, urlp);
        globalComplete.fire(c.name);

        if (queueSettings && queueSettings.abortOnFail)  {
            endQueue();
        } else {
            drainQueue();
        }
    }

    /**
     * Handle a call as timing out.
     * @param {APICall} c The call.
     * @param {Object} urlp The url parameters for this call.
     */
    function callTimeout(c, urlp) {
        c.expired.fire(urlp);
        c.complete.fire();

        globalTimeout.fire(c.name, urlp);
        globalComplete.fire(c.name);

        if (queueSettings && queueSettings.abortOnFail)  {
            endQueue();
        } else {
            drainQueue();
        }
    }

    /**
     * Handles failed ajax calls.
     * @param {XMLHTTPRequest} xhr
     * @param {string} reason
     */
    function errorHandler(xhr, reason) {
        var c = this.apiCall,
            d;

        if (reason === "timeout") {
            callTimeout(c, c.urlParameters);
        } else {
            d = extractDetails(xhr, true, c.dataType === "json");
            callFailure(c, d.code, d.payload, xhr, c.urlParameters);
        }
    }

    //------------------------------
    // API
    //------------------------------

    /**
     * Interface for API commands.
     * @param {string} name The name of the call.
     *
     * Create:
     * @param {Object} options The options for the call.
     * @param {string} urlGroup The URL group this belongs to.
     *
     * Result binding:
     * @param {boolean=} proxy If true, a proxy is returned.
     * @param {?function(Object, number)=} success
     * @param {?function(number, Object|string)=} error
     *
     * Invocation:
     * @param {Object=} data The data for the call.
     * @param {Object<string, string>=} headers Headers for the call.
     *
     * Proxy:
     * @return {CallProxy} A call proxy object.
     *
     * Without Proxy:
     * @return {function(Object, Object<string, string>} The call invoker.
     */
    function api(var_args) {
        var args = $.makeArray(arguments),
            name = args.shift(),
            hasArgs = args.length > 0,
            argparse = {},
            proxy = false,
            o, c, p;

        if ($.isArray(name)) {
            o = [];
            $.each(name, function (i, n) {
                o.push(api.apply(window, [n].concat(args)));
            });
            return o;
        }

        $.each(args, function (i, v) {
            var t = (v instanceof jQuery) ? "jquery" : $.type(v);

            // Nulls offset function pointers
            if (t === "null") {
                t = "function";
            }

            if (argparse[t]) {
                argparse[t].push(v);
            } else {
                argparse[t] = [v];
            }
        });

        if (calls[name] === undefined) {
            if (!argparse.object) {
                if (argparse.string) {
                    argparse.object = [{url: argparse.string.shift()}];
                } else {
                    throw "jQuery.api: no options provided for call " + name;
                }
            }

            o = argparse.object.shift();
            if (argparse.string && argparse.string.length) {
                o.urlGroup = argparse.string.shift();
            }

            createCall(name, o);
        }

        c = calls[name];
        if (c === undefined) {
            throw "jQuery.api: " + name + " is not a defined call";
        }

        if (argparse["boolean"]) {
            proxy = argparse["boolean"].shift();
        }

        if (proxy) {
            p = new CallProxy(name);

            if (argparse["function"]) {
                p.proxyBind.apply(p, argparse["function"]);
            }

            if (argparse.object && argparse.object.length) {
                p.proxyInvoke.apply(p, argparse.object);
            }

            return (function () {
                var call = function (data, headers) {
                    p.proxyInvoke(data, headers);
                };

                call.bind = function () {
                    p.proxyBind.apply(p, arguments);
                };
                return call;
            }());
        }

        if (argparse["function"]) {
            bindCall.apply(bindCall, [name].concat(argparse["function"]));
        }

        if (argparse.object && argparse.object.length || !hasArgs) {
            invokeCall.apply(invokeCall, [name].concat(argparse.object));
        }

        return function (data, headers) {
            invokeCall(name, data, headers);
        };
    }

    /**
     * Defines the name/values of URL groups. A URL group is used to put a
     * base URL before each of the calls described. If a given call belongs
     * to a group, that URL is prefixed before the call even if ignoreBaseURL
     * is set to true. If no group is described, the baseURL will be used (if
     * it has been defined).
     *
     * With Object:
     * @param {Object<string, string>} groups An object of group name to url.
     *
     * With Strings:
     * @param {string} name The group name.
     * @param {string} url The url.
     */
    function urlGroup(var_args) {
        var args = $.makeArray(arguments);
        if ($.isPlainObject(args[0])) {
            $.extend($.api.baseURLGroups, args[0]);
        } else {
            $.api.baseURLGroups[args.shift()] = args.shift();
        }
    }

    //------------------------------
    // Intercept
    //------------------------------

    /**
     * Set an interceptor for a call.
     * @param {string} name The name of the call.
     * @param {function(Object<string, Object|string}, Object<string, *>=,
     *      Object<string, string>=,):number} interceptor A function.
     *      Arg[0]: An empty object which should be populated with the call
     *              response. Place the intended response in either a "text" or
     *              "json" key within the resposne object.
     *      Arg[1]: Any data provided to the API call.
     *      Arg[2]: Any headers provided to the API call.
     *      Arg[3]: Any url parameters used in the API call.
     *      Response: The status code for the call (200, 204, 404, 500, etc)
     * @param {boolean=} isArray Make the response object an array.
     */
    function intercept(name, interceptor, isArray) {
        if ($.isArray(name)) {
            $.each(name, function (i, v) {
                intercept(v, interceptor, isArray);
            });
            return;
        }

        var c = calls[name];
        if (c === undefined) {
            throw name + " is not a defined API call";
        }
        c.interceptor = interceptor;
        c.interceptWithArray = !!isArray;
    }

    //------------------------------
    // Inline
    //------------------------------

    /**
     * Elements with [data-api] triggers calls.
     * Add data using $().data("apiData", {...})
     * @param {jQuery} context The context.
     */
    function extractInlineAPI(context) {
        $("[data-api]", context).on("click", function (event) {
            event.preventDefault();

            var e = $(this),
                o = e.data("apiData");

            if (!$.isPlainObject(o)) {
                try {
                    o = $.parseJSON(o);
                } catch (e) {
                }
            }

            if ($.isFunction(o)) {
                o = o.apply(e);
            }

            if (!o) {
                o = {};
            }

            api(e.data("api"), o);
        });
    }

    //------------------------------
    // Queue
    //------------------------------

    function endQueue() {
        if (queue && queue.length > 0) {
            console.error("jQuery.api: Queue abort with " + queue.length +
                    " remaining");
        }
        queueSettings = null;
        emptyQueue = false;
        queueCalls = false;
        queue = null;
    }

    function execQueue() {
        queueThrottle = null;
        drainQueue(true);
    }

    function drainQueue(doNow) {
        if (queueCalls && emptyQueue) {
            if (!doNow && queueSettings.throttle > 0) {
                if (queueThrottle !== null) {
                    clearTimeout(queueThrottle);
                }
                queueThrottle = setTimeout(execQueue, queueSettings.throttle);
                return;
            }

            if (queue.length > 0) {
                invokeCall.apply(invokeCall, queue.shift());
            } else {
                endQueue();
            }
        }
    }

    /**
     * Starts a call queue which prevents the calls from bunching up on
     * each other.
     * @param {Object} settings The settings for the call queue.
     */
    function startQueue(settings) {
        queueSettings = $.extend(true, {}, DEFAULT_QUEUE, settings);
        queueCalls = true;
        queue = [];
    }

    /**
     * Triggeres the clearing of the call queue.
     */
    function processQueue() {
        emptyQueue = true;
        drainQueue(true);
    }

    //------------------------------
    // Helpers
    //------------------------------

    /**
     * Creates REST-standard CRUD (create, read, update, delete) calls.
     * Uses proper HTTP 1.1 standard verbage.
     *
     * Creating CRUD for the type "foo" creates the calls:
     *  all-foo (GET)
     *  create-foo (POST)
     *  get-foo (GET)
     *  update-foo (PUT (can use post))
     *  delete-foo (DELETE)
     *
     * @param {string|Array<string>} type The type to use. If an array is
     *      provided, the second arg is the name for the all-type call.
     *      (["foo", "foos"] makes all-foos instead of the standard all-foo)
     * @param {string} base The base URL to use.
     * @param {string} id The ID part of the path. Uses /:id by default.
     * @param {boolean?} postUpdate Use POST instead of PUT for the update.
     * @param {Object} overrides A set of overrides for handling poorly
     *      implemented rest services.
     * @return {Object} The settings for this crud call group.
     */
    function restCRUD(type, base, opts, id, postUpdate, overrides) {
        if (id === undefined) {
            id = ":id";
        }

        if (id.substr(0, 1) !== "/") {
            id = "/" + id;
        }

        var entityURI = base + id,
            pluralType,
            entity,
            o;

        if ($.isArray(type)) {
            pluralType = type[1];
            type = type[0];
        } else {
            pluralType = type;
        }

        o = {
            type: type,
            plural: pluralType,
            baseURI: base,
            entityURI: entityURI,
            calls: {
                all: "all-" + pluralType,
                create: "create-" + type,
                get: "get-" + type,
                update: "update-" + type,
                remove: "delete-" + type,
                "delete": "delete-" + type
            }
        };

        entity = {
            type: type
        };

        if (!$.isPlainObject(opts)) {
            opts = {};
        }

        if (!$.isPlainObject(overrides)) {
            overrides = {};
        }

        api(o.calls.all, $.extend({}, opts, {
            url: base,
            entity: $.extend({multiple: true}, entity)
        }, overrides.all));

        api(o.calls.create, $.extend({}, opts, {
            url: base,
            type: "POST",
            entity: entity
        }, overrides.create));

        api(o.calls.get, $.extend({}, opts, {
            url: entityURI,
            entity: entity
        }, overrides.get));

        api(o.calls.update, $.extend({}, opts, {
            url: entityURI,
            type: Boolean(postUpdate) ? "POST" : "PUT",
            entity: entity
        }, overrides.update));

        api(o.calls.remove, $.extend({}, opts, {
            url: entityURI,
            type: "DELETE",
            entity: $.extend({remove: true}, entity)
        }, overrides.remove));

        return o;
    }

    //------------------------------
    // Deeplink enhancement
    //------------------------------

    /**
     * The deeplink enhancement interface.
     *
     * If localization is also used, you are encouraged to not set an error
     * handler and simply define a string of the same name of the call in the
     * localization's "error" block to automagically display that error page
     * whenever the call fails.
     *
     * The call will pass through any url parameters to the API call as is,
     * so be consistent with the names of your parameters between both the
     * api and the deeplink routing. It's encouraged you also prefix your
     * variable IDs when using deeplink api routing (:foo_id instead of :id).
     *
     * @param {string} route The route.
     * @param {string} name The API call.
     * @param {function(data)} success The api success handler.
     * @param {function?} err The api error handler.
     * @param {function()?} complete The api complete handler.
     */
    function deeplink(route, name, success, err, complete) {
        if ($.isArray(name)) {
            $.each(name, function (i, n) {
                deeplink(route, n, success, err, complete);
            });
            return;
        }

        var data,
            p,
            completer;

        if ($.isFunction(complete)) {
            completer = function () {
                complete(data);
            };
        }
        p = api(name, true, success, err, completer);

        $.route(route, function (event, params, query) {
            data = $.extend({}, params, query);
            p(data);
        });
    }

    /**
     * Be notified when a route is triggered, not when a call finishes.
     * Also invokes the call.
     * @param {string} route The route.
     * @param {string} name The API call.
     * @param {function(data)} notifier The deeplink route handler.
     */
    function onDeeplink(route, name, notifier) {
        if ($.isArray(name)) {
            $.each(name, function (i, n) {
                onDeeplink(route, n, notifier);
            });
            return;
        }

        $.route(route, function (event, params, query) {
            var data = $.extend({}, params, query);
            api(name, data);
            if ($.isFunction(notifier)) {
                notifier(data);
            }
        });
    }

    /**
     * Be notified when a call completes.
     * Also invokes the call.
     * @param {string} route The route.
     * @param {string} name The API call.
     * @param {function()} handler The handler.
     */
    function afterDeeplink(route, name, handler) {
        deeplink(route, name, null, null, handler);
    }

     /**
      * If an API call fails and it's name is in localization.error, handle it.
      * @param {string} callName The call that failed.
      */
    function deeplinkError(callName) {
        var l = $.localization;
        if (!l || !l.error) {
            return;
        }

        if (l.error[callName]) {
            $.deeplink.error(callName);
        }
    }

    /**
     * A proxy to hold calls to routes for deeplink enhancement while loading.
     */
    function pendingRoutes(fn) {
        if (fn.pending === undefined) {
            fn.pending = [];
        }

        return function () {
            fn.pending.push($.makeArray(arguments));
        }
    }

    //------------------------------
    // Plugin enhancement
    //------------------------------

    /**
     * Enhance plugins based on what exists.
     */
    function pluginEnhancement() {
        var enhanced = ENHANCED_PLUGINS;
        if ($.markup && !enhanced.markup) {
            enhanced.markup = true;
            $.markup.queue.add(extractInlineAPI);
        }

        if ($.deeplink && !enhanced.deeplink) {
            enhanced.deeplink = true;

            $.each({route: deeplink,
                    onRoute: onDeeplink,
                    afterRoute: afterDeeplink}, function (k, fn) {
                if (fn.pending) {
                    $.each(fn.pending, function (i, args) {
                        fn.apply(window, args);
                    });
                    delete fn.pending;
                }
                $.api[k] = fn;
            });
        }

        if ($.loc && enhanced.deeplink && !enhanced.localization) {
            enhanced.localization = true;
            globalFailure.add(deeplinkError);
        }
    }

    function cloneCall(name, as, options) {
        if (!$.api.calls[as] && $.api.calls[name]) {
            createCall(as, $.api.calls[name], options);
            return $.api.calls[as];
        }

        return $.api.calls[as];
    }

    //------------------------------
    //
    // Event bindings
    //
    //------------------------------

    //------------------------------
    // API
    //------------------------------

    $.extend(DEFAULT_CALL, {
        success: successHandler,
        error: errorHandler
    });

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    //------------------------------
    // API
    //------------------------------

    $.extend($, {
        api: api
    });

    $.extend($.api, {

        cloneCall: cloneCall,
        defaults: DEFAULT_CALL,
        cache: cache,
        authHeader: null,
        baseURL: null,
        baseURLGroups: {},
        urlGroup: urlGroup,

    //------------------------------
    // Helpers
    //------------------------------

        restCRUD: restCRUD,

    //------------------------------
    // Deeplink
    //------------------------------

        route: pendingRoutes(deeplink),
        onRoute: pendingRoutes(onDeeplink),
        afterRoute: pendingRoutes(afterDeeplink),

    //------------------------------
    // Handlers
    //------------------------------

        calls: calls,
        handleEntity: handleEntity,

    //------------------------------
    // Intercept
    //------------------------------

        intercept: intercept,

    //------------------------------
    // Inline
    //------------------------------

        extract: extractInlineAPI,

    //------------------------------
    // Call Queue
    //------------------------------

        queue: startQueue,
        processQueue: processQueue,
        purgeQueue: endQueue,

    //------------------------------
    // Global events
    //------------------------------

        success: globalSuccessful.add,
        failure: globalFailure.add,
        timeout: globalTimeout.add,
        complete: globalComplete.add

    });

    //------------------------------
    // Database
    //------------------------------

    $.database = {};

    //------------------------------
    // Plugin enhancement
    //------------------------------

    pluginEnhancement();
    $(function () {
        extractInlineAPI();
        pluginEnhancement();
    });

}(window.jQuery));

