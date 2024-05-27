import firebase_admin
from firebase_admin import credentials, auth
from server_config import ignore_auth

cred = credentials.Certificate('auth/serviceAccountKey.json')
firebase_admin.initialize_app(cred)

async def verify_id_token(token):
    if ignore_auth and (token is None or token == ""): return "testUserId"

    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        email = decoded_token['email']
        name = decoded_token['name']
        return uid
    except Exception as e:
        print(e)
        return None
