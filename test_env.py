import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

value = os.getenv("OPENAI_API_KEY")

print("Raw value:", value)