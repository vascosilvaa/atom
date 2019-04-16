// Windows crash dumps contain environment variables which could leak
// sensitive information, so we upload them to S3 with a "private" ACL.

'use strict'

if (process.platform !== 'win32') {
  console.error('This script is only intended to be run on Windows')
}

const path = require('path')
const glob = require('glob')
const uploadToS3 = require('./lib/upload-to-s3')

const yargs = require('yargs')
const argv = yargs
  .usage('Usage: $0 [options]')
  .help('help')
  .describe('s3-path', 'Indicates the S3 path in which the crash reports should be uploaded')
  .wrap(yargs.terminalWidth())
  .argv

async function uploadCrashReports () {
  const CONFIG = require('../config')
  const crashesPath = path.join(process.env.TEMP, 'Atom Crashes')
  const crashes = glob.sync('/**/*.dmp', { root: crashesPath, nodir: true })
  const releaseVersion = CONFIG.computedAppVersion
  const bucketPath = argv.s3Path || `releases/v${releaseVersion}/`

  if (crashes && crashes.length > 0) {
    console.log(`Uploading ${crashes.length} private crash reports ${releaseVersion} to S3 under '${bucketPath}'`)

    await uploadToS3(
      process.env.ATOM_RELEASES_S3_KEY,
      process.env.ATOM_RELEASES_S3_SECRET,
      process.env.ATOM_RELEASES_S3_BUCKET,
      bucketPath,
      crashes,
      'private'
    )
  }
}

// Wrap the call the async function and catch errors from its promise because
// Node.js doesn't yet allow use of await at the script scope
uploadCrashReports().catch(err => {
  console.error('An error occurred while uploading crash reports:\n\n', err)
  process.exit(1)
})
