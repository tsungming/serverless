'use strict';


const BbPromise = require('bluebird');
const _         = require('lodash');
const chalk     = require('chalk');

const SCli      = require('./utils/cli');
const context      = require('./utils/context');

module.exports = function(S) {

  return class RuntimeNode43 extends S.classes.RuntimeNode {

    static getName() {
      return 'nodejs4.3';
    }

    /**
     * Run
     * - Run this function locally
     */

    run(func, stage, region, event) {

      return this.getEnvVars(func, stage, region)
          // Add ENV vars (from no stage/region) to environment
          .then(envVars => _.merge(process.env, envVars))
          .then(() => {
            const handlerArr  = func.handler.split('/').pop().split('.'),
              functionFile    = func.getRootPath(handlerArr[0] + '.js'),
              functionHandler = handlerArr[1];

            // Load function handler. This has to be done after env vars are set
            // to ensure that they are accessible in the global context.
            const functionCall = require(functionFile)[functionHandler];

            return new BbPromise((resolve) => {
              // Call Function
              const callback = (err, result) => {
                SCli.log(`-----------------`);

                // Show error
                if (err) {
                  SCli.log(chalk.bold('Failed - This Error Was Returned:'));
                  SCli.log(err.message);
                  SCli.log(err.stack);

                  return resolve({
                    status: 'error',
                    response: err.message,
                    error: err
                  });
                }

                // Show success response
                SCli.log(chalk.bold('Success! - This Response Was Returned:'));
                SCli.log(JSON.stringify(result, null, 4));
                return resolve({
                  status: 'success',
                  response: result
                });
              }
              
              try {
                  var AWS = require('aws-sdk');
                  if (!AWS.config.region) {
                    AWS.config.update({ region: region });
                  }
              } catch(e) {
              }

              functionCall(event, context(func, callback), callback);
            })
          })
          .catch((err) => {
            SCli.log(`-----------------`);

            SCli.log(chalk.bold('Failed - This Error Was Thrown:'));
            SCli.log(err.stack || err);

            return {
              status: 'error',
              response: err.message,
              error: err
            };
          });
    }

  }

};
