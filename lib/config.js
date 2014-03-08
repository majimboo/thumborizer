var _ = require('lodash');

var config;

var initialize = _.once(function (configFilePath, overrides) {
  return config = _.merge({}, require(configFilePath), overrides);
});

var get = function (key) {
  if (!config) initialize('../config.json');
  return config[key];
};

module.exports = {
  initialize: initialize,
  get: get
}