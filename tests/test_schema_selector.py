from services.schema_selector import select_relevant_tables


def test_select_relevant_tables_prefers_explicit_table_match():
    schema = {
        "customers": ["customer_id", "name", "region"],
        "orders": ["order_id", "customer_id", "amount"],
        "products": ["product_id", "name", "price"],
    }

    result = select_relevant_tables(
        "show me customers",
        schema,
    )

    assert result == {
        "customers": ["customer_id", "name", "region"],
    }


def test_select_relevant_tables_uses_column_matches():
    schema = {
        "customers": ["customer_id", "name", "region"],
        "orders": ["order_id", "customer_id", "amount"],
        "products": ["product_id", "name", "price"],
    }

    result = select_relevant_tables(
        "show amount",
        schema,
    )

    assert result == {
        "orders": ["order_id", "customer_id", "amount"],
    }


def test_select_relevant_tables_prefers_highest_scoring_table():
    schema = {
        "customers": ["customer_id", "name", "region"],
        "orders": ["order_id", "customer_id", "amount"],
        "sales": ["sale_id", "region", "amount", "sale_date"],
    }

    result = select_relevant_tables(
        "show sales amount by region",
        schema,
    )

    assert result == {
        "sales": ["sale_id", "region", "amount", "sale_date"],
    }


def test_select_relevant_tables_returns_all_tied_highest_matches():
    schema = {
        "sales": ["sale_id", "region", "amount"],
        "orders": ["order_id", "region", "amount"],
        "customers": ["customer_id", "name"],
    }

    result = select_relevant_tables(
        "show amount by region",
        schema,
    )

    assert result == {
        "sales": ["sale_id", "region", "amount"],
        "orders": ["order_id", "region", "amount"],
    }


def test_select_relevant_tables_falls_back_to_full_schema():
    schema = {
        "customers": ["customer_id", "name"],
        "orders": ["order_id", "amount"],
    }

    result = select_relevant_tables(
        "show something completely unrelated",
        schema,
    )

    assert result == schema


def test_select_relevant_tables_is_case_insensitive():
    schema = {
        "Customers": ["Customer_ID", "Name", "Region"],
        "Orders": ["Order_ID", "Amount"],
    }

    result = select_relevant_tables(
        "show CUSTOMERS",
        schema,
    )

    assert result == {
        "Customers": ["Customer_ID", "Name", "Region"],
    }