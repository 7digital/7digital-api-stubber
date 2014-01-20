'use strict';
var path = require('path');
var assert = require('chai').assert;
var fakeResponsePath = path.join(__dirname, 'fake-response.xml');
var stub = require('../').stub;
var aCallTo = require('../').aCallTo;
var schema = require('7digital-api/assets/7digital-api-schema.json');
schema.host = 'localhost';
schema.port = 3000;
schema.version = '';
var api = require('7digital-api').configure({
	schema: schema
});
var basket = new api.Basket();
var release = new api.Releases();

describe('stubber', function () {
	var killer = function () {};

	function isFake(err, faked) {
		assert(!err, 'expected no error');
		assert(faked, 'expected a response');
		assert.equal(faked.resource.foo, 'Some fake data',
			'expected the response to match the fake response');
	}

	afterEach(killer);

	describe('aCallTo - with no parameters', function  () {
		it('generates a responds with file rule', function () {
			var message = aCallTo(basket, 'create')
							.respondsWithFile(fakeResponsePath);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/basket/create': {
							serveFile: fakeResponsePath
						}
					}
				}
			});
		});

		it('generates a responds with error rule', function () {
			var message = aCallTo(basket, 'create')
							.respondsWithErrorCode(90210);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/basket/create': {
							returnError: 90210
						}
					}
				}
			});
		});

		it('generates a rewrite rule', function () {
			var message = aCallTo(basket, 'create')
							.rewritesTo('http://rewrittenurl.com/');

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/basket/create': {
							rewriteTo: 'http://rewrittenurl.com/'
						}
					}
				}
			});
		});
	});

	describe('aCallTo - with parameters', function  () {
		it('generates a responds with file rule', function () {
			var message = aCallTo(release, 'getDetails')
							.withTheFollowingParameters({ releaseId: 12345 })
							.respondsWithFile(fakeResponsePath);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/release/details?releaseId=12345': {
							serveFile: fakeResponsePath
						}
					}
				}
			});
		});

		it('generates a responds with error rule', function () {
			var message = aCallTo(release, 'getDetails')
							.withTheFollowingParameters({ releaseId: 12345 })
							.respondsWithErrorCode(90210);

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/release/details?releaseId=12345': {
							returnError: 90210
						}
					}
				}
			});
		});

		it('generates a rewrite rule', function () {
			var message = aCallTo(release, 'getDetails')
							.withTheFollowingParameters({ releaseId: 12345 })
							.rewritesTo('http://rewrittenurl.com/');

			assert.deepEqual(message, {
				rules: {
					urls: {
						'/release/details?releaseId=12345': {
							rewriteTo: 'http://rewrittenurl.com/'
						}
					}
				}
			});
		});
	});

	it('stubs endpoints', function (done) {
		stub(aCallTo(basket, 'create')
				.respondsWithFile(fakeResponsePath)
		).run(function (kill) {
			killer = kill;
			basket.create({}, function (err, faked) {
				isFake(err, faked);
				kill();
				done();
			});
		});
	});

	it('stubs error responses', function (done) {
		stub(aCallTo(basket, 'create')
			.respondsWithErrorCode(90210)
		).run(function (kill) {
			killer = kill;
			basket.create({}, function (fakeErr) {
				assert(fakeErr, 'expected an error');
				assert.equal(fakeErr.code, 90210,
					'expected error code to match stubbed value');
				kill();
				done();
			});
		});
	});

	describe('stub', function () {
		it('stubs endpoints', function (done) {
			stub(aCallTo(basket, 'get')
					.withTheFollowingParameters({ basketId: 'blah' })
					.respondsWithFile(fakeResponsePath),
				aCallTo(release, 'getDetails')
					.withTheFollowingParameters({ releaseId: 12345})
					.respondsWithErrorCode(90210)
			).run(function (kill) {
				killer = kill;
				basket.get({ basketId: 'blah' }, function (err, faked) {
					isFake(err, faked);

					release.getDetails({ releaseId: 12345 }, function (err, faked) {
						assert(err, 'expected an error');
						assert.equal(err.code, 90210,
							'expected error code to match stubbed value');
						kill();
						done();
					});
				});
			});
		});
	});
});
