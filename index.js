'use strict';

var _ = require('lodash');
var querystring = require('querystring');
var path = require('path');
var cp = require('child_process');
var stubs = [];
var winston = require('winston');
var portfinder = require('portfinder');

function formatPath(prefix, resource, action) {
	var requestPath = '/' + (prefix ? prefix + '/' : '') + resource;

	if (action !== '') {
		requestPath += '/' + action;
	}

	return requestPath;
}

function getApiUrl(ctx) {
	var apiInstance = new ctx.apiInstance();

	if (ctx.params) {
		return formatPath(apiInstance.prefix, apiInstance.resourceName,
			apiInstance[ctx.apiMethod].action) + '?' +
			querystring.stringify(ctx.params);
	}

	return formatPath(apiInstance.prefix, apiInstance.resourceName,
			apiInstance[ctx.apiMethod].action);
}

function createMessage(ctx, ruleType, ruleDetails) {
	if (!ruleDetails) { throw new Error('Missing ruleDetails'); }

	var url = getApiUrl(ctx);
	var message = { rules: { urls: {} } };
	var rule = {};
	if (ctx.formData) { rule.formData = ctx.formData; }
	_.forEach(ctx.urlSlugs, function (value, placeholder) {
		url = url.replace(':' + placeholder, value);
	});
	rule[ruleType] = ruleDetails;
	message.rules.urls[url] = rule;

	return message;
}

function aCallTo(apiInstance, apiMethod) {
	var ctx = {
		apiInstance: apiInstance,
		apiMethod: apiMethod
	};

	return {

		// Helper to build up the url querystring
		withTheFollowingParameters: function withTheFollowingParameters(p) {
			ctx.params = p;
			return this;
		},
		// Helper to build up the url form data
		withFormData: function withFormData(data) {
			ctx.formData = data;
			return this;
		},
		// Helper to build up the url slugs
		withSlugs: function withSlugs(slugs) {
			ctx.urlSlugs = slugs;
			return this;
		},
		// Terminator which returns the message to send to the stub
		respondsWithFile: function respondsWithFile(path) {
			return createMessage(ctx, 'serveFile', path);
		},
		respondsWithErrorCode: function respondsWithErrorCode(statusCode) {
			return createMessage(ctx, 'returnError', statusCode);
		},
		rewritesTo: function rewritesTo(destination) {
			return createMessage(ctx, 'rewriteTo', destination);
		}
	};
}

function killStub(apiStub) {
	if (apiStub && apiStub.connected === true) {
		return apiStub.kill('SIGKILL');
	}
}

function killAllStubsAndDie() {
	stubs.map(killStub);
	process.exit(0);
}

process.once('SIGINT', killAllStubsAndDie);
process.once('SIGTERM', killAllStubsAndDie);

function stub() {
	var messages = [].slice.call(arguments);
	/* jshint validthis: true */
	var api = this.client;

	return {
		run: function (cb) {
			process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
			var options = { env: { PORT: api.schema.port }, silent: true };
			var apiStub = cp.fork(path.join(__dirname, 'lib', 'server.js'),
				[], options);
			var acknowledgements = 0;
			stubs.push(apiStub);

			function killIfConnected() {
				killStub(apiStub);
			}

			apiStub.stderr.pipe(process.stderr);

			if (messages.length === 0) {
				return apiStub.on('message', function (message) {
					if (message.ready === true) {
						return cb(killIfConnected);
					}
				});
			}

			messages.forEach(function (message) {
				apiStub.send(message);
			}, apiStub);

			apiStub.on('message', function (message) {
				if (message.rules) {
					++acknowledgements;
					if (acknowledgements === messages.length) {
						cb(killIfConnected);
					}
				}
			});
		}
	};
}

function createClient(cb) {
	var schema = _.clone(
		require('7digital-api/assets/7digital-api-schema.json'));
	var logger = new winston.Logger({
		transports: [
			new winston.transports.Console({ level: 'error' })
		]
	});

	portfinder.getPort(function (err, port) {
		if (err) { return cb(err); }

		schema.host = schema.sslHost = 'localhost';
		schema.port = port;
		schema.prefix = undefined;

		//Actually use the values we specified...
		delete process.env._7D_API_CLIENT_PORT;
		delete process.env._7D_API_CLIENT_HOST;
		delete process.env._7D_API_CLIENT_SSL_HOST;

		var api = require('7digital-api').configure({
			logger: logger
		}, schema);

		api.IS_STUB_CLIENT = true;

		return cb(null, api);
	});
}

function checkIsStubClient(client) {
	if (!client.IS_STUB_CLIENT) {
		throw new Error('Expected stub client, created with createClient');
	}
}

function withClient(client) {
	checkIsStubClient(client);

	return {
		stub: stub.bind({ client: client })
	};
}

module.exports.withClient = withClient;
module.exports.aCallTo = aCallTo;
module.exports.createClient = createClient;
