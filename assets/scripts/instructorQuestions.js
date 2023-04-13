$(() => {
  const {
    data,
    courseInstances,
    plainUrlPrefix,
    urlPrefix,
    hasLegacyQuestions,
    currentCourseInstance,
  } = document.querySelector('#questionsTable').dataset;

  const columns = [
    { name: 'qid', data: 'qid', title: 'QID', render: { display: qidFormatter } },
    { name: 'title', data: 'title', title: 'Title' },
    {
      name: 'topic',
      data: 'topic',
      title: 'Topic',
      render: {
        display: (data) => `<span class="badge color-${data.color}">${_.escape(data.name)}</span>`,
        filter: (data) => data.id,
        _: (data) => data.name,
      },
      filter: 'select',
      filterOptions: (list, topic) => ({ ...list, [topic.id]: topic.name }),
      filterPlaceholder: '(All Topics)',
    },
    {
      name: 'tags',
      data: 'tags',
      title: 'Tags',
      orderable: false,
      render: {
        display: (data) =>
          (data ?? [])
            .map((tag) => `<span class="badge color-${tag.color}">${_.escape(tag.name)}</span>`)
            .join(' '),
        filter: (data) => (data ?? []).map((tag) => tag.id),
      },
      filter: 'select',
      filterOptions: (list, tags) => ({ ...list, ..._.mapValues(_.keyBy(tags, 'id'), 'name') }),
      filterPlaceholder: '(All Tags)',
    },
    {
      name: 'display_type',
      data: 'display_type',
      title: 'Version',
      visible: JSON.parse(hasLegacyQuestions),
      render: {
        display: (data) =>
          `<span class="badge color-${data === 'v3' ? 'green1' : 'red1'}">
               ${_.escape(data)}</span>`,
      },
      filter: 'select',
      filterPlaceholder: '(All Tags)',
    },
    {
      name: 'grading_method',
      data: 'grading_method',
      title: 'Grading Method',
      visible: false,
      filter: 'select',
      filterPlaceholder: '(All Methods)',
    },
    {
      name: 'external_grading_image',
      data: 'external_grading_image',
      title: 'External Grading Image',
      render: { display: (data) => data || '&mdash;' },
      visible: false,
      filter: 'select',
      filterPlaceholder: '(All Images)',
    },
  ].concat(
    JSON.parse(courseInstances).map((ci) => ({
      data: (row) =>
        (row.assessments ?? []).filter((assessment) => assessment.course_instance_id == ci.id),
      title: `<span class="text-nowrap">${_.escape(ci.short_name)} Assessments</span>`,
      visible: currentCourseInstance == ci.id,
      orderable: false,
      render: {
        display: (data) =>
          data
            .map(
              (assessment) =>
                `<a href="${plainUrlPrefix}/course_instance/${ci.id}/instructor/assessment/${
                  assessment.assessment_id
                }" class="badge color-${assessment.color} color-hover">
                  <span>${_.escape(assessment.label)}</span></a>`
            )
            .join(' '),
        filter: (data) => data.map((assessment) => assessment.assessment_id),
      },
      filter: 'select',
      filterOptions: (list, items) => ({
        ...list,
        ..._.mapValues(_.keyBy(items, 'assessment_id'), 'label'),
      }),
      filterPlaceholder: '(All Assessments)',
    }))
  );

  $('#questionsTable')
    .DataTable({
      data: JSON.parse(data),
      lengthMenu: [
        [10, 20, 50, 100, 200, 500, -1],
        [10, 20, 50, 100, 200, 500, 'All'],
      ],
      pageLength: 50,
      buttons: [{ extend: 'colvis', text: '<i class="fas fa-th-list"></i> Columns' }],
      dom:
        // row 1: page info, search, buttons
        // row 2: table, control
        // row 3: page info, page list, length selection
        "<'row m-1'<'col-sm-12 col-md-4'i><'col-sm-12 col-md-4 text-right'f><'col-sm-12 col-md-4 text-right'B>>" +
        "<'row'<'col-sm-12'tr>>" +
        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-2'l><'col-sm-12 col-md-5'p>>",
      autoWidth: false,
      columnDefs: [
        { targets: [0], className: 'sticky-column' },
        { targets: '_all', className: 'align-middle' },
        { targets: [...columns.filter((_c, i) => i > 1).keys()], className: 'text-no-wrap' },
      ],
      columns: columns,
      initComplete: function () {
        columns.forEach((column, index) => {
          if (column.filter) {
            const dtColumn = this.api().column(index);
            const input = document.createElement(column.filter);
            input.classList.add('form-control', 'js-filter-input');
            input.addEventListener('change', () => {
              dtColumn.search(input.value).draw();
            });
            input.addEventListener('click', (event) => {
              event.stopPropagation();
            });

            if (column.filter === 'select') {
              const options = dtColumn
                .data()
                .reduce(
                  column.filterOptions ||
                    ((list, value) => (value ? { ...list, [value]: value } : list)),
                  {}
                );
              const option = document.createElement('option');
              option.setAttribute('value', '');
              option.innerText = column.filterPlaceholder ?? '(All)';
              input.appendChild(option);
              Object.entries(options).forEach(([key, value]) => {
                const option = document.createElement('option');
                option.setAttribute('value', key);
                option.innerText = value;
                input.appendChild(option);
              });
            } else if (column.filter === 'input') {
              input.setAttribute('type', column.filterType ?? 'text');
            }

            dtColumn.header().appendChild(input);
          }
        });
      },
    })
    .on('draw', () => {
      $('[data-toggle="popover"]')
        .popover({
          sanitize: false,
          container: 'body',
          html: true,
          trigger: 'hover',
        })
        .on('show.bs.popover', function () {
          $($(this).data('bs.popover').getTipElement()).css('max-width', '80%');
        });
    });

  $(document).keydown((event) => {
    if ((event.ctrlKey || event.metaKey) && String.fromCharCode(event.which).toLowerCase() == 'f') {
      $('input[type="search"]:first').focus();
      event.preventDefault();
    }
  });

  function qidFormatter(qid, type, question) {
    if (type !== 'display') return qid;
    var text = '';
    if (question.sync_errors) {
      text += `<button class="btn btn-xs mr-1" data-toggle="popover" data-title="Sync Errors"
                     data-content="<pre style=&quot;background-color: black&quot;
                                        class=&quot;text-white rounded p-3&quot;>
                                        ${_.escape(question.sync_errors_ansified)}</pre>">
                    <i class="fa fa-times text-danger" aria-hidden="true"></i>
                  </button>`;
    } else if (question.sync_warnings) {
      text += `<button class="btn btn-xs mr-1" data-toggle="popover" data-title="Sync Warnings"
                     data-content="<pre style=&quot;background-color: black&quot;
                                        class=&quot;text-white rounded p-3&quot;>
                                        ${_.escape(question.sync_warnings_ansified)}</pre>">
                    <i class="fa fa-exclamation-triangle text-warning" aria-hidden="true"></i>
                  </button>`;
    }
    text += `<a class="formatter-data" href="${urlPrefix}/question/${question.id}/">
             ${_.escape(question.qid)}</a>`;
    if (question.open_issue_count > 0) {
      text += `<a class="badge badge-pill badge-danger ml-1" href="${urlPrefix}/course_admin/issues?q=is%3Aopen+qid%3A${_.escape(
        question.qid
      )}">${question.open_issue_count}</a>`;
    }
    return text;
  }
});