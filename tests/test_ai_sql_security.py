import pytest

from tools.query_validator import (
    validate_query,
    QueryValidationError,
)


@pytest.mark.parametrize(
    "sql",
    [
        "DROP TABLE customers",
        "DELETE FROM customers",
        "UPDATE customers SET name = 'x'",
        "INSERT INTO customers VALUES (1)",
        "ALTER TABLE customers ADD COLUMN x TEXT",
        "TRUNCATE TABLE customers",
        "CREATE TABLE hacked(id INT)",
        "GRANT SELECT ON customers TO public",
        "REVOKE SELECT ON customers FROM public",
    ],
)
def test_validator_rejects_destructive_sql(sql):
    with pytest.raises(QueryValidationError):
        validate_query(sql)


def test_validator_rejects_multiple_statements():
    with pytest.raises(QueryValidationError):
        validate_query(
            "SELECT * FROM customers; DROP TABLE customers;"
        )


def test_validator_allows_normal_select():
    validate_query(
        "SELECT COUNT(*) FROM customers"
    )


def test_validator_allows_normal_cte():
    validate_query(
        """
        WITH totals AS (
            SELECT COUNT(*) AS total
            FROM customers
        )
        SELECT total FROM totals
        """
    )
@pytest.mark.parametrize(
    "sql",
    [
        "SELECT pg_sleep(10)",
        "SELECT pg_sleep_for('10 seconds')",
        "SELECT pg_sleep_until(now())",
        "SELECT pg_cancel_backend(123)",
        "SELECT pg_terminate_backend(123)",
        "SELECT pg_reload_conf()",
        "SELECT pg_rotate_logfile()",
        "SELECT pg_read_file('/tmp/test')",
        "SELECT pg_read_binary_file('/tmp/test')",
        "SELECT pg_ls_dir('/tmp')",
        "SELECT lo_import('/tmp/test')",
        "SELECT lo_export(123, '/tmp/test')",
        "SELECT nextval('some_sequence')",
        "SELECT setval('some_sequence', 100)",
        "SELECT pg_advisory_lock(123)",
        "SELECT pg_advisory_xact_lock(123)",
    ],
)
def test_validator_rejects_dangerous_select_functions(sql):
    with pytest.raises(QueryValidationError) as exc:
        validate_query(sql)

    assert exc.value.code == "FORBIDDEN_OPERATION"


def test_validator_rejects_select_into():
    with pytest.raises(QueryValidationError) as exc:
        validate_query(
            "SELECT * INTO copied_customers FROM customers"
        )

    assert exc.value.code == "FORBIDDEN_OPERATION"


def test_validator_still_allows_normal_analytical_functions():
    validate_query(
        """
        SELECT
            COUNT(*) AS total_customers,
            AVG(credit_score) AS average_credit_score,
            MAX(credit_score) AS maximum_credit_score,
            COALESCE(SUM(loan_amount), 0) AS total_loan_amount
        FROM customers
        """
    )