import logging
import sys

import asyncpg
import uvloop
uvloop.install()
# import jinja2
# import aiohttp_jinja2
from aiohttp import web

from citation_galaxy.database.tsvector import decode_tsvector, encode_tsvector
# from citation_galaxy.db import close_pg, init_pg
from citation_galaxy.middlewares import setup_middlewares
from citation_galaxy.routes import setup_routes
from citation_galaxy.session import setup_session
from citation_galaxy.settings import get_config







async def init_connection(conn):
    await conn.set_type_codec( 'tsvector', schema='pg_catalog', encoder=encode_tsvector, decoder=decode_tsvector, format='binary')


async def init_app(argv=None):
    app = web.Application()

    app["config"] = get_config(argv)

    print(app["config"]["postgres"])

    app["db"] = await asyncpg.create_pool(**app["config"]["postgres"],init=init_connection)
    # create db connection on startup, shutdown on exit
    # app.on_startup.append(init_pg)
    # app.on_cleanup.append(close_pg)

    # setup Jinja2 template renderer
    # aiohttp_jinja2.setup(app, loader=jinja2.PackageLoader("citation_galaxy", "templates"))

    setup_session(app)

    # setup views and routes
    setup_routes(app)

    # setup_middlewares(app)

    return app



def main(argv):
    logging.basicConfig(level=logging.DEBUG)
    app = init_app(argv)

    config = get_config(argv)
    # web.run_app(app, host=config["host"], port=config["port"])
    web.run_app(app, host=config["host"], port=config["port"],
        access_log_format='%t %s "%r"')


async def main_app_factory():
    print("App factory: ",sys.argv[1:])
    app = await init_app(sys.argv[1:])

    return app

if __name__ == "__main__":
    main(sys.argv[1:])
