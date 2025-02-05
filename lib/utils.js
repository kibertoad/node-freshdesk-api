/*
Node wrapper for Freshdesk v2 API

Copyright (C) 2016-2018 Arjun Komath <arjunkomath@gmail.com>
Copyright (C) 2016-2018 Maksim Koryukov <maxkoryukov@gmail.com>

This program is free software: you can redistribute it and/or modify
it under the terms of the MIT License, attached to this software package.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.

You should have received a copy of the MIT License along with this
program. If not, see <https://opensource.org/licenses/MIT>.

http://spdx.org/licenses/MIT
*/

/**
 * Freshdesk API utilities
 *
 * @module
 */

"use strict";

const axios = require("axios");
const debug = require("debug")("freshdesk-api");
const FormData = require("form-data");

/**
 * Freshdesk's API protocol violations
 *
 * @param {String}  message Error message
 * @param {Number}  status  HTTP status of the received Freshdesk-response. Could be useful for debugging
 * @param {Object}  data    Parsed response of the Freshdesk API
 */
class FreshdeskError extends Error {
	constructor(message, data, res) {
		super();

		this.name = "FreshdeskError";
		this.message = message || "Error in Freshdesk's client API";
		this.stack = new Error().stack;

		this.data = data;

		this.status = res.status;
		this.apiTarget = `${res.request.method} ${res.request.path}`;
		this.requestId = res.headers["x-request-id"];
	}
}

function createResponseHandler(cb) {
	return function (error, response, body) {
		if (error) {
			debug("Error on request: [%s], req path [%s] raw body: %o", error);
			return cb(error);
		}

		const extra = {
			pageIsLast: true,
			requestId: "",
		};

		debug("Got API response, status [%s]", response.status);

		if (
			response &&
			response.headers &&
			"string" === typeof response.headers.link
		) {
			debug(
				"Detected http-header LINK, page is not last",
				response.headers.link
			);
			extra.pageIsLast = false;
			// TODO: reconsider this property
			extra._headersLink = response.headers.link;
		}

		if (
			response &&
			response.headers &&
			"string" === typeof response.headers["x-request-id"]
		) {
			extra.requestId = response.headers["x-request-id"];
		}

		switch (response.status) {
			// SUCCESS
			// https://httpstatuses.com/200 OK
			// https://httpstatuses.com/201 Created
			case 200:
			case 201:
				return cb(null, body, extra);

			// SUCCESS for DELETE operations
			// https://httpstatuses.com/204 No Content
			case 204:
				return cb(null, null, extra);

			// https://httpstatuses.com/404 Not found
			case 404:
				debug("path:[%s] raw body: %o", response.request.path);

				// In most casses 404 means, that there is no such entity on requested
				// Freshdesk domain. For example, you are trying to update non-existent
				// contact
				// But, it also could be a result of wrong URL (?!?!?)
				//
				// In most cases the body is EMPTY, so we will just warn about wrong entity
				return cb(
					new FreshdeskError(
						"The requested entity was not found",
						body,
						response
					)
				);

			// https://httpstatuses.com/409 Conflict  - NOT UNIQUE, where unique required
			case 409:
			default:
				debug("path:[%s] raw body: %o", response.request.path);
				return cb(new FreshdeskError(body.description, body, response));
		}
	};
}

// TODO: try to make less params here
async function makeRequest(method, auth, url, qs, data, cb) {
	// eslint-disable-line max-params
	const options = {
		method: method,
		headers: {
			"Content-Type": "application/json",
			Authorization: auth,
		},
		url: url, // for debugging set to: "https://httpbin.org/get"
		params: qs,
	};

	if (data) {
		if ("attachments" in data && Array.isArray(data.attachments)) {
			var form = new FormData();

			for (let i = 0; i < Object.keys(data).length; i++) {
				const key = Object.keys(data)[i];
				if (Array.isArray(data[key])) {
					for (let i = 0; i < data[key].length; i++) {
						form.append(key + "[]", data[key][i]);
					}
				} else {
					form.append(key, data[key]);
				}
			}

			options.headers["Content-Type"] =
				typeof window === "undefined"
					? form.getHeaders()["content-type"] // node
					: "multipart/form-data"; // browser
			options.data = form;
		} else {
			options.data = JSON.stringify(data);
		}
	}

	try {
		const response = await axios(options);
		return createResponseHandler(cb)(null, response, response.data);
	} catch (error) {
		if (error.response) {
			return createResponseHandler(cb)(
				null,
				error.response,
				error.response.data
			);
		} else if (error.request) {
			return createResponseHandler(cb)(
				new Error(error.message),
				error.request,
				error.request.data
			);
		} else {
			return createResponseHandler(cb)(
				error,
				error.request,
				error.request.data
			);
		}
	}
}

/**
 * Checks if value is null or undefined.
 *
 * @private
 *
 * @param  {*}       value    The value to check.
 * @return {boolean}          Returns `true` if value is `null` or `undefined`; else `false`.
 *
 */
function isNil(value) {
	if (value === null || typeof value === "undefined") {
		return true;
	}

	return false;
}

/**
 * Checks if value is classified as a Function object.
 *
 * @private
 *
 * @param  {*}       value    The value to check.
 * @return {boolean}          Returns `true` if value is a `function`; else `false`.
 */
function isFunction(value) {
	return typeof value === "function";
}

module.exports.makeRequest = makeRequest;
module.exports.FreshdeskError = FreshdeskError;
module.exports.isNil = isNil;
module.exports.isFunction = isFunction;

// For testing
module.exports.createResponseHandler = createResponseHandler;
