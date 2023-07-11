import { assert } from 'chai';
import { step } from 'mocha-steps';
import { config } from '../lib/config';
import fetch from 'node-fetch';
import helperClient = require('./helperClient');
import helperServer = require('./helperServer');
import sqldb = require('@prairielearn/postgres');
const sql = sqldb.loadSqlEquiv(__filename);
import { features } from '../lib/features/index';
import { EXAMPLE_COURSE_PATH, TEST_COURSE_PATH } from '../lib/paths';

import syncFromDisk = require('../sync/syncFromDisk');

import { makeMockLogger } from './mockLogger';
const { logger } = makeMockLogger();

const siteUrl = 'http://localhost:' + config.serverPort;
const baseUrl = siteUrl + '/pl';

const UUID_REGEXP = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/;

const testCourseId = 1;
const testCourseSharingName = 'test-course';
const exampleCourseId = 2;
const exampleCourseSharingName = 'example-course';
const sharingSetName = 'share-set-example';

function sharingPageUrl(courseId) {
  return `${baseUrl}/course/${courseId}/course_admin/sharing`;
}

async function setSharingName(courseId, name) {
  const sharingUrl = sharingPageUrl(courseId);
  const response = await helperClient.fetchCheerio(sharingUrl);

  const token = response.$('#test_csrf_token').text();
  return await fetch(sharingUrl, {
    method: 'POST',
    body: new URLSearchParams({
      __action: 'unsafe_choose_sharing_name',
      __csrf_token: token,
      course_sharing_name: name,
    }),
  });
}

async function accessSharedQuestionAssessment() {
  const assessmentsUrl = `${baseUrl}/course_instance/${exampleCourseId}/instructor/instance_admin/assessments`;
  const assessmentsPage = await helperClient.fetchCheerio(assessmentsUrl);
  const sharedQuestionAssessmentUrl =
    siteUrl +
    assessmentsPage
      .$(`a:contains("Example of Importing Questions From Another Course")`)
      .attr('href');
  const res = await helperClient.fetchCheerio(sharedQuestionAssessmentUrl);
  assert.equal(res.ok, true);
  return res;
}

