# routes.py
import pathlib

from .views import index, poll, results, vote
from .views import query, years


import citation_galaxy.views as views


PROJECT_ROOT = pathlib.Path(__file__).parent


def setup_routes(app):
    app.router.add_routes( views.routes )
    
    # app.router.add_get('/query', query)
    app.router.add_post('/query', query)
    # app.router.add_post('/gateway/papers', papers)


    app.router.add_get('/years', years)

    app.router.add_get('/', index)

    


    app.router.add_get('/poll/{question_id}', poll, name='poll')
    app.router.add_get('/poll/{question_id}/results',
                       results, name='results')
    app.router.add_post('/poll/{question_id}/vote', vote, name='vote')
    setup_static_routes(app)


def setup_static_routes(app):
    app.router.add_static('/',
                          path=PROJECT_ROOT / 'public',
                          name='static')
    # app.router.add_static('/public/',
    #                       path=PROJECT_ROOT / 'public',
    #                       name='public')
