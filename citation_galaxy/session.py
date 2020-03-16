import pathlib
import pickle

import base64

from aiohttp import web
from cryptography import fernet
from aiohttp_session import setup, get_session
# from aiohttp_session.cookie_storage import EncryptedCookieStorage
from aiohttp_session import SimpleCookieStorage

from citation_galaxy.settings import CONF_DIR
SESS_KEY_PATH = CONF_DIR / 'session.key'

def setup_session(app):

    if SESS_KEY_PATH.exists():
        with SESS_KEY_PATH.open('rb') as fp:
            fernet_key = pickle.load(fp)
    else:
        fernet_key = fernet.Fernet.generate_key()

        with SESS_KEY_PATH.open('wb') as fp:
            pickle.dump(fernet_key, fp)
    
    secret_key = base64.urlsafe_b64decode(fernet_key)
    # setup(app, EncryptedCookieStorage(secret_key))
    setup(app, SimpleCookieStorage())
    # app.router.add_get('/', handler)
