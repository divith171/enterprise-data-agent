import psycopg2

def get_connection():
    return psycopg2.connect(
        host="localhost",
        port=5432,
        database="eda_db",
        user="eda_user",
        password="eda_pass"
    )
    
