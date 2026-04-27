"""
Database configuration and connection
"""
from pymongo import AsyncMongoClient
from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'sussu_chocolates_db')

client = AsyncMongoClient(MONGO_URL, tls=True, tlsAllowInvalidCertificates=False)
db = client[DB_NAME]
