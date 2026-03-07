import urllib.request
req = urllib.request.Request('http://localhost:8000/leads/', method='GET')
try:
    resp = urllib.request.urlopen(req)
    print("GET /leads/ without token:", resp.getcode())
except Exception as e:
    print(e)
