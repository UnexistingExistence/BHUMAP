import requests
import json

s = requests.Session()
r = s.post('http://localhost:8000/api/token-auth/', data={'username':'admin', 'password':'admin'})
print("Auth response code:", r.status_code)

if r.status_code == 200:
    token = r.json().get('token')
    s.headers.update({'Authorization': f'JWT {token}'})
    projs = s.get('http://localhost:8000/api/projects/').json()
    results = projs.get('results', projs) if isinstance(projs, dict) else projs
    print(f"Total projects found: {len(results)}")
    for p in results:
        p_id = p['id']
        p_name = p.get('name')
        print(f"\n[Project {p_id}] '{p_name}'")
        tasks_resp = s.get(f'http://localhost:8000/api/projects/{p_id}/tasks/').json()
        tasks = tasks_resp.get('results', tasks_resp) if isinstance(tasks_resp, dict) else tasks_resp
        print(f"  Tasks ({len(tasks)}):")
        for t in tasks:
            t_id = t['id']
            status = t.get('status')
            status_text = t.get('status_text')
            name = t.get('name')
            images_count = t.get('images_count')
            processing_time = t.get('processing_time')
            print(f"    - Task {t_id}: name='{name}', status={status} ({status_text}), images={images_count}, time={processing_time}ms")
else:
    print("Auth failed:", r.text)
