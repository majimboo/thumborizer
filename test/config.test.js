var assert = require('assert'),
    config = require('../lib/config');

module.exports = {
    'get()': function() {
        assert.equal(8888, config.get('port'));
    }
};