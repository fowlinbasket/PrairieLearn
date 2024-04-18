import { html } from '@prairielearn/html';
import { renderEjs } from '@prairielearn/html-ejs';
import { Lti13CourseInstance, Lti13Instance } from '../../../lib/db-types';

export function InstructorInstanceAdminLti13({
  resLocals,
  lti13Instance,
  lti13CourseInstance,
  lti13CourseInstances,
}: {
  resLocals: Record<string, any>;
  lti13Instance: Lti13Instance;
  lti13CourseInstance: Lti13CourseInstance;
  lti13CourseInstances: Lti13CourseInstance[];
}): string {
  return html`
    <!doctype html>
    <html lang="en">
      <head>
        ${renderEjs(__filename, "<%- include('../../../pages/partials/head')%>", {
          ...resLocals,
        })}
      </head>
      <body>
        <script>
          $(() => {
            $('#selectLti13Instance').on('change', () => {
              let li = $('#selectLti13Instance option:selected');
              window.location.href =
                '/pl/course_instance/${resLocals.course_instance
                  .id}/instructor/instance_admin/lti13_instance/' + li.val();
            });
          });
        </script>
        ${renderEjs(__filename, "<%- include('../../../pages/partials/navbar'); %>", {
          ...resLocals,
          navSubPage: 'lti13',
        })}
        <main class="container-fluid mb-4">
          <div class="card mb-4">
            <div class="card-header bg-primary text-white d-flex">LTI 1.3 configuration</div>
            <div class="card-body">
              <div class="row">
                <div class="col-3">
                  <select class="custom-select mb-2" id="selectLti13Instance">
                    ${lti13CourseInstances.map((lci) => {
                      return html`
                        <option
                          value="${lci.id}"
                          ${lti13CourseInstance.id === lci.id ? 'selected' : ''}
                        >
                          ${lti13Instance.name} (${lci.id})
                        </option>
                      `;
                    })}
                  </select>
                  Quick links:
                  <ul>
                    <li><a href="#connection">Connection to LMS</a></li>
                  </ul>
                </div>
                <div class="col-9">
                  Created at: ${lti13CourseInstance.created_at.toDateString()}
                  <br />
                  <h3 id="connection">Connection to LMS</h3>
                  <form method="POST">
                    <input type="hidden" name="__action" value="delete_lti13_course_instance" />
                    <input type="hidden" name="__csrf_token" value="${resLocals.__csrf_token}" />
                    <button
                      class="btn btn-danger btn-sm"
                      onclick="return confirm('Are you sure you want to remove this connection?');"
                    >
                      Remove LTI 1.3 connection with ${lti13Instance.name}:
                      ${lti13CourseInstance.context_label}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </main>
      </body>
    </html>
  `.toString();
}
