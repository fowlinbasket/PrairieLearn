// @ts-check
const express = require('express');
const asyncHandler = require('express-async-handler');
const { isBinaryFile } = require('isbinaryfile');
const mime = require('mime');

const sqldb = require('../../prairielib/lib/sql-db');
const sqlLoader = require('../../prairielib/lib/sql-loader');

const sql = sqlLoader.loadSqlEquiv(__filename);
const router = express.Router({ mergeParams: true });

const MEDIA_PREFIXES = ['image/', 'audio/', 'video/'];

/**
 * Guesses the mime type for a file based on its name and contents.
 *
 * @param {string} name The file's name
 * @param {Buffer} buffer The file's contents
 * @returns {Promise<string>} The guessed mime type
 */
async function guessMimeType(name, buffer) {
  const mimeType = mime.getType(name);
  const isBinary = await isBinaryFile(buffer);

  if (!isBinary) {
    return 'text/plain';
  }

  if (mimeType && MEDIA_PREFIXES.some((p) => mimeType.startsWith(p))) {
    return mimeType;
  }

  return 'application/octet-stream';
}

router.get(
  '/*',
  asyncHandler(async (req, res) => {
    const submissionId = req.params.submission_id;
    const fileName = req.params[0];

    const fileRes = await sqldb.queryZeroOrOneRowAsync(sql.select_submission_file, {
      question_id: res.locals.question.id,
      instance_question_id: res.locals.instance_question?.id ?? null,
      submission_id: submissionId,
      file_name: fileName,
    });

    if (fileRes.rowCount === 0) {
      res.sendStatus(404);
      return;
    }

    const contents = fileRes.rows[0].contents;
    if (!contents) {
      res.sendStatus(404);
      return;
    }

    const buffer = Buffer.from(contents, 'base64');

    // res.sendStatus(404);
    // return;

    // Artificial delay for testing.
    // await new Promise((resolve) => setTimeout(resolve, 5000));

    // To avoid having to do expensive content checks on the client, we'll do
    // our best to guess a mime type for the file.
    const mimeType = await guessMimeType(fileName, buffer);
    res.setHeader('Content-Type', mimeType);

    res.status(200).send(buffer);
  })
);

module.exports = router;