describe('Question Sharing', function () {
  this.timeout(80000);

  describe('Create a sharing set and add a question to it', () => {
    let exampleCourseSharingToken;

    before('set up testing server', helperServer.before(TEST_COURSE_PATH));
    after('shut down testing server', helperServer.after);

    before('ensure course has question sharing enabled', async () => {
      await features.enable('question-sharing');
    });

    step('Fail to sync course when validating shared question paths', async () => {
      config.checkSharingOnSync = true;
      const result = await syncFromDisk.syncOrCreateDiskToSqlAsync(EXAMPLE_COURSE_PATH, logger);
      if (!result?.hadJsonErrorsOrWarnings) {
        throw new Error(
          `Sync of ${EXAMPLE_COURSE_PATH} succeeded when it should have failed due to unresolved shared question path.`,
        );
      }
    });

    step(
      'Sync course with sharing enabled, disabling validation shared question paths',
      async () => {
        config.checkSharingOnSync = false;
        const result = await syncFromDisk.syncOrCreateDiskToSqlAsync(EXAMPLE_COURSE_PATH, logger);
        if (result?.hadJsonErrorsOrWarnings) {
          throw new Error(`Errors or warnings found during sync of ${EXAMPLE_COURSE_PATH}`);
        }
      },
    );

    step(
      'Fail to access shared question, because permission has not yet been granted',
      async () => {
        // Since permissions aren't yet granted, the shared question doesn't show up on the assessment page
        const res = await accessSharedQuestionAssessment();
        assert(!res.text().includes('addNumbers'));

        // Question can be accessed through the owning course
        const questionId = (
          await sqldb.queryOneRowAsync(sql.get_question_id, {
            course_id: testCourseId,
            qid: 'addNumbers',
          })
        ).rows[0].id;
        const addNumbersUrl = `${baseUrl}/course_instance/${testCourseId}/instructor/question/${questionId}/settings`;
        const addNumbersPage = await helperClient.fetchCheerio(addNumbersUrl);
        assert(addNumbersPage.ok);

        // Question cannot be accessed through the consuming course, sharing permissions not yet set
        const addNumbersSharedUrl = `${baseUrl}/course_instance/${exampleCourseId}/instructor/question/${questionId}/settings`;
        const addNumbersSharedPage = await helperClient.fetchCheerio(addNumbersSharedUrl);
        assert(!addNumbersSharedPage.ok);
      },
    );

    step('Fail if trying to set an invalid sharing name', async () => {
      let res = await setSharingName(testCourseId, 'invalid@sharingname');
      assert(res.status === 400);

      res = await setSharingName(testCourseId, 'invalid / sharingname');
      assert(res.status === 400);
    });

    step('Set test course sharing name', async () => {
      await setSharingName(testCourseId, testCourseSharingName);
      const sharingPage = await fetch(sharingPageUrl(testCourseId));
      assert(sharingPage.ok);
      const sharingPageText = await sharingPage.text();
      assert(sharingPageText.includes(testCourseSharingName));
    });

    step('Fail if trying to set sharing name again.', async () => {
      const result = await setSharingName(testCourseId, testCourseSharingName);
      assert.equal(result.status, 200);
    });

    step('Set example course sharing name', async () => {
      await setSharingName(exampleCourseId, exampleCourseSharingName);
      const sharingPage = await fetch(sharingPageUrl(exampleCourseId));
      assert(sharingPage.ok);
      const sharingPageText = await sharingPage.text();
      assert(sharingPageText.includes(exampleCourseSharingName));
    });

    step('Generate sharing ID for example course', async () => {
      const sharingUrl = sharingPageUrl(exampleCourseId);
      let response = await helperClient.fetchCheerio(sharingUrl);
      const token = response.$('#test_csrf_token').text();
      await fetch(sharingUrl, {
        method: 'POST',
        body: new URLSearchParams({
          __action: 'sharing_token_regenerate',
          __csrf_token: token,
        }),
      });

      response = await helperClient.fetchCheerio(sharingUrl);
      const result = UUID_REGEXP.exec(response.text());
      exampleCourseSharingToken = result ? result[0] : null;
      assert(exampleCourseSharingToken != null);
    });

    step('Create a sharing set', async () => {
      const sharingUrl = sharingPageUrl(testCourseId);
      const response = await helperClient.fetchCheerio(sharingUrl);
      const token = response.$('#test_csrf_token').text();
      await fetch(sharingUrl, {
        method: 'POST',
        body: new URLSearchParams({
          __action: 'unsafe_sharing_set_create',
          __csrf_token: token,
          sharing_set_name: sharingSetName,
        }),
      });

      const sharingPage = await fetch(sharingPageUrl(exampleCourseId));
      assert(sharingPage.ok);
      const sharingPageText = await sharingPage.text();
      assert(sharingPageText.includes(exampleCourseSharingName));
    });

    step('Attempt to create another sharing set with the same name', async () => {
      const sharingUrl = sharingPageUrl(testCourseId);
      const response = await helperClient.fetchCheerio(sharingUrl);
      const token = response.$('#test_csrf_token').text();
      const result = await fetch(sharingUrl, {
        method: 'POST',
        body: new URLSearchParams({
          __action: 'unsafe_sharing_set_create',
          __csrf_token: token,
          sharing_set_name: sharingSetName,
        }),
      });
      assert.equal(result.status, 500);
    });

    step('Share sharing set with example course', async () => {
      const sharingUrl = sharingPageUrl(testCourseId);
      const response = await helperClient.fetchCheerio(sharingUrl);
      const token = response.$('#test_csrf_token').text();
      await fetch(sharingUrl, {
        method: 'POST',
        body: new URLSearchParams({
          __action: 'unsafe_course_sharing_set_add',
          __csrf_token: token,
          sharing_set_id: '1',
          course_sharing_token: exampleCourseSharingToken,
        }),
      });

      const sharingPage = await fetch(sharingPageUrl(testCourseId));
      assert(sharingPage.ok);
      const sharingPageText = await sharingPage.text();
      assert(sharingPageText.includes('XC 101'));
    });

    step('Attempt to share sharing set with invalid course token', async () => {
      const sharingUrl = sharingPageUrl(testCourseId);
      const response = await helperClient.fetchCheerio(sharingUrl);
      const token = response.$('#test_csrf_token').text();
      await fetch(sharingUrl, {
        method: 'POST',
        body: new URLSearchParams({
          __action: 'unsafe_course_sharing_set_add',
          __csrf_token: token,
          sharing_set_id: '1',
          course_sharing_token: 'invalid sharing token',
        }),
      });
    });

    step('Add question "addNumbers" to sharing set', async () => {
      const result = await sqldb.queryOneRowAsync(sql.get_question_id, {
        course_id: testCourseId,
        qid: 'addNumbers',
      });
      const questionSettingsUrl = `${baseUrl}/course_instance/${testCourseId}/instructor/question/${result.rows[0].id}/settings`;
      let response = await helperClient.fetchCheerio(questionSettingsUrl);
      assert.equal(response.ok, true);

      const token = response.$('#test_csrf_token').text();
      response = await fetch(questionSettingsUrl, {
        method: 'POST',
        body: new URLSearchParams({
          __action: 'unsafe_sharing_set_add',
          __csrf_token: token,
          sharing_set_id: '1',
        }),
      });

      const settingsPageResponse = await helperClient.fetchCheerio(questionSettingsUrl);
      assert.equal(settingsPageResponse.text().includes('share-set-example'), true);
    });

    step('Re-sync example course, validating shared questions', async () => {
      config.checkSharingOnSync = true;
      const result = await syncFromDisk.syncOrCreateDiskToSqlAsync(EXAMPLE_COURSE_PATH, logger);
      if (result === undefined || result.hadJsonErrorsOrWarnings) {
        throw new Error(`Errors or warnings found during sync of ${EXAMPLE_COURSE_PATH}`);
      }
    });

    step('Successfully access shared question', async () => {
      let res = await accessSharedQuestionAssessment();
      const sharedQuestionUrl = siteUrl + res.$(`a:contains("Add two numbers")`).attr('href');

      res = await helperClient.fetchCheerio(sharedQuestionUrl);
      assert(res.ok);
    });
  });
});