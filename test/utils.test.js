"use strict";

const { expect } = require("chai");
const utils = require("../lib/utils");

describe("utils.test", function () {
	describe("isNil", () => {
		const testCases = [
			[null, true],
			[undefined, true],
			[1, false],
			[true, false],
			[false, false],
			[0, false],
			["", false],
			["    ", false],
			[() => false, false],
		];

		testCases.forEach((tc) => {
			it(`should recognize [${tc[0]}]`, () => {
				const exp = tc[1];
				const act = utils.isNil(tc[0]);

				expect(act).equal(exp);
			});
		});
	});

	describe("isFunction", () => {
		const testCases = [
			[null, false],
			[undefined, false],
			[1, false],
			[true, false],
			[false, false],
			[0, false],
			["", false],
			["    ", false],
			[() => false, true],
			[utils.isFunction, true],
			[Math.round, true],
		];

		testCases.forEach((tc) => {
			it(`should recognize [${tc[0]}]`, () => {
				const exp = tc[1];
				const act = utils.isFunction(tc[0]);

				expect(act).equal(exp);
			});
		});
	});

	describe("createResponseHandler", () => {
		it(`should handle error`, () => {
			const error = new Error("test error");

			expect(() => utils.handleResponse(error, {}, {})).to.throw(error)
		});

		it(`should handle 404 response`, () => {
			const body = { foo: "bar" };
			try {
				utils.handleResponse(
					null,
					{
						statusCode: 404,
						request: {},
						response: {},
						headers: {},
						data: body,
					},
					body,
					{
						method: 'GET'
					}
				);
				throw new Error('Should fail earlier')
			} catch (err) {
				expect(err).to.be.instanceof(utils.FreshdeskError);
				expect(err.message).equal("The requested entity was not found");
				expect(err.data).equal(body);
			}
		});
	});
});
