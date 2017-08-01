-- BLOCK select_variant_for_question_instance
SELECT
    v.*
FROM
    variants AS v
WHERE
    v.id = $variant_id
    AND v.instance_question_id = $instance_question_id;

-- BLOCK select_errors
SELECT
    e.*,
    format_date_full(e.date, ci.display_timezone) AS formatted_date
FROM
    errors AS e
    JOIN course_instances AS ci ON (ci.id = e.course_instance_id)
WHERE
    e.variant_id = $variant_id
    AND e.course_caused
ORDER BY
    e.date;

-- BLOCK select_submissions
SELECT
    s.*,
    gj.id AS grading_job_id,
    grading_job_status(gj.id) AS grading_job_status,
    format_date_full_compact(s.date, ci.display_timezone) AS formatted_date,
    CASE
        WHEN s.grading_requested_at IS NOT NULL THEN format_interval($req_date - s.grading_requested_at)
        ELSE NULL
    END AS elapsed_grading_time
FROM
    submissions AS s
    JOIN variants AS v ON (v.id = s.variant_id)
    JOIN instance_questions AS iq ON (iq.id = v.instance_question_id)
    JOIN assessment_instances AS ai ON (ai.id = iq.assessment_instance_id)
    JOIN assessments AS a ON (a.id = ai.assessment_id)
    JOIN course_instances AS ci ON (ci.id = a.course_instance_id)
    JOIN grading_jobs AS gj ON (gj.submission_id = s.id)
WHERE
    v.id = $variant_id
ORDER BY
    s.date DESC;
