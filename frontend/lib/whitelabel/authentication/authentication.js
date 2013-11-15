/**
 * Whitelabel authentication
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
         * Defines the login form.
         * @type {Object}
         */
    var LOGIN_FORM = {
            title: "Login",
            method: "API",
            action: "login",
            fields: {
                username: {
                    label: "Username",
                    rules: "required",
                    messages: "Please enter your username"
                },
                password: {
                    type: "password",
                    label: "Password",
                    rules: "required",
                    className: "user-password",
                    messages: "Please enter your password"
                }
            },
            controls: {
                login: {
                    type: "submit",
                    label: "Login",
                    className: "btn-primary"
                },
                create: {
                    label: "Create new user",
                    className: "btn",
                    attr: {
                        "data-lightbox": "create-user",
                        "data-form-mode": "construct"
                    }
                }
            },
            groups: {
                login: "*login *create"
            },
            layout: [
                "@",
                "username",
                "password",
                "+login"
            ],
            messages: {
                logoutTitle: "Success!",
                logout: "You have been logged out.",
                expiredTitle: "Expired!",
                expired: "Your session is no longer valid.",
                failureTitle: "Failed!",
                failure: "Your session could not be created!",
                errorTitle: "Error!",
                error: "Something went wrong!",
                codes: {
                    404: "Check your username and password!",
                    409: "Check your username and password!",
                    500: "Something really bad happened!"
                }
            }
        },

        /**
         * Defines the create user form.
         * @type {Object}
         */
        CREATE_USER_FORM = {
            title: "Create User",
            lightbox: "create-user",
            method: "API",
            action: "create-user",
            fields: {
                username: {
                    label: "Username",
                    rules: "required",
                    messages: "Please enter a username"
                },
                password: {
                    type: "password",
                    label: "Password",
                    rules: "required",
                    placeholder: "Password",
                    className: "user-password",
                    messages: "Please enter a password"
                },
                first_name: {
                    label: "First Name",
                    rules: "required",
                    placeholder: "First name",
                    messages: "Please enter a first name"
                },
                last_name: {
                    label: "Last Name",
                    rules: "required",
                    placeholder: "Last name",
                    messages: "Please enter a last name"
                },
                email: {
                    label: "Email",
                    rules: {
                        required: true,
                        email: true
                    },
                    messages: {
                        required: "Please enter your email.",
                        email: "Please enter a valid email."
                    }
                }
            },
            groups: {
                name: {
                    label: "Full name",
                    fields: "first_name last_name"
                },
                save: "*submit *cancel"
            },
            controls: {
                submit: {
                    type: "submit",
                    label: "Submit",
                    className: "btn-primary"
                },
                cancel: {
                    label: "Cancel",
                    attr: {
                        "data-lightbox": "!"
                    }
                }
            },
            layout: [
                "@",
                "username",
                "password",
                "+name",
                "email",
                "+save"
            ],
            messages: {
                successTitle: "Success!",
                errorTitle: "Error!",
                success: "Form submitted successfully!",
                error: "Something went wrong!",
                codes: {
                    500: "Something really bad happened!"
                },
                construct: {
                    success: "Item cerated successfully!",
                    error: "Error creating item!",
                    codes: {
                        409: "Username is taken!",
                        502: "Service didn't respond!"
                    }
                }
            }
        },

        /**
         * The lightbox for associating with knewton.
         * @type {Array}
         */
        ASSOCIATE_LIGHTBOX = ["div", [
            "p>We're almost done, we just have to associate your account with a Knewton profile. Click the button below to be redirected to Knewton.",
            "button[data-api=knewton-redirect].btn.btn-primary>Go to Knewton"
        ]],

    //------------------------------
    //
    // Properties
    //
    //------------------------------

        /**
         * A queue for handling api authentications.
         */
        apiAuth = [],

    //------------------------------
    // Localization
    //------------------------------

        /**
         * The localization document.
         */
        loc,

    //------------------------------
    // Queues
    //------------------------------

        /**
         * Authenticated callbacks.
         * @type {jQuery.Deferred}
         */
        authQueue = $.Deferred(),
        unauthQueue = $.Deferred(),
        alwaysQueue = $.Deferred(),
        againQueue = $.Callbacks(),

    //------------------------------
    // API
    //------------------------------

        /**
         * @type {APIProxy}
         */
        valid,

    //------------------------------
    // Authentication storage
    //------------------------------

        hasCreatedInterface = false,
        useAccessToken = false,

        /**
         * Authentication storage.
         * @param {Store}
         */
        db = new Store("authentication");

    //------------------------------
    //
    // Methods
    //
    //------------------------------

    //------------------------------
    // Processors
    //------------------------------

    function authenticateUser(data) {
        var token = "bearer ",
            tokenType;

        $.tokenPrefix = token;

        if (data === undefined || $.isArray(data)) {
            tokenType = db.get("authToken");
            if (tokenType) {
                $.api.authHeader = $.authToken = tokenType;
            }
            if ($.isArray(data)) {
                // Retail auth: /user/all
                data = data[0];
            } else {
                // Retail auth: /user/validate_access
                data = {};
            }
        } else {
            tokenType = data[useAccessToken ?  "knewton_token" : "token"];
            if (!tokenType) {
                if ($.useSesameAuth && tokenType === null) {
                    // This occurs when there is no knewton token during an
                    // account creation.
                    tokenType = data.token;
                } else {
                    // Retail style auth
                    tokenType = data.accessToken;
                    $.api.authHeader = token + tokenType;
                }
            }

            if ($.useSesameAuth) {
                $.api.authHeader = token + tokenType;
                $.authToken = token + data.token;
            } else {
                $.authToken = $.api.authHeader;
            }
            db.set("authToken", $.authToken);
            if ($.whitelabel.alwaysAuthenticate) {
                $.api("authenticated", authenticateUser, anon, data);
                return;
            }
        }

        $.currentUser = $.currentUser || data;
        $.includeThirdParty();
        $.holdReady();

        if ($.whitelabel.saveUserData) {
            db.set("userData", $.currentUser);
        }

        if ($.useSesameAuth && !data.has_knewton_token) {
            $.api.authHeader = $.authToken;
            $.lightbox("knewton-associate", $$(ASSOCIATE_LIGHTBOX), "noclose",
                    true);
        } else {
            if (authQueue.state() !== "pending") {
                againQueue.fire(data);
            } else {
                authQueue.resolve(data);
            }
        }

        if ($.whitelabel.authEveryTime) {
            anon();
        }
    }

    function createInterface() {
        if (hasCreatedInterface) {
            return;
        }
        hasCreatedInterface = true;
        $.form("login", LOGIN_FORM, "#login", true, authenticateUser);
        $.form("create-user", CREATE_USER_FORM, true, createUserSuccess);
        if ($.whitelabel.alwaysAuthenticate) {
            $.api("authenticated", authenticateUser, anon);
        }
    }

    //------------------------------
    // Manage session
    //------------------------------

    /**
     * Redirect to the Knewton API to associate an account.
     * @param {Object} data The response data.
     * @param {number} code Call status code.
     * @param {XMLHTTPRequest} xhr
     */
    function redirect(data, code, xhr) {
        var destination = xhr.getResponseHeader("Location"),
            href = encodeURIComponent(getRedirectUri());

        db.set("pre_redirect_hash", window.location.hash);

        // Firefox does not really support CORS in that it won't expose the
        // headers specified within Access-Control-Response-Headers at all.
        if (destination) {
            destination = decodeURIComponent(destination);
        } else {
            destination = data.redirect_uri;
        }

        window.location = destination.replace("%redirect_uri", href);
    }

    //------------------------------
    // Create
    //------------------------------

    function createUserSuccess(data) {
        if ($.useSesameAuth) {
            authenticateUser(data);
        }
    }

    //------------------------------
    // Logout
    //------------------------------

    function destroyed() {
        db.set("flash", $.logoutFlashType || "logout_success");
        db.set("authToken", null);
        db.set("userData", null);
        if ($.whitelabel.logoutDestination) {
            if ($.whitelabel.logoutGeneratesHistoryEvent) {
                window.location = $.whitelabel.logoutDestination;
            } else {
                window.location.replace($.whitelabel.logoutDestination);
            }
        }
        if ($.logoutFlashType !== "logout_expired" &&
                $.whitelabel.reloadOnLogout) {
            window.location.reload();
        }
    }

    //------------------------------
    // Valid
    //------------------------------

    /**
     * Triggered when an anonymous user enters the system.
     */
    function anon() {
        $.includeThirdParty();

        if ($.whitelabel.showLoginAsPage) {
            $(".application-pane:not(#application-body)").show();
        }
        $("#application-loading").hide();
        $("#authentication").show();

        if ($.whitelabel.canLogin) {
            createInterface();

            var flash = db.get("flash");
            if (flash) {
                if (flash === "logout_failure") {
                    $.form.message("login", "failure");
                } else if (flash === "logout_expired") {
                    $.form.message("login", "expired");
                } else if (flash === "logout_success") {
                    $.form.message("login", "logout");
                }
                db.set("flash", null);
            }

            $.form("login").element.find(":input:first").focus();
        } else {
            $("#login-container").hide();
            $("#unauthenticated-error").removeClass("hide");
        }

        if (!$.whitelabel.keepSession) {
            db.set("authToken", null);
            db.set("userData", null);
        }

        if ($.api.authHeader && $.whitelabel.authEveryTime) {
            alwaysQueue.resolve();
        } else {
            unauthQueue.resolve();
        }
    }

    //------------------------------
    // Common
    //------------------------------

    function bindProcessors() {
        if ($.useSesameAuth) {
            $.api("knewton-redirect", redirect);
        }
        $.api("logout", destroyed, destroyed);
        valid = $.api("authenticated", true, authenticateUser, function () {
            db.set("flash", "logout_expired");
            $.holdReady();
            anon();
        });
    }

    function getRedirectUri() {
        var l = window.location,
            query = $.extend({}, $.queryParams),
            href = l.protocol + "//" + l.host + l.pathname;

        delete query.state;
        delete query.code;

        if ($.isEmptyObject(query)) {
            query = "";
        } else {
            query = "?" + $.param(query);
        }

        return l.protocol + "//" + l.host + l.pathname + query;
    }

    //------------------------------
    // Authentication
    //------------------------------

    /**
     * Fetch or test an authentication token.
     */
    function tokenAuthentication(accessToken) {
        bindProcessors();

        useAccessToken = Boolean(accessToken);

        $.api.authHeader = db.get("authToken");
        $.currentUser = db.get("userData");

        var query = $.extend({}, $.queryParams),
            data,
            dest = window.location.origin + window.location.pathname,
            hash = db.get("pre_redirect_hash"),
            doRedirect = false,
            ignore = db.get("ignore_return");

        db.set("pre_redirect_hash", null);
        if (query.state && query.code) {
            data = {state: query.state,
                code: query.code,
                redirect_uri: getRedirectUri()};
            delete query.state;
            delete query.code;

            if (!$.isEmptyObject(query)) {
                dest += "?" + $.param(query);
            }

            dest += !!hash ? hash : window.location.hash;
            if (!ignore) {
                $.api("knewton-return", data, function () {
                    // Forward the user back to this page without query params
                    window.location = dest;
                }, function () {
                    // Figure out something better to do on failure
                    // @TODO: Call currently failing always because of CORS
                    window.location = dest;
                });
            } else {
                window.location = dest;
            }
            return;
        }

        if (query.partner) {
            $.knerdPartner = query.partner;
            db.set("knerdPartner", $.knerdPartner);
            delete query.partner;
            doRedirect = true;
        } else {
            $.knerdPartner = db.get("knerdPartner");
        }

        if (query.session) {
            db.set("authToken", decodeURIComponent(query.session));
            delete query.session;
            doRedirect = true;
        }

        if (doRedirect) {
            if (!$.isEmptyObject(query)) {
                dest += "?" + $.param(query);
            }
            dest += window.location.hash;
            window.location.replace(dest);
            return;
        }

        if ($.whitelabel.authEveryTime) {
            $(anon);
        } else {
            if ($.api.authHeader) {
                valid();
            } else {
                $.holdReady();
                $(anon);
            }
        }
    }

    /**
     * Resolve the authentication system with no user.
     */
    function anonymousAuthentication() {
        $.holdReady();
        authQueue.resolve(null);
        if ($.whitelabel.doLocalize) {
            $.localized($.includeThirdParty);
        }
    }

    //------------------------------
    // Account creation
    //------------------------------

    /**
     * Switch the login form shorthand to remove the account create button.
     * Must be done before token authentication is called.
     */
    function disableAccountCreation() {
        LOGIN_FORM.layout.pop();
        LOGIN_FORM.layout.push("*login");
    }

    /**
     * Switch the login form shorthand to add the account create button.
     * Must be done before token authentication is called.
     */
    function enableAccountCreation() {
        LOGIN_FORM.layout.pop();
        LOGIN_FORM.layout.push("+login");
    }

    //------------------------------
    //
    // Event bindings
    //
    //------------------------------

    //------------------------------
    // jQuery ready
    //------------------------------

    $.holdReady(true);

    //------------------------------
    //
    // Exposure
    //
    //------------------------------

    //------------------------------
    // API login queue
    //------------------------------

    $.api.login = function () {
        apiAuth.push($.makeArray(arguments));
    }

    authQueue.done(function () {
        $.each(apiAuth, function (index, args) {
            $.api.apply($.api, args);
        });
    });

    $.form.settings.elements.messages.expired = "div.alert.alert-warning";
    $.form.settings.elements.messages.failure = "div.alert.alert-warning";
    $.form.settings.elements.messages.logout = "div.alert.alert-success";

    $.extend($, {

    //------------------------------
    // Authentication
    //------------------------------

        loginForm: LOGIN_FORM,
        authenticated: authQueue.done,
        unauthenticated: unauthQueue.done,
        alwaysAuthenticated: alwaysQueue.done,
        againAuthenticated: againQueue.add,
        tokenAuthentication: tokenAuthentication,
        anonymousAuthentication: anonymousAuthentication,

    //------------------------------
    // Account creation
    //------------------------------

        disableAccountCreation: disableAccountCreation,
        enableAccountCreation: enableAccountCreation,
        useSesameAuth: true,

    //------------------------------
    // Manage session
    //------------------------------

        isAuthenticated: false,
        logout: function () {
            $.api("logout", {});
        },
        sessionDestroyed: destroyed
    });

}(window.jQuery));

