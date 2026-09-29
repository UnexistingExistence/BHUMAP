import re
with open('backend/backend/api_server.py', 'r', encoding='utf-8') as f:
    content = f.read()

bad_block = """from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
"""
content = content.replace(bad_block, '')

start_idx = content.find('app = FastAPI(')
if start_idx != -1:
    end_idx = content.find(')', start_idx) + 1
    
    insert_block = """
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
"""
    new_content = content[:end_idx] + insert_block + content[end_idx:]
    with open('backend/backend/api_server.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('CORS added correctly')
